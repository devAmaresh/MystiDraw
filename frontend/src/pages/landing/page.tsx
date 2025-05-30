import { Button, Card, message } from "antd";
import axios from "axios";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { backend_url } from "../../utils/backend_url";
import { LockFilled, TeamOutlined, PlayCircleOutlined, UserOutlined } from "@ant-design/icons";
import { LuUsers, LuMouse, LuTimer } from "react-icons/lu";

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
    if (!username.trim()) {
      message.error("Please enter a username");
      return;
    }
    if (!joinRoomId.trim()) {
      message.error("Please enter a room ID");
      return;
    }
    if (!joinRoomPassword.trim()) {
      message.error("Please enter a password");
      return;
    }
    
    localStorage.setItem("username", username);
    async function joinRoom() {
      try {
        setLoading(true);
        const res = await axios.post(
          `${backend_url}/api/rooms/join`,
          {
            username: username.trim(),
            roomId: joinRoomId.trim(),
            password: joinRoomPassword,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        if (res.status === 200) {
          Cookies.set("token", res.data.token, { expires: 1 });
          navigate(`/play/${joinRoomId}`);
        }
      } catch (err: any) {
        message.error(err.response?.data?.message || "Failed to join room");
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
    joinRoom();
  };

  const handleCreateRoom = () => {
    if (!username.trim()) {
      message.error("Please enter a username");
      return;
    }
    if (!roomId.trim()) {
      message.error("Please enter a room ID");
      return;
    }
    if (!password.trim()) {
      message.error("Please enter a password");
      return;
    }
    
    localStorage.setItem("username", username);
    async function createRoom() {
      try {
        setLoading(true);
        const res = await axios.post(
          `${backend_url}/api/rooms/create`,
          {
            roomId: roomId.trim(),
            username: username.trim(),
            password: password,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        if (res.status === 201) {
          Cookies.set("token", res.data.token, { expires: 1 });
          navigate(`/play/${roomId}`);
        }
      } catch (err: any) {
        message.error(err.response?.data?.message || "Failed to create room");
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
    createRoom();
  };

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-10 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-gradient-to-br from-green-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-4">
         
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Scribble & Guess
          </h1>
        </div>

        

        {/* Main Game Card */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8">
          <Card
            className="w-full max-w-md backdrop-blur-xl rounded-3xl shadow-2xl border-0 overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div className="p-2">
              {/* Tab Switcher */}
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-2xl flex">
                  <button
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      state === "join"
                        ? "bg-white text-purple-600 shadow-md"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setState("join")}
                  >
                    <TeamOutlined className="mr-2" />
                    Join Room
                  </button>
                  <button
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      state === "create"
                        ? "bg-white text-purple-600 shadow-md"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setState("create")}
                  >
                    <LockFilled className="mr-2" />
                    Create Room
                  </button>
                </div>
              </div>

              {/* Username Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserOutlined className="mr-2" />
                  Your Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your creative username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800"
                  maxLength={20}
                />
              </div>

              {/* Join Room Section */}
              {state === "join" && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-2xl border border-pink-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <PlayCircleOutlined className="mr-2 text-pink-500" />
                      Join Existing Room
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Room ID (e.g., ROOM123)"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-gray-800"
                        maxLength={10}
                      />
                      <input
                        type="password"
                        placeholder="Room Password"
                        value={joinRoomPassword}
                        onChange={(e) => setJoinRoomPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-gray-800"
                      />
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<TeamOutlined />}
                      loading={loading}
                      disabled={loading}
                      onClick={handleJoinRoom}
                      className="w-full mt-4 h-12 text-lg font-semibold rounded-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      style={{
                        background: "linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)",
                      }}
                    >
                      Join the Fun! 🎨
                    </Button>
                  </div>
                </div>
              )}

              {/* Create Room Section */}
              {state === "create" && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-2xl border border-cyan-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <LockFilled className="mr-2 text-cyan-500" />
                      Create New Room
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Unique Room ID (e.g., MYROOM)"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 text-gray-800"
                        maxLength={10}
                      />
                      <input
                        type="password"
                        placeholder="Set Room Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-cyan-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300 text-gray-800"
                      />
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<LockFilled />}
                      loading={loading}
                      disabled={loading}
                      onClick={handleCreateRoom}
                      className="w-full mt-4 h-12 text-lg font-semibold rounded-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      style={{
                        background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                      }}
                    >
                      Create Lobby 🚀
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Game Instructions */}
        <div className="px-4 pb-8">
          <div className="max-w-2xl mx-auto bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                  <LuMouse className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600">Draw the given word using your mouse or touch</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-2">
                  <LuUsers className="w-6 h-6 text-pink-600" />
                </div>
                <p className="text-sm text-gray-600">Other players guess what you're drawing</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-2">
                  <LuTimer className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-600">Score points based on speed and accuracy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
