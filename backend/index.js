import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectDB } from "./db/dbconnection.js";
import roomRoutes from "./routes/roomRoutes.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import logoutRoutes from "./routes/logoutRoutes.js";
dotenv.config();
const app = express();
app.use(express.json());
const server = http.createServer(app);
connectDB();
// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: `${process.env.FRONTEND_URL}`, // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

// Enable CORS
app.use(cors());

//middleware to check the jwt token in the header of the socket connection

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error"));
      }
      socket.decoded = decoded;
      next();
    });
  } else {
    next(new Error("Authentication error"));
  }
});
const roomDrawHistory = new Map();
// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  const { decoded } = socket;
  socket.on("joinRoom", (roomId, username) => {
    socket.join(decoded.roomId); // Join the room
    console.log(`${decoded.username} joined room: ${decoded.roomId}`);
    const history = roomDrawHistory.get(roomId) || [];
    // Broadcast to the room
    io.to(roomId).emit("joinMessage", {
      message: `${username} has joined the room.`,
    });

    socket.emit("canvasHistory", history);
  });
  socket.on("leaveRoom", (roomId, username) => {
    console.log(`${username} left room: ${roomId}`);
    socket.leave(roomId);
    io.to(roomId).emit("leaveMessage", {
      message: `${username} has left the room.`,
    });
    if (decoded.admin === true) {
      io.to(roomId).emit("adminLeft", {
        message: `Admin has left the room. The room will be closed .`,
      });
    }
  });

  // Drawing event - broadcast to the room
  socket.on("draw", (data) => {
    console.log("Received draw data:", data);
    if (!roomDrawHistory.has(data.roomId)) {
      roomDrawHistory.set(data.roomId, []);
    }
    roomDrawHistory.get(data.roomId).push(data);

    // Broadcast to other users
    io.to(data.roomId).emit("draw", data);
  });

  // Chat message event - broadcast to the room
  socket.on("chatMessage", (data) => {
    console.log("Received chat message:", data);
    io.to(decoded.roomId).emit("chatMessage", data);
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});
app.use("/api/rooms", roomRoutes);
app.use("/api/logout", logoutRoutes);
// Start the server
server.listen(3000, () => console.log("Server running on port 3000"));
