import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket: Socket = io("http://localhost:3000");

const Page = () => {
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [roomId, setRoomId] = useState(uuidv4());
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically generate roomId on load
    setRoomId(uuidv4());
  }, []);

  const handleJoinRoom = () => {
    if (!username) {
      alert("Please enter a username");
      return;
    }
    if (username && roomId) {
      localStorage.setItem("username", username);
      socket.emit("joinRoom", roomId, username);
      navigate(`/play/${roomId}`);
    }
  };

  const handleCreateRoom = () => {
    if (!username) {
      alert("Please enter a username");
      return;
    }
    if (username) {
      localStorage.setItem("username", username);
      socket.emit("joinRoom", roomId, username);
      navigate(`/play/${roomId}`);
    }
  };

  return (
    <div className="landing-page min-h-screen bg-gradient-to-r from-purple-500 to-indigo-600 flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-8 animate-bounce">
        Welcome to Multiplayer Drawing Game
      </h1>
      <div className="mx-auto p-5 bg-amber-400 rounded-4xl">
        {/* Username Input */}
        <div className="">Username</div>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 bg-white text-black border-2 rounded-md mb-3"
        />

        {/* Join Room Section */}
        <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-lg mb-6">
          <div className="text-xl font-semibold mb-4">Join Room</div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-48 p-2 rounded-lg text-black border"
            />
            <button
              onClick={handleJoinRoom}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition duration-300 hover:cursor-pointer"
            >
              Join Room
            </button>
          </div>
        </div>

        {/* Create Room Section */}
        <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-lg">
          <div className="text-xl font-semibold mb-4">Create Room</div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              readOnly
              className="w-48 p-2 rounded-lg text-black border"
            />
            <button
              onClick={handleCreateRoom}
              className="hover:cursor-pointer px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition duration-300"
            >
              Create Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
