import express from "express";
import { createRoom, joinRoom } from "../controllers/roomController.js";

const router = express.Router();

// Route to create a room
router.post("/create", createRoom);
router.post("/join", joinRoom);

export default router;
