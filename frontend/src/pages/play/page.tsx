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
import DrawingTools from "../../components/play/drawingtools";
import { useVoiceFeedback } from "../../hooks/useVoiceFeedback";

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
  const { speak } = useVoiceFeedback({ enabled: true, volume: 0.3 });

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
        speak("It's your turn to draw!");
        m.info(`Turn ${data.turnInRound}: It's your turn to draw!`);
      } else {
        speak(`${data.drawer} will draw next!`);
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

    
    socket.on("drawingPhase", (data: any) => {
      console.log("Drawing phase started:", data); // Debug log
      setShowPreparation(false);
      setCurrentTurn(data.turn);

      
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

      
      const currentUsername = Cookies.get("username");
      if (gameState.currentDrawer === currentUsername) {
        setCurrentWord(data.word);
      }
    });

    socket.on("correctGuess", (data: any) => {
      m.success(`${data.username} guessed correctly! +${data.points} points`);
      if (data.username === Cookies.get("username")) {
        speak("Correct! Well done!");
      } else {
        speak(`${data.username} got it right!`);
      }  
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
              <div className="w-full h-full min-h-full relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className={`w-full h-full border-2 border-gray-200 rounded-xl shadow-inner absolute inset-0
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
            </div>

            {/* Drawing Tools - Desktop */}
            {isCurrentDrawer && (
              <div className="hidden lg:flex flex-col w-16"> {/* Increased width from w-16 to w-20 */}
                {/* Drawing Tools Card */}

                  <DrawingTools
                    currentColor={currentColor}
                    currentStroke={currentStroke}
                    isErasing={isErasing}
                    handleColorChange={handleColorChange}
                    handleStrokeChange={handleStrokeChange}
                    toggleEraser={toggleEraser}
                    clearCanvas={clearCanvas}
                  />

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
