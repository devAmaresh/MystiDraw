import { Button, Card } from "antd";
import { LuMessageSquare, LuSend, LuSmile } from "react-icons/lu";
import { useEffect } from "react";
import VoiceInput from "./voiceInput";

const ChatSection = ({
  messages,
  setMessage,
  message,
  sendMessage,
  chatRef,
  handleKeyPress,
  socket,
}: any) => {
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

 
  const handleTranscriptUpdate = (transcript: string) => {
    console.log("Transcript from voice input:", transcript);
    setMessage(transcript);
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl h-96 lg:h-80 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 flex items-center">
          <LuMessageSquare className="mr-2" />
          Chat
        </h3>
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <LuSmile />
          <span>{messages.length}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-xl mb-4 max-h-48 lg:max-h-40 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">
            No messages yet. Start the conversation! 💬
          </div>
        ) : (
          messages.map((msg: any, index: any) => (
            <div key={index} className="text-sm break-words">
              <span
                className={`font-semibold ${
                  msg.username === "System" ? "text-green-600" : "text-blue-600"
                }`}
              >
                {msg.username === "System" ? "🤖 System" : `👤 ${msg.username}`}
                :
              </span>
              <span className="ml-2 text-gray-700">{msg.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Chat Input */}
      <div className="flex gap-2 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message or guess..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
          maxLength={100}
          disabled={!socket}
        />

        {/* Voice Input Button */}
        <VoiceInput
          onTranscriptUpdate={handleTranscriptUpdate}
          disabled={!socket}
          className="relative"
        />

        <Button
          type="primary"
          icon={<LuSend />}
          onClick={sendMessage}
          disabled={!message.trim() || !socket}
          className="rounded-xl hover:scale-105 transition-transform duration-200"
        />
      </div>
    </Card>
  );
};

export default ChatSection;
