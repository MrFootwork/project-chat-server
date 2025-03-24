import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  connectionHandler,
  extendSocketByUser,
} from './services/socket.service';
import { instrument } from '@socket.io/admin-ui';

// https://socket.io/docs/v4/server-initialization/#with-express
export default function socketServer(app: Express) {
  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: [
        'https://admin.socket.io',
        'http://localhost:5173',
        'https://project-chat-client.onrender.com',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Get user information from token and store in socket.data.user
  io.use(extendSocketByUser);

  io.on('connection', async socket => connectionHandler(socket, io));

  // Use the admin dashboard
  instrument(io, { auth: false });

  return server;
}
