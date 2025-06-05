import { useState, useEffect, useRef } from "react";
import { Button, Tooltip, message as m } from "antd";
import { LuMic, LuMicOff } from "react-icons/lu";

interface VoiceInputProps {
  onTranscriptUpdate?: (transcript: string) => void;
  disabled?: boolean;
  className?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceInput = ({
  onTranscriptUpdate,
  disabled = false,
  className = "",
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);
  const isStoppingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      console.warn("Speech Recognition API not supported in this browser");
    }

    return () => {
      cleanup();
    };
  }, []);

  // FIX: Comprehensive cleanup with stream management
  const cleanup = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // FIX: Stop media stream tracks to ensure mic indicator disappears
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped media track:", track.kind);
      });
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onstart = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onspeechstart = null;
      recognitionRef.current.onspeechend = null;

      if (isListening && !isStoppingRef.current) {
        isStoppingRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.warn("Error aborting recognition during cleanup:", error);
        }
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    isStoppingRef.current = false;
  };

  const createRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isStoppingRef.current) return;

      let transcript = "";
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;

        if (result.isFinal) {
          isFinal = true;
        }
      }

      onTranscriptUpdate?.(transcript);

      if (isFinal && transcript.trim()) {
        console.log("Final transcript:", transcript.trim());
        gracefulStop();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "aborted" && isStoppingRef.current) {
        return;
      }

      switch (event.error) {
        case "network":
          m.error("Network error occurred during voice recognition");
          break;
        case "not-allowed":
          m.error("Microphone access denied. Please allow microphone permissions.");
          break;
        case "no-speech":
          m.warning("No speech detected. Please try speaking louder.");
          break;
        case "audio-capture":
          m.error("No microphone found or audio capture failed");
          break;
        case "service-not-allowed":
          m.error("Speech recognition service not allowed");
          break;
        case "aborted":
          console.log("Speech recognition was aborted");
          break;
        default:
          m.error("Voice recognition failed. Please try again.");
      }

      gracefulStop();
    };

    recognition.onstart = () => {
      if (isStoppingRef.current) return;

      console.log("Speech recognition started");
      setIsListening(true);
      m.info("🎤 Listening... Speak now!");

      timeoutRef.current = window.setTimeout(() => {
        if (recognitionRef.current && isListening && !isStoppingRef.current) {
          m.info("Voice input completed");
          gracefulStop();
        }
      }, 10000);
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");

      // FIX: Add delay to ensure proper cleanup
      window.setTimeout(() => {
        setIsListening(false);
        isStoppingRef.current = false;

        // FIX: Force cleanup of media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            track.stop();
          });
          streamRef.current = null;
        }

        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, 100);
    };

    // FIX: Add speech start/end handlers for better control
    recognition.onspeechstart = () => {
      console.log("Speech started");
    };

    recognition.onspeechend = () => {
      console.log("Speech ended");
    };

    return recognition;
  };

  const startListening = async () => {
    if (!isSupported || disabled || isListening) return;

    try {
      // FIX: Get media stream first and store reference
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      console.log("Media stream acquired:", stream.id);

      // Clean up any existing recognition
      if (recognitionRef.current) {
        cleanup();
      }

      const recognition = createRecognition();
      if (!recognition) {
        // FIX: Clean up stream if recognition fails
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        return;
      }

      recognitionRef.current = recognition;
      isStoppingRef.current = false;

      recognition.start();
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      m.error("Failed to access microphone. Please check permissions.");

      // FIX: Clean up stream on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      gracefulStop();
    }
  };

  const gracefulStop = () => {
    if (!recognitionRef.current) return;

    console.log("Gracefully stopping voice recognition...");
    isStoppingRef.current = true;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.warn("Error stopping recognition:", error);
      try {
        recognitionRef.current.abort();
      } catch (abortError) {
        console.warn("Error aborting recognition:", abortError);
      }
    }

    // FIX: Force cleanup after a short delay
    window.setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log("Force stopped track:", track.kind, track.readyState);
        });
        streamRef.current = null;
      }
    }, 500);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const toggleListening = () => {
    console.log("Toggle listening clicked, current state:", isListening);

    if (isListening) {
      gracefulStop();
    } else {
      startListening();
    }
  };

  // FIX: Add visibility change handler to cleanup when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isListening) {
        console.log("Tab hidden, stopping voice recognition");
        gracefulStop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isListening]);

  if (!isSupported) {
    return (
      <Tooltip title="Voice input not supported in this browser">
        <Button
          type="text"
          icon={<LuMicOff />}
          disabled
          className="text-gray-400"
          size="small"
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip
      title={
        disabled
          ? "Voice input disabled"
          : isListening
          ? "Click to stop listening"
          : "Click to start voice input"
      }
    >
      <Button
        type={isListening ? "primary" : "default"}
        icon={<LuMic className={isListening ? "animate-spin" : ""} />}
        onClick={toggleListening}
        disabled={disabled}
        className={`transition-all duration-200 ${
          isListening
            ? "bg-red-500 hover:bg-red-600 border-red-500 text-white animate-pulse"
            : "text-gray-600 hover:text-blue-500 hover:bg-blue-50"
        } ${className}`}
        size="middle"
      />
    </Tooltip>
  );
};

export default VoiceInput;
