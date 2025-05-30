import { GAME_CONFIG } from '../config/gameConfig.js';
import { getRandomWords, generateWordHint, generateSimpleWordHint } from '../utils/gameUtils.js';
import gameStateManager from './gameStateManager.js';

class GameLogic {
  constructor(io) {
    this.io = io;
  }

  startGame(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    gameRoom.gameState = 'playing';
    gameRoom.currentRound = 1;
    gameRoom.currentTurnInRound = 0;
    
    // Use the existing drawing order (userIds) from when players joined
    if (gameRoom.drawingOrder.length === 0) {
      // Fallback: create drawing order from currently connected players
      const connectedPlayers = gameStateManager.getConnectedPlayers(roomId);
      gameRoom.drawingOrder = connectedPlayers.map(p => p.userId);
    }
    gameRoom.totalPlayers = gameRoom.drawingOrder.length;
    
    console.log(`Game started in room ${roomId}. Drawing order:`, 
      gameRoom.drawingOrder.map(userId => gameStateManager.getPlayerByUserId(roomId, userId)?.username));
    console.log(`Total players: ${gameRoom.totalPlayers}, Fixed rounds: ${GAME_CONFIG.TOTAL_ROUNDS}`);
    
    this.startNewTurn(roomId);
  }

  startNewTurn(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    // Check if current round is complete
    if (gameRoom.currentTurnInRound >= gameRoom.totalPlayers) {
      gameRoom.currentRound++;
      gameRoom.currentTurnInRound = 0;
      
      if (gameRoom.currentRound > GAME_CONFIG.TOTAL_ROUNDS) {
        this.endGame(roomId);
        return;
      }
      
      this.io.to(roomId).emit('newRoundStarted', {
        round: gameRoom.currentRound,
        totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
        message: `Round ${gameRoom.currentRound} begins!`
      });
    }

    // Get current drawer (by userId)
    const drawerUserId = gameRoom.drawingOrder[gameRoom.currentTurnInRound];
    gameRoom.currentDrawer = drawerUserId; // Store userId, not socketId
    const currentDrawerState = gameStateManager.getPlayerByUserId(roomId, drawerUserId);
    
    if (!currentDrawerState) {
      console.error(`Drawer ${drawerUserId} not found in room ${roomId}`);
      // Skip this turn if drawer not found
      gameRoom.currentTurnInRound++;
      setTimeout(() => this.startNewTurn(roomId), 1000);
      return;
    }

    console.log(`Round ${gameRoom.currentRound}, Turn ${gameRoom.currentTurnInRound + 1}/${gameRoom.totalPlayers}: ${currentDrawerState.username} is drawing`);

    // Reset for new turn
    gameRoom.guessedPlayers.clear();
    gameStateManager.resetRevealedPositions(roomId);
    gameStateManager.clearDrawHistory(roomId);

    // Generate word choices
    gameRoom.wordChoices = getRandomWords('medium', 3);
    gameRoom.currentWord = null;
    gameRoom.isWordSelectionPhase = true;

    // Broadcast updated game state
    const currentGameState = {
      state: 'playing',
      round: gameRoom.currentRound,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      turnInRound: gameRoom.currentTurnInRound + 1,
      totalTurnsInRound: gameRoom.totalPlayers,
      players: gameStateManager.getAllPlayers(roomId),
      scores: Object.fromEntries(gameRoom.scores),
      currentDrawer: currentDrawerState.username,
      timeLeft: 0
    };

    this.io.to(roomId).emit('gameState', currentGameState);

    // Notify all players about the new turn
    this.io.to(roomId).emit('newTurn', {
      round: gameRoom.currentRound,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      turnInRound: gameRoom.currentTurnInRound + 1,
      totalTurnsInRound: gameRoom.totalPlayers,
      drawer: currentDrawerState.username,
      preparationTime: 15
    });

    // Send word choices to current drawer (if connected)
    const drawerSocketId = gameStateManager.getUserSocketId(roomId, drawerUserId);
    if (drawerSocketId) {
      this.io.to(drawerSocketId).emit('wordChoices', {
        words: gameRoom.wordChoices,
        timeLimit: 15,
        round: gameRoom.currentRound,
        turn: gameRoom.currentTurnInRound + 1
      });
    } else {
      // Drawer is disconnected, auto-select word
      console.log(`Drawer ${currentDrawerState.username} is disconnected, auto-selecting word`);
      gameRoom.currentWord = gameRoom.wordChoices[0];
      setTimeout(() => this.startDrawingPhase(roomId), 1000);
      return;
    }

    this.startPreparationTimer(roomId);
  }

  startPreparationTimer(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    let preparationTime = 15;
    
    // Send initial countdown
    this.io.to(roomId).emit('preparationCountdown', {
      countdown: preparationTime,
      drawer: gameRoom.players.get(gameRoom.currentDrawer)?.username,
      round: gameRoom.currentRound,
      turn: gameRoom.currentTurnInRound + 1
    });

    const countdownInterval = setInterval(() => {
      preparationTime--;
      
      this.io.to(roomId).emit('preparationCountdown', {
        countdown: preparationTime,
        drawer: gameRoom.players.get(gameRoom.currentDrawer)?.username,
        round: gameRoom.currentRound,
        turn: gameRoom.currentTurnInRound + 1
      });
      
      if (preparationTime <= 0) {
        clearInterval(countdownInterval);
        
        // Check if word was selected, if not auto-select
        const currentGameRoom = gameStateManager.getGameRoom(roomId);
        if (currentGameRoom && currentGameRoom.isWordSelectionPhase) {
          currentGameRoom.currentWord = currentGameRoom.wordChoices[0];
          console.log(`Auto-selected word: ${currentGameRoom.currentWord} for ${currentGameRoom.players.get(currentGameRoom.currentDrawer)?.username}`);
        }
        
        this.startDrawingPhase(roomId);
      }
    }, 1000);

    // Store interval reference to clear if word is selected early
    gameRoom.preparationTimer = countdownInterval;
  }

  selectWord(roomId, drawerSocketId, selectedWord) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom || !gameRoom.isWordSelectionPhase) {
      return false;
    }

    // Get drawer userId from socketId
    const drawerPlayer = gameStateManager.getPlayerBySocketId(roomId, drawerSocketId);
    if (!drawerPlayer || gameRoom.currentDrawer !== drawerPlayer.userId) {
      return false;
    }

    if (!gameRoom.wordChoices.includes(selectedWord)) {
      return false;
    }

    // Clear preparation timer and start drawing immediately
    if (gameRoom.preparationTimer) {
      clearInterval(gameRoom.preparationTimer);
      gameRoom.preparationTimer = null;
    }

    gameRoom.currentWord = selectedWord;
    gameRoom.isWordSelectionPhase = false;
    
    console.log(`Word selected: ${selectedWord} by ${drawerPlayer.username}`);
    
    this.startDrawingPhase(roomId);
    return true;
  }

  startDrawingPhase(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    gameRoom.isWordSelectionPhase = false;
    
    gameRoom.roundStartTime = Date.now();
    gameRoom.roundEndTime = Date.now() + (GAME_CONFIG.TURN_TIME * 1000);

    const initialHint = generateSimpleWordHint(gameRoom.currentWord);
    const currentDrawerState = gameStateManager.getPlayerByUserId(roomId, gameRoom.currentDrawer);
    
    console.log(`Drawing phase started. Word: ${gameRoom.currentWord}, Drawer: ${currentDrawerState?.username}`);

    // Notify all players about drawing phase start
    this.io.to(roomId).emit('drawingPhase', {
      word: initialHint,
      wordLength: gameRoom.currentWord.length,
      timeLeft: GAME_CONFIG.TURN_TIME,
      round: gameRoom.currentRound,
      turn: gameRoom.currentTurnInRound + 1,
      drawer: currentDrawerState?.username
    });

    // Send actual word to drawer (if connected)
    const drawerSocketId = gameStateManager.getUserSocketId(roomId, gameRoom.currentDrawer);
    if (drawerSocketId) {
      this.io.to(drawerSocketId).emit('drawerWord', {
        word: gameRoom.currentWord
      });
    }

    // Broadcast updated game state
    const updatedGameState = {
      state: 'playing',
      round: gameRoom.currentRound,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      turnInRound: gameRoom.currentTurnInRound + 1,
      totalTurnsInRound: gameRoom.totalPlayers,
      players: gameStateManager.getAllPlayers(roomId),
      scores: Object.fromEntries(gameRoom.scores),
      currentDrawer: currentDrawerState?.username,
      timeLeft: GAME_CONFIG.TURN_TIME * 1000
    };

    this.io.to(roomId).emit('gameState', updatedGameState);
    this.startTurnTimer(roomId);
  }

  startTurnTimer(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    if (gameRoom.turnTimer) {
      clearInterval(gameRoom.turnTimer);
    }

    gameRoom.turnTimer = setInterval(() => {
      const now = Date.now();
      const timeRemaining = Math.max(0, gameRoom.roundEndTime - now);
      const timeElapsed = (GAME_CONFIG.TURN_TIME * 1000) - timeRemaining;
      
      const currentRevealedPositions = gameStateManager.getRevealedPositions(roomId);
      const hintResult = generateWordHint(
        gameRoom.currentWord, 
        timeElapsed, 
        GAME_CONFIG.TURN_TIME * 1000,
        currentRevealedPositions
      );
      
      gameStateManager.updateRevealedPositions(roomId, hintResult.revealedPositions);
      
      this.io.to(roomId).emit('timeUpdate', {
        timeLeft: timeRemaining,
        roundEndTime: gameRoom.roundEndTime,
        wordHint: hintResult.hint,
        round: gameRoom.currentRound,
        turn: gameRoom.currentTurnInRound + 1
      });

      if (timeRemaining <= 0) {
        clearInterval(gameRoom.turnTimer);
        gameRoom.turnTimer = null;
        this.endTurn(roomId, 'timeUp');
      }
    }, 1000);
  }

  endTurn(roomId, reason = 'completed') {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    // Clear timers
    if (gameRoom.turnTimer) {
      clearInterval(gameRoom.turnTimer);
      gameRoom.turnTimer = null;
    }
    if (gameRoom.preparationTimer) {
      clearInterval(gameRoom.preparationTimer);
      gameRoom.preparationTimer = null;
    }

    const currentDrawerState = gameStateManager.getPlayerByUserId(roomId, gameRoom.currentDrawer);
    let drawerPointsAwarded = 0;

    // Award or penalize drawer based on game outcome
    if (gameRoom.guessedPlayers.size > 0) {
      // Someone guessed - award points to drawer
      drawerPointsAwarded = GAME_CONFIG.POINTS.DRAWER;
      const drawerScore = gameRoom.scores.get(gameRoom.currentDrawer) || 0;
      gameRoom.scores.set(gameRoom.currentDrawer, drawerScore + drawerPointsAwarded);
      
      console.log(`Drawer ${currentDrawerState?.username} awarded ${drawerPointsAwarded} points (${gameRoom.guessedPlayers.size} players guessed)`);
    } else {
      // No one guessed - penalize drawer
      const drawerPenalty = GAME_CONFIG.POINTS.DRAWER_PENALTY || 60; // Default 60 points penalty
      drawerPointsAwarded = -drawerPenalty;
      
      const drawerScore = gameRoom.scores.get(gameRoom.currentDrawer) || 0;
      const newScore = Math.max(0, drawerScore - drawerPenalty); // Don't go below 0
      gameRoom.scores.set(gameRoom.currentDrawer, newScore);
      
      console.log(`Drawer ${currentDrawerState?.username} penalized ${drawerPenalty} points (no one guessed). Score: ${drawerScore} -> ${newScore}`);
    }

    // Update drawer's playerState score for consistency
    if (currentDrawerState) {
      const newDrawerScore = gameRoom.scores.get(gameRoom.currentDrawer) || 0;
      currentDrawerState.score = newDrawerScore;
    }

    // Show final word
    this.io.to(roomId).emit('timeUpdate', {
      timeLeft: 0,
      roundEndTime: gameRoom.roundEndTime,
      wordHint: gameRoom.currentWord
    });

    // Prepare turn results with drawer penalty info
    const turnResults = {
      word: gameRoom.currentWord,
      reason,
      round: gameRoom.currentRound,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      turnInRound: gameRoom.currentTurnInRound + 1,
      totalTurnsInRound: gameRoom.totalPlayers,
      drawer: currentDrawerState?.username,
      drawerPointsAwarded, // Include drawer points/penalty info
      scores: Object.fromEntries(gameRoom.scores),
      guessedPlayers: Array.from(gameRoom.guessedPlayers).map(socketId => {
        const player = gameStateManager.getPlayerBySocketId(roomId, socketId);
        return player?.username;
      }).filter(Boolean),
      noOneGuessed: gameRoom.guessedPlayers.size === 0 // Flag for frontend
    };

    console.log(`Turn ${gameRoom.currentTurnInRound + 1} of round ${gameRoom.currentRound} ended. Reason: ${reason}`);

    this.io.to(roomId).emit('turnEnd', turnResults);
    this.io.to(roomId).emit("scoreUpdate", {
      scores: Object.fromEntries(gameRoom.scores)
    });

    // Special notification for drawer penalty
    if (gameRoom.guessedPlayers.size === 0) {
      this.io.to(roomId).emit('drawerPenalty', {
        drawer: currentDrawerState?.username,
        penalty: GAME_CONFIG.POINTS.DRAWER_PENALTY || 60,
        message: `${currentDrawerState?.username} lost points - no one guessed the word!`
      });
    }

    gameRoom.currentTurnInRound++;
    
    if (gameRoom.currentTurnInRound >= gameRoom.totalPlayers) {
      this.io.to(roomId).emit('roundComplete', {
        round: gameRoom.currentRound,
        totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
        scores: Object.fromEntries(gameRoom.scores)
      });
      
      if (gameRoom.currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
        setTimeout(() => {
          this.endGame(roomId);
        }, 3000);
        return;
      }
    }

    setTimeout(() => {
      const currentGameRoom = gameStateManager.getGameRoom(roomId);
      if (currentGameRoom && currentGameRoom.gameState === 'playing') {
        this.startNewTurn(roomId);
      }
    }, 3000);
  }

  endGame(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return;

    gameRoom.gameState = 'ended';

    // Calculate final rankings using userId -> score mapping
    const rankings = Array.from(gameRoom.scores.entries())
      .map(([userId, score]) => {
        const playerState = gameStateManager.getPlayerByUserId(roomId, userId);
        return {
          username: playerState?.username || 'Unknown',
          score
        };
      })
      .sort((a, b) => b.score - a.score);

    console.log(`Game ended in room ${roomId}. Final rankings:`, rankings);

    this.io.to(roomId).emit('gameEnd', {
      rankings,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      totalTurns: gameRoom.totalPlayers * GAME_CONFIG.TOTAL_ROUNDS,
      message: "Game completed! Thanks for playing!"
    });

    // Reset game state after 10 seconds
    setTimeout(() => {
      const currentGameRoom = gameStateManager.getGameRoom(roomId);
      if (currentGameRoom) {
        currentGameRoom.gameState = 'waiting';
        currentGameRoom.currentRound = 0;
        currentGameRoom.currentTurnInRound = 0;
        currentGameRoom.scores.clear();
        currentGameRoom.currentDrawer = null;
        currentGameRoom.currentWord = null;
        currentGameRoom.drawingOrder = [];
        currentGameRoom.isWordSelectionPhase = false;
        gameStateManager.resetRevealedPositions(roomId);
        
        // Reset all players to not ready
        for (const [userId, playerState] of currentGameRoom.playerStates) {
          playerState.isReady = false;
        }
        
        this.io.to(roomId).emit("gameReset", {
          message: "Game has been reset. Get ready for a new game!"
        });
        
        this.io.to(roomId).emit("playerUpdate", {
          players: gameStateManager.getAllPlayers(roomId),
          playerCount: gameStateManager.getPlayerCount(roomId),
          canStart: false
        });
      }
    }, 10000);
  }

  canStartGame(roomId) {
    const gameRoom = gameStateManager.getGameRoom(roomId);
    if (!gameRoom) return false;

    const connectedPlayers = gameStateManager.getConnectedPlayers(roomId);
    const allReady = connectedPlayers.every(p => p.isReady);
    const enoughPlayers = connectedPlayers.length >= GAME_CONFIG.MIN_PLAYERS;
    
    return allReady && enoughPlayers && gameRoom.gameState === 'waiting';
  }
}

export default GameLogic;