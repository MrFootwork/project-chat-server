import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  connectionHandler,
  extendSocketByUser,
} from './services/socket.service';

// https://socket.io/docs/v4/server-initialization/#with-express
export default function socketServer(app: Express) {
  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5005',
        'https://project-chat-server.onrender.com',
      ],
    },
  });

  // Get user information from token and store in socket.data.user
  io.use(extendSocketByUser);

  io.on('connection', connectionHandler);

  return server;
}
