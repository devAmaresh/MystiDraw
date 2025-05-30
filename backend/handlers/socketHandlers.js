import { GAME_CONFIG } from '../config/gameConfig.js';
import { calculatePoints, checkWordMatch } from '../utils/gameUtils.js';
import gameStateManager from '../services/gameStateManager.js';
import GameLogic from '../services/gameLogic.js';

export default function setupSocketHandlers(io) {
  const gameLogic = new GameLogic(io);

  io.on("connection", (socket) => {
    const { decoded } = socket;
    console.log(`Socket connected: ${socket.id} for user: ${decoded.username}`);
    
    // Join Room Handler
    socket.on("joinRoom", (roomId, username) => {
      socket.join(roomId);
      console.log(`${decoded.username} joining room: ${roomId}`);
      
      // Initialize game room if it doesn't exist
      const gameRoom = gameStateManager.createGameRoom(roomId);
      
      // Add or update player (handles reconnection)
      const playerState = gameStateManager.addOrUpdatePlayer(roomId, socket.id, {
        userId: decoded.userId,
        username: decoded.username
      });
      
      if (!playerState) {
        socket.emit("error", { message: "Failed to join room" });
        return;
      }
      
      const history = gameStateManager.getDrawHistory(roomId);
      
      // Send current game state to the player
      socket.emit("canvasHistory", history);
      socket.emit("gameState", {
        state: gameRoom.gameState,
        round: gameRoom.currentRound,
        totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
        turnInRound: gameRoom.currentTurnInRound,
        totalTurnsInRound: gameRoom.totalPlayers,
        players: gameStateManager.getAllPlayers(roomId),
        scores: Object.fromEntries(gameRoom.scores),
        currentDrawer: gameRoom.currentDrawer ? gameRoom.players.get(gameRoom.currentDrawer)?.username : null,
        timeLeft: gameRoom.roundEndTime ? Math.max(0, gameRoom.roundEndTime - Date.now()) : 0
      });
      
      // Send join message
      if (playerState.joinedAt === playerState.lastSeen) {
        io.to(roomId).emit("joinMessage", {
          message: `${username} has joined the room.`,
        });
      } else {
        io.to(roomId).emit("joinMessage", {
          message: `${username} has reconnected.`,
        });
      }
      
      // Check if game can start after player joins
      const canStart = gameLogic.canStartGame(roomId);
      
      // Update all players about the current player list
      io.to(roomId).emit("playerUpdate", {
        players: gameStateManager.getAllPlayers(roomId),
        playerCount: gameStateManager.getPlayerCount(roomId),
        canStart: canStart
      });
      
      // Start game immediately if conditions are met
      if (canStart) {
        console.log(`All players ready in room ${roomId}, starting game immediately!`);
        setTimeout(() => {
          gameLogic.startGame(roomId);
        }, 1000); // Small delay to ensure all clients are updated
      }
      
      // If game is in progress and this is the current drawer, restore drawing state
      if (gameRoom.gameState === 'playing' && gameRoom.currentDrawer === socket.id) {
        if (gameRoom.isWordSelectionPhase && gameRoom.wordChoices) {
          socket.emit('wordChoices', {
            words: gameRoom.wordChoices,
            timeLimit: 15,
            round: gameRoom.currentRound,
            turn: gameRoom.currentTurnInRound + 1
          });
        } else if (gameRoom.currentWord) {
          socket.emit('drawerWord', { word: gameRoom.currentWord });
        }
      }
    });

    // Leave Room Handler
    socket.on("leaveRoom", (roomId, username) => {
      console.log(`${username} leaving room: ${roomId}`);
      socket.leave(roomId);
      
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (gameRoom) {
        const disconnectedPlayer = gameStateManager.disconnectPlayer(roomId, socket.id);
        
        // If current drawer left during their turn, end turn
        if (gameRoom.currentDrawer === socket.id) {
          setTimeout(() => {
            const currentGameRoom = gameStateManager.getGameRoom(roomId);
            if (currentGameRoom && currentGameRoom.currentDrawer === socket.id) {
              gameLogic.endTurn(roomId, 'drawerLeft');
            }
          }, 5000);
        }
        
        // Update player list
        io.to(roomId).emit("playerUpdate", {
          players: gameStateManager.getAllPlayers(roomId),
          playerCount: gameStateManager.getPlayerCount(roomId),
          canStart: false // Reset canStart when someone leaves
        });
        
        if (disconnectedPlayer) {
          io.to(roomId).emit("leaveMessage", {
            message: `${disconnectedPlayer.username} has disconnected.`,
          });
        }
      }
    });

    // Player Ready Handler
    socket.on("playerReady", () => {
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (!gameRoom) return;
      
      const success = gameStateManager.updatePlayerReady(roomId, decoded.userId);
      if (!success) return;
      
      const canStart = gameLogic.canStartGame(roomId);
      
      console.log(`Player ${decoded.username} ready status changed. Can start: ${canStart}`);
      
      io.to(roomId).emit("playerUpdate", {
        players: gameStateManager.getAllPlayers(roomId),
        playerCount: gameStateManager.getPlayerCount(roomId),
        canStart: canStart
      });
      
      // Start game immediately if all players are ready
      if (canStart) {
        console.log(`All players ready in room ${roomId}, starting game immediately!`);
        // Send immediate game starting notification
        io.to(roomId).emit("gameStarting", {
          message: "All players ready! Game starting now...",
          countdown: 3
        });
        
        // Start game after brief countdown
        setTimeout(() => {
          gameLogic.startGame(roomId);
        }, 3000);
      }
    });

    // Word Selection Handler
    socket.on("selectWord", (selectedWord) => {
      const roomId = decoded.roomId;
      const success = gameLogic.selectWord(roomId, socket.id, selectedWord);
      
      if (!success) {
        socket.emit("error", { message: "Invalid word selection" });
      }
    });

    // Drawing Handler
    socket.on("draw", (data) => {
      const gameRoom = gameStateManager.getGameRoom(data.roomId);
      if (!gameRoom || gameRoom.isWordSelectionPhase) return;
      
      const drawingPlayer = gameStateManager.getPlayerBySocketId(data.roomId, socket.id);
      if (!drawingPlayer || drawingPlayer.userId !== gameRoom.currentDrawer) {
        return; // Only current drawer can draw
      }
      
      gameStateManager.addDrawHistory(data.roomId, data);
      io.to(data.roomId).emit("draw", data);
    });

    // Chat Message Handler
    socket.on("chatMessage", (data) => {
      const gameRoom = gameStateManager.getGameRoom(data.roomId);
      
      // Check if it's a correct guess during active drawing phase
      if (gameRoom && 
          gameRoom.gameState === 'playing' && 
          gameRoom.currentWord &&
          !gameRoom.isWordSelectionPhase) {
        
        const guessingPlayer = gameStateManager.getPlayerBySocketId(data.roomId, socket.id);
        const drawerUserId = gameRoom.currentDrawer; // This is a userId, not socketId
        
        // Don't check guesses from the drawer or players who already guessed
        if (guessingPlayer && 
            guessingPlayer.userId !== drawerUserId &&
            !gameRoom.guessedPlayers.has(socket.id)) {
          
          console.log(`Checking guess: "${data.message}" against word: "${gameRoom.currentWord}"`);
          console.log(`Guesser: ${guessingPlayer.username} (${guessingPlayer.userId}), Drawer: ${drawerUserId}`);
          
          if (checkWordMatch(data.message, gameRoom.currentWord)) {
            // Correct guess!
            gameRoom.guessedPlayers.add(socket.id);
            const guessOrder = gameRoom.guessedPlayers.size;
            const connectedPlayersCount = gameStateManager.getPlayerCount(data.roomId);
            const points = calculatePoints(guessOrder, connectedPlayersCount);
            
            console.log(`Correct guess by ${guessingPlayer.username}! Points: ${points}`);
            
            // Update score in the scores Map (using userId as key)
            const currentScore = gameRoom.scores.get(guessingPlayer.userId) || 0;
            const newScore = currentScore + points;
            gameRoom.scores.set(guessingPlayer.userId, newScore);
            
            // ALSO update the score in the playerState object for consistency
            const playerState = gameStateManager.getPlayerByUserId(data.roomId, guessingPlayer.userId);
            if (playerState) {
              playerState.score = newScore;
            }
            
            console.log(`Updated score for ${guessingPlayer.username}: ${currentScore} + ${points} = ${newScore}`);
            console.log(`Scores Map:`, Object.fromEntries(gameRoom.scores));
            
            // Notify about correct guess
            io.to(data.roomId).emit("correctGuess", {
              username: guessingPlayer.username,
              points,
              guessOrder,
              totalGuessed: gameRoom.guessedPlayers.size
            });
            
            // Update scores - make sure to send the scores Map
            io.to(data.roomId).emit("scoreUpdate", {
              scores: Object.fromEntries(gameRoom.scores)
            });
            
            // End turn if everyone guessed (except drawer)
            if (gameRoom.guessedPlayers.size >= connectedPlayersCount - 1) {
              console.log(`All players guessed! Ending turn.`);
              gameLogic.endTurn(data.roomId, 'allGuessed');
            }
            
            return; // Don't send as regular chat message
          } else {
            console.log(`Incorrect guess: "${data.message}" (expected: "${gameRoom.currentWord}")`);
          }
        } else {
          // Debug logging
          if (!guessingPlayer) {
            console.log(`Player not found for socket ${socket.id}`);
          } else if (guessingPlayer.userId === drawerUserId) {
            console.log(`Drawer ${guessingPlayer.username} cannot guess (userId: ${guessingPlayer.userId})`);
          } else if (gameRoom.guessedPlayers.has(socket.id)) {
            console.log(`Player ${guessingPlayer.username} already guessed correctly`);
          }
        }
      }
      
      // Send as regular chat message
      io.to(data.roomId).emit("chatMessage", data);
    });

    // Clear Canvas Handler
    socket.on("clearCanvas", () => {
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (!gameRoom || gameRoom.isWordSelectionPhase) return;
      
      const clearingPlayer = gameStateManager.getPlayerBySocketId(roomId, socket.id);
      if (!clearingPlayer || clearingPlayer.userId !== gameRoom.currentDrawer) {
        return; // Only current drawer can clear
      }
      
      gameStateManager.clearDrawHistory(roomId);
      io.to(roomId).emit("canvasClear");
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`User Disconnected: ${socket.id} (${decoded.username})`);
      
      const roomId = decoded.roomId;
      const gameRoom = gameStateManager.getGameRoom(roomId);
      if (gameRoom) {
        const disconnectedPlayer = gameStateManager.disconnectPlayer(roomId, socket.id);
        
        // If current drawer disconnected during their turn
        if (gameRoom.currentDrawer === socket.id) {
          console.log(`Current drawer ${decoded.username} disconnected, waiting for reconnection...`);
          setTimeout(() => {
            const currentGameRoom = gameStateManager.getGameRoom(roomId);
            if (currentGameRoom && currentGameRoom.currentDrawer === socket.id) {
              console.log(`Drawer ${decoded.username} didn't reconnect, ending turn`);
              if (currentGameRoom.turnTimer) {
                clearInterval(currentGameRoom.turnTimer);
                currentGameRoom.turnTimer = null;
              }
              if (currentGameRoom.preparationTimer) {
                clearInterval(currentGameRoom.preparationTimer);
                currentGameRoom.preparationTimer = null;
              }
              gameLogic.endTurn(roomId, 'drawerLeft');
            }
          }, 10000);
        }
        
        // Update player list
        io.to(roomId).emit("playerUpdate", {
          players: gameStateManager.getAllPlayers(roomId),
          playerCount: gameStateManager.getPlayerCount(roomId),
          canStart: false // Reset canStart when someone disconnects
        });
        
        if (disconnectedPlayer) {
          io.to(roomId).emit("leaveMessage", {
            message: `${disconnectedPlayer.username} has disconnected.`,
          });
        }
      }
    });
  });
}