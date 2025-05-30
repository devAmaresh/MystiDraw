import { Modal, Button } from "antd";

const WordSelectModal = ({ showWordModal, wordChoices, selectWord }: any) => {
  return (
    <Modal
      title="Choose a word to draw"
      open={showWordModal}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
    >
      <div className="space-y-3">
        <p className="text-center text-gray-600 mb-4">
          Select one of the words below to start drawing:
        </p>
        {wordChoices.map((word: string, index: number) => (
          <Button
            key={index}
            type="primary"
            size="large"
            block
            onClick={() => selectWord(word)}
            className="h-12 text-lg"
          >
            {word}
          </Button>
        ))}
      </div>
    </Modal>
  );
};

export default WordSelectModal;
