import { useNavigate, useParams } from "react-router-dom";
import { Button, message, Typography } from "antd";
import { LuLogOut } from "react-icons/lu";
import Cookies from "js-cookie";
import axios from "axios";
import { backend_url } from "../../utils/backend_url";
import { useState } from "react";
const navbar = () => {
  const username = localStorage.getItem("username");
  const { roomId } = useParams<{ roomId: string }>();
  const domain = window.location.origin;
  const { Text } = Typography;
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
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
          localStorage.removeItem("username");
          Cookies.remove("token");
          message.success("Exiting room success");
          nav("/");
          console.log("Logout success");
        }
      } catch (error) {
        message.error("Exiting room failed");
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    logout();
  };
  return (
    <div className="h-full p-4 bg-zinc-900 flex justify-between items-center text-white">
      <div>Username : {username}</div>
      <div className="mr-6">
        <span className="text-sm mr-1">Invite Link</span>
        <Text copyable={{ text: `${domain}?roomId=${roomId}` }} />
      </div>
      <div>
        <Button
          onClick={handleLogout}
          icon={<LuLogOut />}
          disabled={loading}
          loading={loading}
        >
          Exit
        </Button>
      </div>
    </div>
  );
};

export default navbar;
