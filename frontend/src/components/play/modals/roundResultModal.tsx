import { Modal, Button } from "antd";
import { useEffect } from "react";
import { LuCrown, LuTrophy, LuUsers } from "react-icons/lu";

const RoundResultModal = ({
  showResultsModal,
  setShowResultsModal,
  roundResults,
  players,
  gameState,
}: any) => {
  if (!roundResults) return null;
  
  useEffect(() => {
    console.log("Round Results:", roundResults);
  }, [roundResults]);

  const getSortedPlayers = () => {
    return players
      .map((player: any) => ({
        ...player,
        score: gameState.scores[player.userId] || 0,
      }))
      .sort((a: any, b: any) => b.score - a.score);
  };

  const getModalTitle = () => {
    if (roundResults.isGameEnding) {
      return "🏆 Game Complete!";
    } else if (roundResults.isLastTurnOfRound) {
      return `📊 Round ${roundResults.round} Complete`;
    } else {
      return `🎨 Turn ${roundResults.turnInRound}/${roundResults.totalTurnsInRound} Results`;
    }
  };

  const getButtonText = () => {
    if (roundResults.isGameEnding) {
      return "View Final Results";
    } else if (roundResults.isLastTurnOfRound) {
      return `Continue to Round ${roundResults.round + 1}`;
    } else {
      return "Next Turn";
    }
  };

  return (
    <Modal
      title={getModalTitle()}
      open={showResultsModal}
      footer={
        <Button
          type="primary"
          onClick={() => setShowResultsModal(false)}
          size="large"
          className="w-full"
        >
          {getButtonText()}
        </Button>
      }
      closable={false}
      maskClosable={false}
      centered
      width={500}
    >
      <div className="space-y-6">
        {/* Turn Summary */}
        <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
          <h3 className="text-xl font-bold mb-2">
            The word was:{" "}
            <span className="text-blue-600 text-2xl">{roundResults.word}</span>
          </h3>
          <p className="text-gray-600 mb-2">
            <LuUsers className="inline w-4 h-4 mr-1" />
            Drawn by:{" "}
            <span className="font-semibold text-purple-600">{roundResults.drawer}</span>
          </p>
          
          {/* Turn Progress */}
          <div className="text-sm text-gray-500 mt-3">
            <div className="flex justify-center items-center space-x-4">
              <span>Turn {roundResults.turnInRound} of {roundResults.totalTurnsInRound}</span>
              <span>•</span>
              <span>Round {roundResults.round} of {roundResults.totalRounds}</span>
            </div>
          </div>
        </div>

        {/* Drawer Points Summary */}
        {roundResults.drawerPointsAwarded !== undefined && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Drawer ({roundResults.drawer}):</span>
              <span className={`font-bold ${
                roundResults.drawerPointsAwarded > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {roundResults.drawerPointsAwarded > 0 ? '+' : ''}{roundResults.drawerPointsAwarded} points
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {roundResults.noOneGuessed 
                ? "No one guessed - penalty applied" 
                : `${roundResults.guessedPlayers.length} player(s) guessed correctly`
              }
            </div>
          </div>
        )}

        {/* Guessing Results */}
        {roundResults.guessedPlayers && roundResults.guessedPlayers.length > 0 ? (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 text-green-800 flex items-center">
              <LuTrophy className="w-4 h-4 mr-2" />
              Players who guessed correctly:
            </h4>
            <div className="space-y-2">
              {roundResults.guessedPlayers.map((playerName: string, index: number) => (
                <div key={playerName} className="flex justify-between items-center bg-white p-2 rounded">
                  <span className="flex items-center">
                    {index === 0 && <span className="text-yellow-500 mr-2">🥇</span>}
                    {index === 1 && <span className="text-gray-400 mr-2">🥈</span>}
                    {index === 2 && <span className="text-orange-600 mr-2">🥉</span>}
                    {index > 2 && <span className="text-gray-500 mr-2">#{index + 1}</span>}
                    {playerName}
                  </span>
                  <span className="text-sm text-gray-600">
                    {index === 0 ? "120 pts" : 
                     index === 1 ? "110 pts" : 
                     index === 2 ? "100 pts" : "80 pts"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <h4 className="font-semibold text-red-800 mb-2">😞 No one guessed correctly!</h4>
            <p className="text-red-600 text-sm">Better luck next time!</p>
          </div>
        )}

        {/* Current Scores */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <LuCrown className="w-4 h-4 mr-2" />
            Current Leaderboard:
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {getSortedPlayers().map((player: any, index: number) => (
              <div
                key={player.userId}
                className={`flex justify-between items-center p-3 rounded-lg transition-all ${
                  index === 0
                    ? "bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300"
                    : index === 1 
                    ? "bg-gray-100 border border-gray-300"
                    : index === 2
                    ? "bg-orange-50 border border-orange-200"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                    {index === 0 && <span className="text-lg">👑</span>}
                    {index === 1 && <span className="text-lg">🥈</span>}
                    {index === 2 && <span className="text-lg">🥉</span>}
                    {index > 2 && <span className="text-sm font-bold text-gray-600">#{index + 1}</span>}
                  </div>
                  <div>
                    <span className={`font-medium ${
                      index === 0 ? "text-yellow-800" : "text-gray-700"
                    }`}>
                      {player.username}
                    </span>
                    {player.username === roundResults.drawer && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                        Drew this turn
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg ${
                    index === 0 ? "text-yellow-800" : "text-gray-800"
                  }`}>
                    {player.score}
                  </span>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Progress Indicator */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-800">Game Progress</span>
            <span className="text-sm text-blue-600">
              {Math.round(((roundResults.round - 1) * roundResults.totalTurnsInRound + roundResults.turnInRound) / 
                (roundResults.totalRounds * roundResults.totalTurnsInRound) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((roundResults.round - 1) * roundResults.totalTurnsInRound + roundResults.turnInRound) / 
                  (roundResults.totalRounds * roundResults.totalTurnsInRound) * 100}%`
              }}
            />
          </div>
        </div>

        {roundResults.isGameEnding && (
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <p className="text-green-800 font-bold text-lg">
              🎉 Game Complete! 
            </p>
            <p className="text-green-600 mt-1">
              Check out the final results and rankings!
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RoundResultModal;
