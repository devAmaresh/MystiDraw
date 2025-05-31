import { useEffect } from 'react';

interface VoiceFeedbackOptions {
  enabled?: boolean;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useVoiceFeedback = (options: VoiceFeedbackOptions = {}) => {
  const {
    enabled = true,
    lang = 'en-US',
    rate = 1,
    pitch = 1,
    volume = 1
  } = options;

  const speak = (text: string) => {
    if (!enabled || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return { speak, stop };
};