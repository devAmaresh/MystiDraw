import jwt from "jsonwebtoken";
import Room from "../models/roomModel.js";

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decrypted_token = jwt.verify(token, process.env.JWT_SECRET);
    //delete the participant from the room
    const updatedRoom = await Room.findOneAndUpdate(
      { roomId: decrypted_token.roomId },
      { $pull: { participants: { username: decrypted_token.username } } }, // Remove by username
      { new: true }
    );

    if (!updatedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }
    if (updatedRoom.participants.length === 0) {
      await Room.deleteOne({ roomId: decrypted_token.roomId });
    }

    return res
      .status(200)
      .json({ message: "Participant removed, logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ message: "Server error" });
  }
};
