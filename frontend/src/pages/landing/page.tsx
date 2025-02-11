import { Button, Card, message } from "antd";
import axios from "axios";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { backend_url } from "../utils/backend_url";
import { LockFilled, TeamOutlined } from "@ant-design/icons";
const Page = () => {
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [joinRoomId, setJoinRoomId] = useState(queryParams.get("roomId") || "");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("join");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (!username) {
      message.error("Please enter a username");
      return;
    }
    if (!joinRoomId) {
      message.error("Please enter a room ID");
      return;
    }
    if (!joinRoomPassword.trim()) {
      message.error("Please enter a password");
      return;
    }
    if (username && joinRoomId) {
      localStorage.setItem("username", username);
      async function joinRoom() {
        try {
          setLoading(true);
          const res = await axios.post(
            `${backend_url}/api/rooms/join`,
            {
              username: username,
              roomId: joinRoomId,
              password: joinRoomPassword,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          console.log(res);
          if (res.status === 200) {
            Cookies.set("token", res.data.token, { expires: 1 });
            navigate(`/play/${joinRoomId}`);
          }
        } catch (err: any) {
          message.error(err.response.data.message);
          console.log(err);
        } finally {
          setLoading(false);
        }
      }
      joinRoom();
    }
  };

  const handleCreateRoom = () => {
    if (!username) {
      alert("Please enter a username");
      return;
    }
    if (username) {
      localStorage.setItem("username", username);
      async function createRoom() {
        try {
          setLoading(true);
          const res = await axios.post(
            `${backend_url}/api/rooms/create`,
            {
              roomId: roomId,
              username: username,
              password: password,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          console.log(res);
          if (res.status === 201) {
            Cookies.set("token", res.data.token, { expires: 1 });
            navigate(`/play/${roomId}`);
          }
        } catch (err: any) {
          message.error(err.response.data.message);
          console.log(err);
        } finally {
          setLoading(false);
        }
      }
      createRoom();
    }
  };

  return (
    <div className="landing-page min-h-screen bg-white flex flex-col items-center">
      <div className="text-xl md:text-3xl font-bold mb-8 mt-10 p-2">
        Welcome to Multiplayer Drawing and Chatting App
      </div>
      <Card
        className="w-full max-w-xl backdrop-blur-xl rounded-2xl shadow-2xl border border-[#334155]/30"
        style={{
          background: "rgba(240,240,255,1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Username Input */}
        <div className="flex items-center justify-center gap-3">
          <div className="p-1 bg-zinc-100 rounded-lg">
            <button
              className={`${
                state === "join" ? "bg-zinc-200 text-zinc-800" : "bg-zinc-100"
              } text-zinc-500
               rounded-lg px-4 py-2 hover:cursor-pointer`}
              onClick={() => setState("join")}
            >
              Join Room
            </button>
            <button
              className={`${
                state === "create" ? "bg-zinc-200 text-zinc-800" : "bg-zinc-100"
              } text-zinc-500 
               rounded-lg px-4 py-2 hover:cursor-pointer`}
              onClick={() => setState("create")}
            >
              Create Room
            </button>
          </div>
        </div>
        <div className="mb-0.5 text-zinc-600">Username</div>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 bg-white text-zinc-800 border border-zinc-300 rounded-md mb-3 focus:outline-none"
        />

        {/* Join Room Section */}
        {state === "join" && (
          <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-lg">
            <div className="text-lg font-semibold mb-4 text-zinc-700">
              Join Room
            </div>
            <div className="md:flex  items-center md:space-x-4">
              <input
                type="text"
                placeholder="Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="p-1.5 mb-2 md:mb-0 rounded-md text-zinc-800 border border-[pink]/80 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Enter Password"
                value={joinRoomPassword}
                onChange={(e) => setJoinRoomPassword(e.target.value)}
                className="p-1.5 mb-2 md:mb-0 rounded-md text-zinc-800 border border-[pink]/80 focus:outline-none"
              />
            </div>
            <div className="text-center mt-3">
              <Button
                type="primary"
                icon={<TeamOutlined />}
                loading={loading}
                disabled={loading}
                onClick={handleJoinRoom}
                style={{
                  background:
                    "linear-gradient(90deg, #EC4899 0%, #F43F5E 100%)",
                  border: "0",
                  color: "white",
                  boxShadow: "0 4px 16px rgba(236, 72, 153, 0.3)",
                }}
              >
                Jump In!
              </Button>
            </div>
          </div>
        )}

        {/* Create Room Section */}
        {state === "create" && (
          <div className="bg-white bg-opacity-10 p-6 rounded-lg shadow-lg">
            <div className="text-lg font-semibold mb-4 text-zinc-700">
              Create Room
            </div>
            <div className="md:flex  items-center md:space-x-4">
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="p-1.5 md:mb-0 mb-2 rounded-md text-zinc-800 border border-[#06B6D4]/40 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-1.5 rounded-md text-zinc-800 border border-[#06B6D4]/40 focus:outline-none"
              />
            </div>
            <div className="text-center mt-3">
              <Button
                type="primary"
                icon={<LockFilled />}
                loading={loading}
                disabled={loading}
                onClick={handleCreateRoom}
                style={{
                  background:
                    "linear-gradient(90deg, #06B6D4 0%, #3EB5B9 100%)",
                  border: "0",
                  color: "white",
                  boxShadow: "0 4px 16px rgba(6, 182, 212, 0.3)",
                }}
              >
                Create Lobby
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Page;
