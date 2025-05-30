class GameStateManager {
  constructor() {
    this.gameRooms = new Map();
    this.roomDrawHistory = new Map();
  }

  initializeGameRoom(roomId) {
    return {
      roomId,
      players: new Map(), // socketId -> playerState
      gameState: 'waiting',
      currentRound: 0,
      currentTurnInRound: 0,
      totalPlayers: 0,
      currentDrawer: null,
      currentWord: null,
      wordChoices: [],
      roundStartTime: null,
      roundEndTime: null,
      guessedPlayers: new Set(),
      turnTimer: null,
      preparationTimer: null,
      scores: new Map(), // userId -> score (persistent across reconnections)
      gameHistory: [],
      playerStates: new Map(), // userId -> player state (persistent across reconnections)
      revealedPositions: new Set(),
      drawingOrder: [], // Array of userIds (not socketIds)
      isWordSelectionPhase: false
    };
  }

  getGameRoom(roomId) {
    return this.gameRooms.get(roomId);
  }

  createGameRoom(roomId) {
    if (!this.gameRooms.has(roomId)) {
      this.gameRooms.set(roomId, this.initializeGameRoom(roomId));
    }
    return this.gameRooms.get(roomId);
  }

  deleteGameRoom(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    if (gameRoom) {
      // Clear any running timers
      if (gameRoom.turnTimer) {
        clearInterval(gameRoom.turnTimer);
      }
      if (gameRoom.preparationTimer) {
        clearInterval(gameRoom.preparationTimer);
      }
    }
    
    this.gameRooms.delete(roomId);
    this.roomDrawHistory.delete(roomId);
    console.log(`Room ${roomId} completely deleted`);
  }

  resetRevealedPositions(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    if (gameRoom) {
      gameRoom.revealedPositions = new Set();
    }
  }

  updateRevealedPositions(roomId, positions) {
    const gameRoom = this.getGameRoom(roomId);
    if (gameRoom) {
      gameRoom.revealedPositions = positions;
    }
  }

  getRevealedPositions(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    return gameRoom ? gameRoom.revealedPositions : new Set();
  }

  addOrUpdatePlayer(roomId, socketId, playerData) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return null;

    const { userId, username } = playerData; // userId is already in format ${roomId}_${username}
    let existingPlayerState = gameRoom.playerStates.get(userId);
    
    if (existingPlayerState) {
      // Player reconnecting
      existingPlayerState.socketId = socketId;
      existingPlayerState.isConnected = true;
      existingPlayerState.lastSeen = Date.now();
      
      // Add to currently connected players map
      gameRoom.players.set(socketId, existingPlayerState);
      
      console.log(`Player ${username} reconnected to room ${roomId}. Current state:`, {
        username: existingPlayerState.username,
        score: existingPlayerState.score,
        isReady: existingPlayerState.isReady,
        gameState: gameRoom.gameState
      });
      
      return existingPlayerState;
    } else {
      // New player joining
      const newPlayerState = {
        userId, // ${roomId}_${username}
        username,
        socketId,
        score: 0,
        isReady: false,
        isConnected: true,
        joinedAt: Date.now(),
        lastSeen: Date.now()
      };
      
      // Store in persistent state
      gameRoom.playerStates.set(userId, newPlayerState);
      // Add to currently connected players
      gameRoom.players.set(socketId, newPlayerState);
      // Initialize score
      gameRoom.scores.set(userId, 0);
      
      // Add to drawing order only if game is waiting
      if (gameRoom.gameState === 'waiting') {
        if (!gameRoom.drawingOrder.includes(userId)) {
          gameRoom.drawingOrder.push(userId);
          gameRoom.totalPlayers = gameRoom.drawingOrder.length;
        }
      }
      
      console.log(`New player ${username} joined room ${roomId}. Drawing order:`, 
        gameRoom.drawingOrder.map(uid => gameRoom.playerStates.get(uid)?.username));
      
      return newPlayerState;
    }
  }

  disconnectPlayer(roomId, socketId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return null;

    const player = gameRoom.players.get(socketId);
    if (!player) return null;

    // Update player state to disconnected but keep in persistent storage
    const playerState = gameRoom.playerStates.get(player.userId);
    if (playerState) {
      playerState.isConnected = false;
      playerState.lastSeen = Date.now();
      playerState.socketId = null; // Clear socketId since they're disconnected
    }

    // Remove from currently connected players
    gameRoom.players.delete(socketId);
    
    console.log(`Player ${player.username} disconnected from room ${roomId}. Connected players: ${gameRoom.players.size}`);
    
    // Check if room is empty (no connected players)
    if (gameRoom.players.size === 0) {
      console.log(`Room ${roomId} is empty, scheduling deletion in 30 seconds...`);
      
      // Give some time for potential reconnections
      setTimeout(() => {
        const currentGameRoom = this.getGameRoom(roomId);
        if (currentGameRoom && currentGameRoom.players.size === 0) {
          console.log(`Room ${roomId} still empty after 30 seconds, deleting...`);
          this.deleteGameRoom(roomId);
        }
      }, 30000); // 30 seconds
    }
    
    return player;
  }

  removePlayer(roomId, socketId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return null;

    const player = gameRoom.players.get(socketId);
    if (!player) return null;

    // Remove completely from all data structures
    gameRoom.players.delete(socketId);
    gameRoom.playerStates.delete(player.userId);
    gameRoom.scores.delete(player.userId);
    gameRoom.guessedPlayers.delete(socketId);
    
    // Remove from drawing order
    const orderIndex = gameRoom.drawingOrder.indexOf(player.userId);
    if (orderIndex > -1) {
      gameRoom.drawingOrder.splice(orderIndex, 1);
      gameRoom.totalPlayers = gameRoom.drawingOrder.length;
    }
    
    console.log(`Player ${player.username} completely removed from room ${roomId}`);
    return player;
  }

  getDrawHistory(roomId) {
    return this.roomDrawHistory.get(roomId) || [];
  }

  addDrawHistory(roomId, drawData) {
    if (!this.roomDrawHistory.has(roomId)) {
      this.roomDrawHistory.set(roomId, []);
    }
    this.roomDrawHistory.get(roomId).push(drawData);
  }

  clearDrawHistory(roomId) {
    this.roomDrawHistory.delete(roomId);
  }

  getAllPlayers(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return [];
    
    // Return all players from persistent state (both connected and disconnected)
    return Array.from(gameRoom.playerStates.values()).map(player => ({
      ...player,
      id: player.socketId || player.userId // Use socketId if connected, otherwise userId
    }));
  }

  getConnectedPlayers(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return [];
    return Array.from(gameRoom.players.values());
  }

  getPlayerCount(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    return gameRoom ? gameRoom.players.size : 0;
  }

  getPlayerByUserId(roomId, userId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return null;
    return gameRoom.playerStates.get(userId);
  }

  getPlayerBySocketId(roomId, socketId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return null;
    return gameRoom.players.get(socketId);
  }

  updatePlayerReady(roomId, userId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return false;
    
    const player = gameRoom.playerStates.get(userId);
    if (player) {
      player.isReady = !player.isReady;
      console.log(`Player ${player.username} ready status: ${player.isReady}`);
      return true;
    }
    return false;
  }

  // Helper method to get current drawer's socketId
  getCurrentDrawerSocketId(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom || !gameRoom.currentDrawer) return null;
    
    const drawerState = gameRoom.playerStates.get(gameRoom.currentDrawer);
    return drawerState?.socketId || null;
  }

  // Helper method to convert userId to socketId for currently connected players
  getUserSocketId(roomId, userId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return null;
    
    const playerState = gameRoom.playerStates.get(userId);
    return playerState?.socketId || null;
  }

  // Debug method to check score consistency
  debugScores(roomId) {
    const gameRoom = this.getGameRoom(roomId);
    if (!gameRoom) return;
    
    console.log('=== SCORE DEBUG ===');
    console.log('Scores Map:', Object.fromEntries(gameRoom.scores));
    console.log('Player States:');
    for (const [userId, playerState] of gameRoom.playerStates) {
      console.log(`  ${playerState.username} (${userId}): score=${playerState.score}, connected=${playerState.isConnected}`);
    }
    console.log('==================');
  }
}

export default new GameStateManager();