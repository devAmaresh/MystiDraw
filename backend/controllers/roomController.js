import Room from "../models/roomModel.js";

// Create a room
export const createRoom = async (req, res) => {
  try {
    const { roomId, username, password } = req.body;

    // Validate input
    if (!roomId || !username || !password) {
      return res
        .status(400)
        .json({ message: "Room ID, username, and password are required" });
    }

    // Check if the room already exists
    const roomExists = await Room.findOne({ roomId });
    if (roomExists) {
      return res.status(400).json({ message: "Room already exists" });
    }

    // Create new room with the first participant
    const newRoom = new Room({
      roomId,
      password,
      participants: [{ username, score: 0 }], // Add creator as the first participant
    });

    // Save to DB
    await newRoom.save();

    // Convert to object and remove password
    const roomData = newRoom.toObject();
    delete roomData.password;

    res
      .status(201)
      .json({ message: "Room created successfully", room: roomData });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId, username, password } = req.body;

    // Validate input
    if (!roomId || !username || !password) {
      return res
        .status(400)
        .json({ message: "Room ID, username, and password are required" });
    }

    // Check if the room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if the password is correct
    if (room.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Check if the username is already taken
    const usernameExists = room.participants.some(
      (participant) => participant.username === username
    );
    if (usernameExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Add the new participant
    room.participants.push({ username, score: 0 });

    // Save to DB
    await room.save();

    // Convert to object and remove password
    const roomData = room.toObject();
    delete roomData.password;

    res
      .status(200)
      .json({ message: "Joined room successfully", room: roomData });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Server error" });
  }
};
