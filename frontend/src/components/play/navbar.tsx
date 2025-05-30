import { useNavigate, useParams } from "react-router-dom";
import { Button, message } from "antd";
import { LuLogOut, LuCopy, LuUser, LuSparkles } from "react-icons/lu";
import Cookies from "js-cookie";
import axios from "axios";
import { backend_url } from "../../utils/backend_url";
import { useState } from "react";

const Navbar = () => {
  const username = Cookies.get("username");
  const { roomId } = useParams<{ roomId: string }>();
  const domain = window.location.origin;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    const logout = async () => {
      try {
        setLoading(true);
        const res = await axios.post(
          `${backend_url}/api/logout`,
          { roomId },
          {
            headers: {
              Authorization: `Bearer ${Cookies.get("token")}`,
              Accept: "application/json",
            },
          }
        );
        if (res.status === 200) {
          Cookies.remove("token");
          Cookies.remove("username");
          message.success("Left room successfully");
          navigate("/");
        }
      } catch (error) {
        message.error("Failed to leave room");
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    logout();
  };

  const copyInviteLink = () => {
    const inviteLink = `${domain}?roomId=${roomId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      message.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-16 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 shadow-lg">
      <div className="h-full px-4 md:px-6 flex justify-between items-center text-white">
        {/* Left Section - Logo & User */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <LuSparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg hidden sm:block">Scribble</span>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <LuUser className="w-4 h-4" />
            <span className="font-medium text-sm">{username}</span>
          </div>
        </div>

        {/* Center Section - Room Info */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="text-center">
            <div className="text-xs text-white/70">Room ID</div>
            <div className="font-bold text-lg">{roomId}</div>
          </div>

          <Button
            type="text"
            icon={copied ? <LuCopy className="text-green-400" /> : <LuCopy />}
            onClick={copyInviteLink}
            className="text-white hover:bg-white/10 border-white/20"
            size="small"
          >
            {copied ? "Copied!" : "Copy Invite"}
          </Button>
        </div>

        {/* Mobile Room Info */}
        <div className="md:hidden flex items-center space-x-2">
          <div className="text-center">
            <div className="text-xs text-white/70">Room</div>
            <div className="font-bold text-sm">{roomId}</div>
          </div>
          <Button
            type="text"
            icon={<LuCopy />}
            onClick={copyInviteLink}
            className="text-white hover:bg-white/10"
            size="small"
          />
        </div>

        {/* Right Section - Exit */}
        <Button
          onClick={handleLogout}
          icon={<LuLogOut />}
          loading={loading}
          className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-lg"
          size="large"
        >
          <span className="hidden sm:inline">Exit Room</span>
        </Button>
      </div>
    </div>
  );
};

export default Navbar;
