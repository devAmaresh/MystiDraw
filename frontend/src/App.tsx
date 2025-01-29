import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const colors = ["black", "red", "blue", "green", "purple"];
const strokeSizes = [2, 4, 6, 8, 10];

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastCoords = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const [currentColor, setCurrentColor] = useState("black");
  const [currentStroke, setCurrentStroke] = useState(4);
  const [isErasing, setIsErasing] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth * 0.7;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "square";
    ctx.lineWidth = currentStroke;
    ctx.strokeStyle = currentColor;
    ctxRef.current = ctx;

    // Listen for drawing events
    socket.on("draw", ({ x, y, lastX, lastY, color, stroke }: any) => {
      if (!ctxRef.current) return;
      ctxRef.current.strokeStyle = color;
      ctxRef.current.lineWidth = stroke;
      ctxRef.current.beginPath();
      if (lastX !== null && lastY !== null) {
        ctxRef.current.moveTo(lastX, lastY);
      } else {
        ctxRef.current.moveTo(x, y);
      }
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    });

    // Listen for chat messages
    socket.on("chatMessage", (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });
  }, []);

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

    socket.emit("draw", {
      x: offsetX,
      y: offsetY,
      lastX: lastCoords.current.x,
      lastY: lastCoords.current.y,
      color,
      stroke,
    });

    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = stroke;
    ctxRef.current.beginPath();
    if (lastCoords.current.x !== null && lastCoords.current.y !== null) {
      ctxRef.current.moveTo(lastCoords.current.x, lastCoords.current.y);
    } else {
      ctxRef.current.moveTo(offsetX, offsetY);
    }
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();

    lastCoords.current = { x: offsetX, y: offsetY };
  };

  const sendMessage = () => {
    if (message.trim() === "") return;
    socket.emit("chatMessage", message);
    setMessage("");
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen p-5 gap-4">
      {/* Drawing Area - 70% */}
      <div className="lg:w-7/10 w-full flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Multiplayer Drawing Game</h1>

        {/* Controls */}
        <div className="flex space-x-3 mb-3">
          <button
            onClick={() => setIsErasing(!isErasing)}
            className="px-4 py-2 border rounded bg-gray-200 hover:cursor-pointer"
          >
            {isErasing ? "Stop Erasing" : "Eraser"}
          </button>

          {colors.map((color) => (
            <button
              key={color}
              className={`px-3 py-2 rounded hover:cursor-pointer ${
                currentColor === color && !isErasing
                  ? "border-2 border-black"
                  : ""
              }`}
              style={{
                backgroundColor: color,
                color: color === "black" ? "white" : "black",
              }}
              onClick={() => {
                setCurrentColor(color);
                setIsErasing(false);
              }}
            >
              {color}
            </button>
          ))}
        </div>

        <div className="flex space-x-2 mb-3">
          {strokeSizes.map((size) => (
            <button
              key={size}
              className={`px-4 py-2 border hover:cursor-pointer rounded ${
                currentStroke === size && !isErasing
                  ? "border-2 border-black"
                  : ""
              }`}
              onClick={() => {
                setCurrentStroke(size);
                setIsErasing(false);
              }}
            >
              {size}px
            </button>
          ))}
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          className="border-2 border-gray-300 rounded-lg shadow-lg"
        />
      </div>

      {/* Chat Area - 30% */}
      <div className="lg:w-3/10 w-full p-4 border-2 border-gray-300 bg-gray-100 rounded-lg flex flex-col">
        <h2 className="text-xl font-semibold mb-3">Chat</h2>

        <div className="flex-1 overflow-y-auto border-b border-gray-400 mb-3 p-2 h-64">
          {messages.map((msg, index) => (
            <p
              key={index}
              className="text-left bg-white p-2 rounded mb-2 shadow"
            >
              {msg}
            </p>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={sendMessage}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
