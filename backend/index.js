import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectDB } from "./db/dbconnection.js";
import roomRoutes from "./routes/roomRoutes.js";
import dotenv from "dotenv";
import logoutRoutes from "./routes/logoutRoutes.js";
import { socketAuthMiddleware } from "./middleware/socketAuth.js";
import setupSocketHandlers from "./handlers/socketHandlers.js";

dotenv.config();

const app = express();
app.use(express.json());
const server = http.createServer(app);
connectDB();

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: `${process.env.FRONTEND_URL}`,
    methods: ["GET", "POST"],
  },
});

// Enable CORS
app.use(cors());

// Socket.IO Authentication Middleware
io.use(socketAuthMiddleware);

// Setup Socket Handlers
setupSocketHandlers(io);

// Routes
app.use("/api/rooms", roomRoutes);
app.use("/api/logout", logoutRoutes);

// Start the server
server.listen(3000, () => console.log("Server running on port 3000"));
