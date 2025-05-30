import { Modal, Button } from "antd";

const RoundResultModal = ({
  showResultsModal,
  setShowResultsModal,
  roundResults,
  players,
  gameState,
}: any) => {
  if (!roundResults) return null;

  const getSortedPlayers = () => {
    return players
      .map((player: any) => ({
        ...player,
        score: gameState.scores[player.userId] || 0,
      }))
      .sort((a: any, b: any) => b.score - a.score);
  };

  return (
    <Modal
      title={`Round ${roundResults.round} Results`}
      open={showResultsModal}
      footer={
        <Button
          type="primary"
          onClick={() => setShowResultsModal(false)}
          size="large"
        >
          {roundResults.isGameEnding ? "View Final Results" : "Continue"}
        </Button>
      }
      closable={false}
      maskClosable={false}
      centered
    >
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">
            The word was:{" "}
            <span className="text-blue-600">{roundResults.word}</span>
          </h3>
          <p className="text-gray-600">
            Drawn by:{" "}
            <span className="font-semibold">{roundResults.drawer}</span>
          </p>
          {!roundResults.isGameEnding && (
            <p className="text-sm text-gray-500 mt-2">
              Cycle {roundResults.currentCycle} of {roundResults.totalCycles} •
              Round {roundResults.round} of {roundResults.totalRounds}
            </p>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-3">Current Scores:</h4>
          <div className="space-y-2">
            {getSortedPlayers().map((player: any, index: number) => (
              <div
                key={player.userId}
                className={`flex justify-between items-center p-3 rounded ${
                  index === 0
                    ? "bg-yellow-100 border-2 border-yellow-300"
                    : "bg-gray-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  {index === 0 && <span className="text-yellow-500">👑</span>}
                  <span className="font-medium">{player.username}</span>
                </div>
                <span className="font-bold text-lg">{player.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {roundResults.guessedPlayers &&
          roundResults.guessedPlayers.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Players who guessed correctly:
              </h4>
              <div className="text-sm text-gray-600">
                {roundResults.guessedPlayers.join(", ")}
              </div>
            </div>
          )}

        {roundResults.isGameEnding && (
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 font-semibold">
              🎉 Game Complete! Check out the final results!
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RoundResultModal;
