import { Modal, Button, notification } from "antd";

const GameEndModal = ({
  showGameEndModal,
  setShowGameEndModal,
  gameResults,
}: any) => {
  if (!gameResults) return null;

  return (
    <Modal
      title="🎉 Game Finished!"
      open={showGameEndModal}
      footer={
        <Button
          type="primary"
          onClick={() => {
            notification.success({
              message: "Game Restarted",
              description:
                "The game will restart shortly ! Voila 🎉 ..Keep playing",
              duration: 10,
            });
            setShowGameEndModal(false);
          }}
          size="large"
        >
          Play Again
        </Button>
      }
      closable={false}
      maskClosable={false}
      centered
    >
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">Final Results</h3>
        </div>

        <div className="space-y-3">
          {gameResults.rankings?.map((player: any, index: number) => (
            <div
              key={index}
              className={`flex justify-between items-center p-4 rounded-lg ${
                index === 0
                  ? "bg-gradient-to-r from-yellow-200 to-yellow-300 border-2 border-yellow-400"
                  : index === 1
                  ? "bg-gradient-to-r from-gray-200 to-gray-300 border-2 border-gray-400"
                  : index === 2
                  ? "bg-gradient-to-r from-orange-200 to-orange-300 border-2 border-orange-400"
                  : "bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-bold">
                  {index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : `${index + 1}.`}
                </span>
                <span className="font-bold text-lg">{player.username}</span>
              </div>
              <span className="font-bold text-xl">{player.score} pts</span>
            </div>
          ))}
        </div>

        <div className="text-center text-gray-600 mt-4">
          <p>Thanks for playing! Get ready for another round!</p>
        </div>
      </div>
    </Modal>
  );
};

export default GameEndModal;
