import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Cookies from "js-cookie";
import { message as m, Slider, Button, Progress, Card } from "antd";
import Navbar from "../../components/play/navbar";
import PlayerList from "../../components/play/playerList";
import WordSelectModal from "../../components/play/modals/wordSelectModal";
import RoundResultModal from "../../components/play/modals/roundResultModal";
import GameEndModal from "../../components/play/modals/gameEndModal";
import ChatSection from "../../components/play/chatSection";
import {
  LuEraser,
  LuPalette,
  LuClock,
  LuTrash2,
  LuPencil,
  LuMenu,
  LuX,
} from "react-icons/lu";
import { backend_url } from "../../utils/backend_url";

interface DrawData {
  x: number;
  y: number;
  lastX: number | null;
  lastY: number | null;
  roomId: string;
  color: string;
  stroke: number;
}

interface ChatMessage {
  message: string;
  roomId: string;
  username: string;
}

interface GameState {
  state: "waiting" | "playing" | "ended";
  round: number;
  totalRounds: number;
  players: any[];
  scores: { [key: string]: number };
  currentDrawer: string | null;
  timeLeft: number;
}

interface Player {
  userId: string;
  username: string;
  score: number;
  isReady: boolean;
  isConnected: boolean;
}

const Page = () => {
  const token = Cookies.get("token");
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const chatRef = useRef<HTMLDivElement | null>(null);

  // State management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentColor, setCurrentColor] = useState<string>("black");
  const [currentStroke, setCurrentStroke] = useState<number>(4);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(
    Cookies.get("username") || ""
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [canStart, setCanStart] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [wordHint, setWordHint] = useState<string>("");
  const [isCurrentDrawer, setIsCurrentDrawer] = useState(false);
  const [roundResults, setRoundResults] = useState<any>(null);
  const [gameResults, setGameResults] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);

  // New state variables for game flow
  const [preparationCountdown, setPreparationCountdown] = useState<number>(0);
  const [showPreparation, setShowPreparation] = useState<boolean>(false);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [totalTurnsInRound, setTotalTurnsInRound] = useState<number>(0);

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    state: "waiting",
    round: 0,
    totalRounds: 3,
    players: [],
    scores: {},
    currentDrawer: null,
    timeLeft: 0,
  });

  // Modal state management
  const [activeModal, setActiveModal] = useState<
    "none" | "wordSelect" | "roundResult" | "gameEnd"
  >("none");

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCoords = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  // Socket initialization
  const socket = useMemo(() => {
    if (!token) return null;
    return io(`${backend_url}`, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }, [token]);

  // Modal helpers
  const openModal = (modal: "wordSelect" | "roundResult" | "gameEnd") => {
    setActiveModal(modal);
  };

  const closeAllModals = () => {
    setActiveModal("none");
  };

  // Format time utility
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  // Ready toggle
  const toggleReady = () => {
    if (socket) {
      socket.emit("playerReady");
    }
  };

  // Word selection
  const selectWord = (word: string) => {
    if (socket) {
      socket.emit("selectWord", word);
      closeAllModals();
    }
  };

  // Auth check
  useEffect(() => {
    if (!token) {
      m.error("You must be logged in to access this page");
      navigate("/");
    }
  }, [token, navigate]);

  // Socket connection and room joining
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleConnect = () => {
      const username = Cookies.get("username") || "";
      setUsername(username);
      socket.emit("joinRoom", roomId, username);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);

    socket.on("disconnect", () => {
      m.warning("Disconnected from server. Trying to reconnect...");
    });

    socket.io.on("reconnect", () => {
      m.info("Reconnected to server!");
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect");
      socket.io.off("reconnect");
    };
  }, [socket, roomId]);

  // Canvas initialization and drawing events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !socket) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Set canvas size
      canvas.width = containerWidth;
      canvas.height = containerHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = currentStroke;
      ctx.strokeStyle = currentColor;
      ctxRef.current = ctx;

      // Restore canvas history after resize
      const history = JSON.parse(
        sessionStorage.getItem(`canvas-${roomId}`) || "[]"
      );
      history.forEach((data: DrawData) => {
        handleDrawEvent(data);
      });
    };

    const handleDrawEvent = (data: DrawData) => {
      if (!ctxRef.current) return;

      ctxRef.current.strokeStyle = data.color;
      ctxRef.current.lineWidth = data.stroke;
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(data.lastX || data.x, data.lastY || data.y);
      ctxRef.current.lineTo(data.x, data.y);
      ctxRef.current.stroke();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    socket.on("draw", (data: DrawData) => {
      handleDrawEvent(data);
      // Save to session storage for canvas persistence
      const history = JSON.parse(
        sessionStorage.getItem(`canvas-${roomId}`) || "[]"
      );
      history.push(data);
      sessionStorage.setItem(`canvas-${roomId}`, JSON.stringify(history));
    });

    socket.on("canvasHistory", (history: DrawData[]) => {
      if (canvas && ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        history.forEach(handleDrawEvent);
        sessionStorage.setItem(`canvas-${roomId}`, JSON.stringify(history));
      }
    });

    socket.on("canvasClear", () => {
      if (canvas && ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
        sessionStorage.removeItem(`canvas-${roomId}`);
      }
    });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      socket.off("draw");
      socket.off("canvasHistory");
      socket.off("canvasClear");
    };
  }, [socket, roomId, currentColor, currentStroke]);

  // Game event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("gameState", (state: GameState) => {
      console.log("Received gameState:", state); // Debug log
      setGameState(state);
      setTimeLeft(state.timeLeft);

      // FIX: Properly determine if current user is the drawer
      const currentUsername = Cookies.get("username");
      const isDrawer = state.currentDrawer === currentUsername;
      setIsCurrentDrawer(isDrawer);

      console.log(
        `Current drawer: ${state.currentDrawer}, Current user: ${currentUsername}, Is drawer: ${isDrawer}`
      );
    });

    socket.on(
      "timeUpdate",
      (data: { timeLeft: number; roundEndTime: number; wordHint?: string }) => {
        setTimeLeft(data.timeLeft);
        // Always update word hint when provided (for non-drawers)
        if (data.wordHint && !isCurrentDrawer) {
          setWordHint(data.wordHint);
          console.log("Updated word hint:", data.wordHint); // Debug log
        }
      }
    );

    socket.on("playerUpdate", (data: any) => {
      setPlayers(data.players);
      setCanStart(data.canStart || false);
      const currentPlayer = data.players.find(
        (p: Player) => p.username === username
      );
      setIsReady(currentPlayer?.isReady || false);
    });

    socket.on("gameStarting", (data: any) => {
      m.success(data.message);
      setCanStart(false);
      // Update game state to playing
      setGameState((prev) => ({
        ...prev,
        state: "playing",
      }));
    });

    // Fix the newTurn handler to properly set drawer state
    socket.on("newTurn", (data: any) => {
      console.log("New turn data:", data); // Debug log
      setShowPreparation(true);
      setCurrentTurn(data.turnInRound);
      setTotalTurnsInRound(data.totalTurnsInRound);

      // FIX: Use username comparison instead of socket-based comparison
      const currentUsername = Cookies.get("username");
      const isDrawer = data.drawer === currentUsername;
      setIsCurrentDrawer(isDrawer);

      // Properly update game state
      setGameState((prev) => ({
        ...prev,
        state: "playing", // Ensure state is playing
        round: data.round,
        totalRounds: data.totalRounds || 3,
        currentDrawer: data.drawer,
      }));

      closeAllModals();

      if (isDrawer) {
        m.info(`Turn ${data.turnInRound}: It's your turn to draw!`);
      } else {
        m.info(
          `Turn ${data.turnInRound}: ${data.drawer} is preparing to draw!`
        );
      }
    });

    socket.on("preparationCountdown", (data: any) => {
      setPreparationCountdown(data.countdown);
      if (data.countdown <= 0) {
        setShowPreparation(false);
      }
    });

    socket.on("wordChoices", (data: any) => {
      console.log("Word choices received:", data); // Debug log
      setWordChoices(data.words);
      openModal("wordSelect");
    });

    // Fix the drawingPhase handler
    socket.on("drawingPhase", (data: any) => {
      console.log("Drawing phase started:", data); // Debug log
      setShowPreparation(false);
      setCurrentTurn(data.turn);

      // FIX: Properly determine drawer state
      const currentUsername = Cookies.get("username");
      const isDrawer = data.drawer === currentUsername;
      setIsCurrentDrawer(isDrawer);

      // Update game state and word hint
      setGameState((prev) => ({
        ...prev,
        state: "playing",
        round: data.round,
        currentDrawer: data.drawer,
      }));

      // Set initial word hint for non-drawers
      if (!isDrawer) {
        setWordHint(data.word); // This should be the underscore version
        console.log("Set word hint for guesser:", data.word); // Debug log
      }

      closeAllModals();

      if (isDrawer) {
        m.success("Start drawing now!");
      } else {
        m.info(`${data.drawer} is now drawing! Try to guess the word!`);
      }
    });

    socket.on("drawerWord", (data: any) => {
      console.log("Drawer word received:", data); // Debug log

      // FIX: Only set current word if this user is the drawer
      const currentUsername = Cookies.get("username");
      if (gameState.currentDrawer === currentUsername) {
        setCurrentWord(data.word);
      }
    });

    socket.on("correctGuess", (data: any) => {
      m.success(`${data.username} guessed correctly! +${data.points} points`);
    });

    socket.on("scoreUpdate", (data: any) => {
      setGameState((prev) => ({ ...prev, scores: data.scores }));
    });

    // Listen for drawer penalty
    socket.on("drawerPenalty", (data: any) => {
      m.error({
        content: (
          <div>
            <div className="font-bold text-red-600">😞 No one guessed!</div>
            <div>{data.message}</div>
            <div className="text-sm text-gray-600">-{data.penalty} points</div>
          </div>
        ),
        duration: 4,
      });
    });

    // Enhanced turn end handler
    socket.on("turnEnd", (data: any) => {
      console.log("Turn ended:", data);

      if (data.noOneGuessed) {
        m.warning({
          content: `The word was: "${data.word}" - No one guessed it!`,
          duration: 3,
        });
      } else {
        m.success({
          content: `The word was: "${data.word}"`,
          duration: 3,
        });
      }

      // Update game state...
      setGameState((prev) => ({
        ...prev,
        scores: data.scores,
      }));

  
      setRoundResults({
        round: data.round,
        totalRounds: data.totalRounds || 3,
        turnInRound: data.turnInRound,
        totalTurnsInRound: data.totalTurnsInRound,
        scores: data.scores,
        word: data.word,
        drawer: data.drawer,
        guessedPlayers: data.guessedPlayers || [],
        noOneGuessed: data.noOneGuessed,
        drawerPointsAwarded: data.drawerPointsAwarded,
        isTurnResult: true, // Flag to distinguish from round complete
        isLastTurnOfRound: data.turnInRound === data.totalTurnsInRound,
        isGameEnding: data.round >= data.totalRounds && data.turnInRound === data.totalTurnsInRound
      });
      
      // Show the modal for turn results
      openModal("roundResult");
    });

    socket.on("roundComplete", (data: any) => {
      m.success(`Round ${data.round} completed!`);
      // Don't show modal here since turnEnd already showed it
      // The modal will automatically show "Continue to next round" for the last turn
    });

    socket.on("gameEnd", (data: any) => {
      setGameResults(data);
      setGameState((prev) => ({ ...prev, state: "ended" }));
      
      // FIX: Show different message for insufficient players
      if (data.reason === 'insufficient_players') {
        m.warning({
          content: data.message,
          duration: 5,
        });
      } else {
        m.success({
          content: "Game completed! Check the final results.",
          duration: 3,
        });
      }
      
      openModal("gameEnd");
    });

    socket.on("chatMessage", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("joinMessage", (data: any) => {
      setMessages((prev) => [...prev, { ...data, username: "System" }]);
    });

    socket.on("leaveMessage", (data: any) => {
      setMessages((prev) => [...prev, { ...data, username: "System" }]);
      setPlayers((prev) =>
        prev.filter((player) => player.username !== data.username)
      );
    });

    socket.on("gameReset", (data: any) => {
      setGameState({
        state: "waiting",
        round: 0,
        totalRounds: 3,
        players: [],
        scores: {},
        currentDrawer: null,
        timeLeft: 0,
      });
      setIsReady(false);
      setCanStart(false);
      setTimeLeft(0);
      setCurrentWord("");
      setWordHint("");
      setIsCurrentDrawer(false);
      closeAllModals();
      sessionStorage.removeItem(`canvas-${roomId}`);

      m.info(data.message);
    });

    return () => {
      socket.off("gameState");
      socket.off("timeUpdate");
      socket.off("playerUpdate");
      socket.off("gameStarting");
      socket.off("newTurn");
      socket.off("preparationCountdown");
      socket.off("wordChoices");
      socket.off("drawingPhase");
      socket.off("drawerWord");
      socket.off("correctGuess");
      socket.off("scoreUpdate");
      socket.off("turnEnd");
      socket.off("roundComplete");
      socket.off("gameEnd");
      socket.off("chatMessage");
      socket.off("joinMessage");
      socket.off("leaveMessage");
      socket.off("gameReset");
      socket.off("drawerPenalty");
    };
  }, [socket, username, roomId, players, gameState.currentDrawer]);

  // Canvas update on color/stroke change
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = currentColor;
      ctxRef.current.lineWidth = currentStroke;
    }
  }, [currentColor, currentStroke]);

  // Drawing handlers
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isCurrentDrawer || !ctxRef.current || !socket || !roomId) return;

    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    lastCoords.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastCoords.current = { x: null, y: null };
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !ctxRef.current || !socket || !roomId || !isCurrentDrawer)
      return;

    e.preventDefault();
    const coords = getCoordinates(e);
    const color = isErasing ? "white" : currentColor;
    const stroke = isErasing ? 20 : currentStroke;

    const drawData: DrawData = {
      x: coords.x,
      y: coords.y,
      lastX: lastCoords.current.x,
      lastY: lastCoords.current.y,
      roomId,
      color,
      stroke,
    };

    socket.emit("draw", drawData);

    // Draw locally
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = stroke;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(lastCoords.current.x!, lastCoords.current.y!);
    ctxRef.current.lineTo(coords.x, coords.y);
    ctxRef.current.stroke();

    lastCoords.current = coords;
  };

  // Chat functions
  const sendMessage = () => {
    if (!message.trim() || !socket || !roomId) return;

    const chatMessage: ChatMessage = {
      message: message.trim(),
      roomId,
      username: Cookies.get("username") || "",
    };

    socket.emit("chatMessage", chatMessage);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Tool handlers
  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    setIsErasing(false);
  };

  const handleStrokeChange = (stroke: number) => {
    setCurrentStroke(stroke);
  };

  const toggleEraser = () => {
    setIsErasing((prev) => !prev);
  };

  const clearCanvas = () => {
    if (!socket || !isCurrentDrawer) return;
    socket.emit("clearCanvas");
  };

  const colors = [
    { name: "Black", value: "black", bg: "bg-black" },
    { name: "Red", value: "red", bg: "bg-red-500" },
    { name: "Blue", value: "blue", bg: "bg-blue-500" },
    { name: "Green", value: "green", bg: "bg-green-500" },
    { name: "Yellow", value: "yellow", bg: "bg-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <Navbar socket={socket}/>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 right-4 z-50">
        <Button
          type="primary"
          shape="circle"
          icon={isMobileSidebarOpen ? <LuX /> : <LuMenu />}
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="shadow-lg"
        />
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] gap-4 p-4">
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Game Header */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  {gameState.state === "waiting" && "🎮 Waiting for Players"}
                  {gameState.state === "playing" &&
                    gameState.round > 0 &&
                    `🎨 Round ${gameState.round}/${gameState.totalRounds} - Turn ${currentTurn}/${totalTurnsInRound}`}
                  {gameState.state === "playing" &&
                    gameState.round === 0 &&
                    "🎮 Game Starting..."}
                  {gameState.state === "ended" && "🏆 Game Ended"}
                </h2>
                {gameState.state === "playing" && timeLeft > 0 && (
                  <div className="flex items-center space-x-2 text-red-500">
                    <LuClock className="w-5 h-5" />
                    <span className="text-lg font-mono font-bold">
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
              </div>

              {gameState.state === "playing" && !showPreparation && (
                <div className="text-center">
                  {isCurrentDrawer ? (
                    <div className="flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-xl">
                      <LuPalette className="text-purple-600" />
                      <span className="text-purple-700 font-semibold">
                        Your Turn: {currentWord || "Drawing..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-xl">
                      <span className="text-blue-700">
                        Word:{" "}
                        <span className="font-mono text-lg font-bold tracking-wider">
                          {wordHint || "_ _ _"}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {gameState.state === "playing" && timeLeft > 0 && (
              <Progress
                percent={(timeLeft / 80000) * 100}
                showInfo={false}
                strokeColor={timeLeft < 20000 ? "#ef4444" : "#3b82f6"}
                className="mt-4"
                strokeWidth={6}
              />
            )}
          </Card>

          {/* Preparation Banner */}
          {showPreparation && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-lg rounded-2xl">
              <div className="text-center">
                <h3 className="text-lg font-bold text-green-800 mb-2">
                  {isCurrentDrawer ? "🎨 It's Your Turn!" : "🎯 Get Ready!"}
                </h3>
                <p className="text-green-600 mb-2">
                  {isCurrentDrawer
                    ? "Select a word from the options to start drawing"
                    : `${gameState.currentDrawer} is selecting a word...`}
                </p>
                <div className="text-2xl font-bold text-green-800">
                  {preparationCountdown > 0
                    ? `${preparationCountdown} seconds`
                    : "Starting..."}
                </div>
              </div>
            </Card>
          )}

          {/* Canvas and Tools */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4">
            {/* Canvas */}
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-4">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className={`w-full h-full min-h-[400px] lg:min-h-[500px] border-2 border-gray-200 rounded-xl shadow-inner
                  ${
                    isCurrentDrawer
                      ? isErasing
                        ? "cursor-crosshair"
                        : "cursor-crosshair"
                      : "cursor-not-allowed"
                  }
                  ${!isCurrentDrawer ? "pointer-events-none" : ""}
                `}
                style={{ touchAction: "none" }}
              />
            </div>

            {/* Drawing Tools - Desktop */}
            {isCurrentDrawer && (
              <div className="hidden lg:flex flex-col space-y-2 w-16">
                {/* Drawing Tools Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-3 flex flex-col items-center space-y-4">
                  {/* Tool Title */}
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                    <LuPalette className="w-4 h-4 text-purple-600" />
                  </div>

                  {/* Color Palette */}
                  <div className="flex flex-col space-y-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleColorChange(color.value)}
                        className={`w-8 h-8 rounded-lg ${
                          color.bg
                        } shadow-md hover:shadow-lg transition-all duration-200 border-2 hover:scale-110 ${
                          currentColor === color.value && !isErasing
                            ? "border-gray-800 scale-110 ring-2 ring-gray-300"
                            : "border-white/50"
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>

                  {/* Size Indicator */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div
                        className="bg-gray-800 rounded-full"
                        style={{
                          width: `${Math.max(
                            2,
                            Math.min(currentStroke / 2, 8)
                          )}px`,
                          height: `${Math.max(
                            2,
                            Math.min(currentStroke / 2, 8)
                          )}px`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {currentStroke}
                    </span>
                  </div>

                  {/* Size Slider - Vertical */}
                  <div className="flex flex-col items-center space-y-2 h-24">
                    <input
                      type="range"
                      min="2"
                      max="20"
                      step="2"
                      value={currentStroke}
                      onChange={(e) =>
                        handleStrokeChange(Number(e.target.value))
                      }
                      className="h-20 w-2 appearance-none bg-gray-200 rounded-lg slider-vertical"
                    />
                  </div>

                  {/* Tool Buttons */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={toggleEraser}
                      className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                        isErasing
                          ? "bg-red-100 border-red-300 text-red-600"
                          : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Eraser"
                    >
                      <LuEraser className="w-4 h-4 mx-auto" />
                    </button>

                    <button
                      onClick={clearCanvas}
                      className="w-8 h-8 rounded-lg bg-red-50 border-2 border-red-200 text-red-500 transition-all duration-200 hover:scale-110 hover:bg-red-100"
                      title="Clear Canvas"
                    >
                      <LuTrash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* Drawing Tools - Mobile */}
            {isCurrentDrawer && (
              <div className="lg:hidden bg-white rounded-2xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <LuPalette className="mr-2" />
                    Tools
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      type={isErasing ? "primary" : "default"}
                      size="small"
                      icon={<LuEraser />}
                      onClick={toggleEraser}
                    />
                    <Button
                      type="default"
                      danger
                      size="small"
                      icon={<LuTrash2 />}
                      onClick={clearCanvas}
                    />
                  </div>
                </div>

                {/* Colors - Mobile */}
                <div className="grid grid-cols-8 gap-2 mb-4">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className={`w-8 h-8 rounded-lg ${
                        color.bg
                      } shadow-md border-2 ${
                        currentColor === color.value && !isErasing
                          ? "border-gray-800 scale-110"
                          : "border-gray-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Brush Size - Mobile */}
                <div className="flex items-center space-x-4">
                  <LuPencil className="text-gray-600" />
                  <Slider
                    min={2}
                    max={20}
                    step={2}
                    value={currentStroke}
                    onChange={handleStrokeChange}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500 w-8">
                    {currentStroke}px
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={`w-full lg:w-80 space-y-4 ${
            isMobileSidebarOpen ? "block" : "hidden lg:block"
          } ${
            isMobileSidebarOpen ? "fixed inset-0 z-40 bg-white p-4 pt-20" : ""
          }`}
        >
          {/* Player List */}
          <PlayerList
            players={players}
            gameState={gameState}
            isReady={isReady}
            toggleReady={toggleReady}
            canStart={canStart}
          />

          {/* Chat Section */}
          <ChatSection
            messages={messages}
            setMessage={setMessage}
            message={message}
            sendMessage={sendMessage}
            chatRef={chatRef}
            handleKeyPress={handleKeyPress}
            socket={socket}
          />
        </div>
      </div>

      {/* Modals */}
      <WordSelectModal
        showWordModal={activeModal === "wordSelect"}
        wordChoices={wordChoices}
        selectWord={selectWord}
      />

      <RoundResultModal
        showResultsModal={activeModal === "roundResult"}
        setShowResultsModal={() => closeAllModals()}
        roundResults={roundResults}
        players={players}
        gameState={gameState}
      />

      <GameEndModal
        showGameEndModal={activeModal === "gameEnd"}
        setShowGameEndModal={() => closeAllModals()}
        gameResults={gameResults}
      />
    </div>
  );
};

export default Page;
