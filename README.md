# MystiDraw ✨🎨

<div align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</div>

<div align="center">
  <h3>🎨 Real-time multiplayer drawing and guessing game inspired by Skribbl.io</h3>
  <p>Draw, guess, and have fun with friends in real-time!</p>
  
  <h2>🚀 <a href="https://doodle-dash-kappa.vercel.app/" target="_blank">🎮 Play Now!</a></h2>
  
  <a href="https://doodle-dash-kappa.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🎨%20Live%20Demo-Play%20MystiDraw-brightgreen?style=for-the-badge&logoColor=white" alt="Live Demo" />
  </a>
</div>

---

## 🌟 Features

- 🎨 **Interactive Drawing Canvas** - Smooth drawing with mouse/touch support
- 🔄 **Smart Reconnection** - 10-second grace period to rejoin without losing progress
- ⏱️ **Timed Rounds** - Fast-paced gameplay with countdown timers
- 🏆 **Scoring System** - Points for quick guesses and successful drawings
- 👥 **Multiple Rooms** - Private lobbies with password protection
- 🔐 **JWT Authentication** - Secure token-based user sessions
- 📱 **Responsive Design** - Works on desktop and mobile devices
- ⚡ **Real-time Communication** - Instant updates via WebSockets
- 🖌️ **Customizable Drawing Tools** - Choose colors, brush sizes, and more
- 🗣️ **Voice Input** - Use speech-to-text to chat
- 💡 Smart Hints – Automatically get helpful hints if you're stuck for too long

## 🎮 How to Play

1. **Create or Join** a game room with a password
2. **Wait for Players** - At least 2 players needed to start
3. **Take Turns Drawing** - Choose from 3 word options when it's your turn
4. **Guess Words** - Type your guesses in the chat
5. **Earn Points** - Faster guesses = more points!
6. **Win the Game** - Highest score after all rounds wins

### 🎯 Scoring

- **First to guess**: 120 points
- **Second to guess**: 110 points
- **Third to guess**: 100 points
- **Late guess**: 80 points
- **Drawer bonus**: 50 points (when someone guesses)
- **Drawer penalty**: -60 points (if nobody guesses)

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Socket.IO Client** for real-time communication
- **HTML5 Canvas** for drawing functionality
- **Ant Design** for UI components
- **Tailwind CSS** for styling

### Backend

- **Node.js** with Express
- **Socket.IO** for WebSocket communication
- **MongoDB** with Mongoose for data persistence
- **JWT** for authentication
- **bcrypt** for password hashing

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local or Atlas)
- npm

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/devAmaresh/mystidraw.git
   cd mystidraw
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Setup environment variables**

   Create `.env` in the backend directory:

   ```env
   PORT=3000
   JWT_SECRET=your_super_secret_jwt_key_here
   MONGODB_URI=mongodb://localhost:27017/mystidraw
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   ```

5. **Run the application**

   **Backend** (Terminal 1):

   ```bash
   cd backend
   npm run dev
   ```

   **Frontend** (Terminal 2):

   ```bash
   cd frontend
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
mystidraw/
├── backend/
│   ├── controllers/     # Route controllers
│   ├── handlers/        # Socket event handlers
│   ├── middleware/      # Auth & validation middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # Express routes
│   ├── services/        # Game logic & state management
│   └── utils/           # Helper functions
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Main page components
│   │   └── utils/       # Frontend utilities
│   └── public/
└── README.md
```

## 🎨 Canvas Features

- **Drawing Tools**: Pencil, eraser, color picker
- **Brush Sizes**: Adjustable stroke width (1-20px)
- **Color Palette**: 12 preset colors + custom color picker
- **Clear Canvas**: Reset drawing area
- **Real-time Sync**: All players see drawings instantly

## 🔧 Configuration

### Game Settings

You can modify game settings in `backend/utils/gameConfig.js`:

```javascript
export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  TOTAL_ROUNDS: 3,
  TURN_TIME: 80, // seconds
  PREPARATION_TIME: 5, // seconds
  WORD_SELECTION_TIME: 10, // seconds
};
```

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set build command: `npm run build`
3. Set environment variables in Vercel dashboard

### Backend (Render/Railway)

1. Connect your GitHub repo
2. Set start command: `npm start`
3. Add environment variables in dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License**.

- ✅ You may share and redistribute the material
- ❌ You may not use this project for commercial purposes
- ❌ You may not modify or create derivative works
- ✅ You must give appropriate credit

See the [LICENSE](https://creativecommons.org/licenses/by-nc-nd/4.0/) for details.

## 📞 Contact

**Amaresh** - [@devAmaresh](https://github.com/devAmaresh)

Project Link: [https://github.com/devAmaresh/mystidraw](https://github.com/devAmaresh/mystidraw)

Live Demo: [https://doodle-dash-kappa.vercel.app/](https://doodle-dash-kappa.vercel.app/)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/devAmaresh">devAmaresh</a></p>
  <p>🎮 <a href="https://doodle-dash-kappa.vercel.app/" target="_blank"><strong>Play MystiDraw Now!</strong></a></p>
  <p>⭐ Star this repo if you like it!</p>
</div>
