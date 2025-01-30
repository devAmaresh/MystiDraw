import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  admin: { type: Boolean, default: false },
});

// Define the Room schema
const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    password: { type: String, default: "" },
    participants: [participantSchema],
  },
  { timestamps: true }
);

// Create and export the Room model
const Room = mongoose.model("Room", roomSchema);
export default Room;
