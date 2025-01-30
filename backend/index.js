import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

// Enable CORS
app.use(cors());

// Serve static files (for frontend)
app.use(express.static("public"));

// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Join a room
  socket.on("joinRoom", (roomId, username) => {
    socket.join(roomId); // Join the room
    console.log(`${username} joined room: ${roomId}`);
    // Emit a welcome message to the room
    io.to(roomId).emit("chatMessage", `${username} has joined the room.`);
  });

  // Drawing event - broadcast to the room
  socket.on("draw", (data) => {
    console.log("Received draw data:", data);
    io.to(data.roomId).emit("draw", data);
  });

  // Chat message event - broadcast to the room
  socket.on("chatMessage", (data) => {
    console.log("Received chat message:", data);
    io.to(data.roomId).emit("chatMessage", data);
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

// Start the server
server.listen(3000, () => console.log("Server running on port 3000"));
