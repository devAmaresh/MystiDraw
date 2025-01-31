import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { message as m, Slider, Tag, notification } from "antd";
import Navbar from "../components/play/navbar";
import { LuEraser } from "react-icons/lu";
import { backend_url } from "../utils/backend_url";
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

const Page = () => {
  const token = Cookies.get("token");
  const socket: Socket = io(`${backend_url}`, {
    auth: {
      token,
    },
  });

  const navigate = useNavigate();
  useEffect(() => {
    if (!token) {
      m.error("You must be logged in to access this page");
      navigate("/");
    }
  }, []);
  const { roomId } = useParams<{ roomId: string }>();
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentColor, setCurrentColor] = useState<string>("black");
  const [currentStroke, setCurrentStroke] = useState<number>(4);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(
    localStorage.getItem("username") || ""
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCoords = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  // Join room when component mounts
  useEffect(() => {
    if (username && roomId) {
      setUsername(username);
      console.log("Joining room:", roomId);
      socket.emit("joinRoom", roomId, username);
    }
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom", roomId, username);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      socket.emit("leaveRoom", roomId, username);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.disconnect();
    };
  }, []);

  // Initialize canvas and socket listeners (runs only once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Set canvas dimensions to match its display size
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        ctx.scale(dpr, dpr);

        ctx.lineCap = "round";
        ctx.lineWidth = currentStroke;
        ctx.strokeStyle = currentColor;
        ctxRef.current = ctx;
        // Listen for incoming drawing events
        socket.on("draw", (data: DrawData) => {
          console.log("Received draw event:", data);
          setCurrentColor(data.color);
          setCurrentStroke(data.stroke);

          if (ctxRef.current) {
            ctxRef.current.beginPath();
            if (data.lastX != null && data.lastY != null) {
              ctxRef.current.moveTo(data.lastX, data.lastY);
            } else {
              ctxRef.current.moveTo(data.x, data.y);
            }
            ctxRef.current.lineTo(data.x, data.y);
            ctxRef.current.stroke();
          }
        });

        // Listen for incoming chat messages
        socket.on("chatMessage", (data: ChatMessage) => {
          console.log("Received chat message:", data);
          setMessages((prev) => [
            ...prev,
            {
              message: data.message,
              roomId: data.roomId || "",
              username: data.username,
            }, // Ensure roomId and username are defined
          ]);
          if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }
        });
        socket.on("joinMessage", (data: ChatMessage) => {
          setMessages((prev) => [
            ...prev,
            {
              message: data.message,
              roomId: data.roomId || "",
              username: "Server",
            },
          ]);
        });
        socket.on("leaveMessage", (data: ChatMessage) => {
          setMessages((prev) => [
            ...prev,
            {
              message: data.message,
              roomId: data.roomId || "",
              username: "Server",
            },
          ]);
        });
        socket.on("adminLeft", (data: any) => {
          notification.info({
            message: data.message,
            description: "You will be redirected to the home page",
            duration: 0,
          });
          localStorage.removeItem("username");
          Cookies.remove("token");
          navigate("/");
        });
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
        // Cleanup listeners on unmount
        return () => {
          socket.off("draw");
          socket.off("chatMessage");
          socket.off("joinMessage");
          socket.off("leaveMessage");
          socket.off("adminLeft");
        };
      }
    }
  }, []);

  // Update canvas context properties when currentColor or currentStroke changes
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = currentColor;
      ctxRef.current.lineWidth = currentStroke;
    }
  }, [currentColor, currentStroke]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    lastCoords.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastCoords.current = { x: null, y: null };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctxRef.current) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const color = isErasing ? "white" : currentColor;
    const stroke = isErasing ? 20 : currentStroke;

    // Emit the draw event to the server
    socket.emit("draw", {
      x: offsetX,
      y: offsetY,
      lastX: lastCoords.current.x,
      lastY: lastCoords.current.y,
      roomId,
      color,
      stroke,
    });

    // Draw on the local canvas
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = stroke;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(lastCoords.current.x!, lastCoords.current.y!);
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();

    lastCoords.current = { x: offsetX, y: offsetY };
  };

  // Chat functions
  const sendMessage = () => {
    if (message.trim() === "") return;
    const chatMessage: ChatMessage = {
      message,
      roomId: roomId || "",
      username: localStorage.getItem("username") || "",
    };
    socket.emit("chatMessage", chatMessage);
    setMessage("");
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    setIsErasing(false); // Disable eraser when a color is selected
  };

  // Handle stroke width change
  const handleStrokeChange = (stroke: number) => {
    setCurrentStroke(stroke);
  };

  // Handle eraser toggle
  const toggleEraser = () => {
    setIsErasing((prev) => !prev);
  };

  return (
    <>
      <Navbar />
      <div className="flex justify-between space-x-4 p-4">
        {/* Canvas */}
        <div className="flex-1">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
            className={`border-2 border-gray-300 rounded-lg shadow-lg w-full h-[80vh]
            ${isErasing ? "cursor-crosshair" : ""}
            `}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 p-4 bg-gray-100 rounded-lg shadow-lg">
          <div className="space-y-4">
            {/* Color Buttons */}
            <div className="space-x-2">
              <div className="">Color</div>
              <Tag
                color="black"
                onClick={() => handleColorChange("black")}
                className={`cursor-pointer ${
                  currentColor === "black" && !isErasing
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
              >
                Black
              </Tag>

              <Tag
                color="red"
                className={`cursor-pointer ${
                  currentColor === "red" && !isErasing
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => handleColorChange("red")}
              >
                Red
              </Tag>
              <Tag
                color="green"
                className={`cursor-pointer ${
                  currentColor === "green" && !isErasing
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => handleColorChange("green")}
              >
                Green
              </Tag>
              <Tag
                color="blue"
                className={`cursor-pointer ${
                  currentColor === "blue" && !isErasing
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => handleColorChange("blue")}
              >
                Blue
              </Tag>
              <Tag
                color="yellow"
                className={`cursor-pointer ${
                  currentColor === "yellow" && !isErasing
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => handleColorChange("yellow")}
              >
                Yellow
              </Tag>
            </div>

            {/* Stroke Buttons */}
            <div className="space-x-2">
              <div className="">Stroke Width</div>
              <Slider min={4} max={24} step={4} onChange={handleStrokeChange} />
            </div>

            {/* Eraser Button */}
            <div>
              <button
                className={`p-2 rounded flex ${
                  isErasing
                    ? "ring-2 ring-blue-500 bg-zinc-200"
                    : "ring-1 ring-zinc-500"
                }`}
                onClick={toggleEraser}
              >
                <LuEraser />
              </button>
            </div>

            {/* Chat Section */}
            <div className="mt-4">
              <div
                className="mb-2 h-64 overflow-y-auto bg-gray-200 p-4 rounded"
                ref={chatRef}
              >
                {messages.map((msg, index) => (
                  <p key={index} className="text-sm">
                    <span className="mr-1 font-semibold">
                      {msg.username ? <>{msg.username}:</> : <></>}
                    </span>
                    {msg.message}
                  </p>
                ))}
              </div>

              <div>
                <form className="flex w-full justify-between">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-[75%] mr-2 p-2 border border-gray-300 rounded focus:outline-none"
                  />
                  <button
                    className="bg-blue-500 text-white p-2 rounded hover:cursor-pointer hover:opacity-80"
                    onClick={(e: any) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    type="submit"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;
