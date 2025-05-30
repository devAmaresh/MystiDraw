interface DrawData {
  x: number;
  y: number;
  lastX: number | null;
  lastY: number | null;
  roomId: string;
  color: string;
  stroke: number;
}

interface ChatMessage {
  message: string;
  roomId: string;
  username: string;
}

interface Player {
  id: string;
  username: string;
  score: number;
  isReady: boolean;
}

interface GameState {
  state: "waiting" | "playing" | "ended";
  round: number;
  totalRounds: number;
  players: Player[];
  scores: Record<string, number>;
  currentDrawer: string | null;
  timeLeft: number;
}

// export all types
export type { DrawData, ChatMessage, Player, GameState };
