import jwt from "jsonwebtoken";
import Room from "../models/roomModel.js";

// Create a room
export const createRoom = async (req, res) => {
  try {
    const { roomId, username, password } = req.body;

    if (!roomId || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const roomExists = await Room.findOne({ roomId });
    if (roomExists) {
      return res.status(400).json({ message: "Room already exists" });
    }

    const newRoom = new Room({
      roomId,
      password,
      participants: [{ username, score: 0, admin: true }],
    });

    await newRoom.save();

    // Enhanced JWT token with userId
    const token = jwt.sign(
      {
        roomId,
        username,
        userId: `${roomId}_${username}`, // Unique identifier
        joinedAt: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const roomData = newRoom.toObject();
    delete roomData.password;

    res.status(201).json({
      message: "Room created successfully",
      room: roomData,
      token,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId, username, password } = req.body;

    if (!roomId || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.password !== password) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Check if user already exists in room
    const existingParticipant = room.participants.find(
      (p) => p.username === username
    );

    if (existingParticipant || username.toLowerCase() === "system") {
      return res.status(400).json({ message: "Username already taken. Please try a different username." });
    }

    room.participants.push({ username, score: 0, admin: false });
    await room.save();

    // Enhanced JWT token
    const token = jwt.sign(
      {
        roomId,
        username,
        userId: `${roomId}_${username}`,
        joinedAt: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const roomData = room.toObject();
    delete roomData.password;

    res.status(200).json({
      message: "Joined room successfully",
      room: roomData,
      token,
    });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Server error" });
  }
};
