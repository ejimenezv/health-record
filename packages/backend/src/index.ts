import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { setupTranscriptionWebSocket } from './websocket/transcription.handler.js';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  maxHttpBufferSize: 5e6, // 5MB for audio
});

setupTranscriptionWebSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`WebSocket enabled at ws://localhost:${PORT}`);
  console.log(`OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
});

export { io };
