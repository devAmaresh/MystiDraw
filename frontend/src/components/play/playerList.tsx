import { Button, Card } from "antd";
import {
  LuCrown,
  LuWifi,
  LuWifiOff,
  LuUsers,
  LuCheckCheck as LuCheckCircle,
} from "react-icons/lu";
import Cookies from "js-cookie";
const PlayerList = ({
  players,
  gameState,
  isReady,
  toggleReady,
  canStart,
}: any) => {
  const readyCount = players.filter((p: any) => p.isReady).length;
  const totalPlayers = players.length;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center">
          <LuUsers className="mr-2" />
          Players ({totalPlayers})
        </h3>
        {gameState.state === "waiting" && (
          <div className="text-xs text-gray-500">
            {readyCount}/{totalPlayers} ready
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
        {players.map((player: any, __index: number) => (
          <div
            key={player.userId} // Use userId as primary key
            className={`flex justify-between items-center p-3 rounded-xl transition-all duration-200 ${
              gameState.currentDrawer === player.username
                ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300"
                : player.isReady
                ? "bg-green-50 border border-green-200"
                : "bg-gray-50 border border-gray-200"
            } ${!player.isConnected ? "opacity-60" : ""}`}
          >
            <div className="flex items-center space-x-3">
              {/* Status Icons */}
              <div className="flex items-center space-x-1">
                {gameState.currentDrawer === player.username && (
                  <LuCrown className="text-yellow-500 w-4 h-4" />
                )}
                {player.isConnected ? (
                  <LuWifi className="text-green-500 w-4 h-4" />
                ) : (
                  <LuWifiOff className="text-gray-400 w-4 h-4" />
                )}
                {player.isReady && gameState.state === "waiting" && (
                  <LuCheckCircle className="text-green-500 w-4 h-4" />
                )}
              </div>

              {/* Player Info */}
              <div className="flex flex-col">
                <span
                  className={`font-medium ${
                    gameState.currentDrawer === player.username
                      ? "text-purple-700"
                      : player.isReady
                      ? "text-green-700"
                      : "text-gray-700"
                  }`}
                >
                  {player.username}
                  
                  {player.username === Cookies.get("username") && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-normal">
                      (you)
                    </span>
                  )}
                  {!player.isConnected && " (offline)"}
                </span>
                {gameState.currentDrawer === player.username && (
                  <span className="text-xs text-purple-600 font-medium">
                    Drawing now
                  </span>
                )}
              </div>
            </div>

            {/* Score - FIXED */}
            <div className="text-right">
              <div className="font-bold text-lg text-gray-800">
                {gameState.scores[player.userId] || 0}
              </div>
              <div className="text-xs text-gray-500">points</div>
            </div>
          </div>
        ))}
      </div>

      {gameState.state === "waiting" && (
        <div className="space-y-3">
          <Button
            type={isReady ? "default" : "primary"}
            onClick={toggleReady}
            block
            size="large"
            className="rounded-xl font-semibold"
            style={
              isReady
                ? {}
                : {
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    border: "none",
                  }
            }
          >
            {isReady ? "✅ Ready!" : "🎮 Get Ready"}
          </Button>

          {canStart ? (
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold animate-pulse">
                🚀 Starting Game...
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-600">
              {readyCount === totalPlayers && totalPlayers >= 2
                ? "All players ready! Starting soon..."
                : `Need ${Math.max(2 - totalPlayers, 0)} more players`}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default PlayerList;
