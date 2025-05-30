export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  TOTAL_ROUNDS: 3,
  TURN_TIME: 80, // seconds
  POINTS: {
    FIRST_GUESS: 120,
    SECOND_GUESS: 110,
    THIRD_GUESS: 100,
    LATE_GUESS: 80,
    DRAWER: 50, // Points for drawer when someone guesses
    DRAWER_PENALTY: 60 // Points lost when no one guesses (adjustable: 50-80)
  }
};

export const wordLists = {
  easy: [
    "cat", "dog", "house", "tree", "car", "sun", "moon", "fish", "bird", "book",
    "apple", "chair", "table", "phone", "clock", "shoe", "hat", "ball", "cake", "flower"
  ],
  medium: [
    "elephant", "guitar", "computer", "bicycle", "rainbow", "butterfly", "sandwich", "volcano", 
    "telescope", "helicopter", "dinosaur", "octopus", "penguin", "lighthouse", "spaceship",
    "pyramid", "kangaroo", "waterfall", "mushroom", "treasure"
  ],
  hard: [
    "procrastination", "photosynthesis", "architecture", "microscope", "refrigerator",
    "metamorphosis", "constellation", "entrepreneur", "democracy", "ecosystem",
    "algorithm", "philosophy", "psychology", "archaeology", "mathematics"
  ]
};