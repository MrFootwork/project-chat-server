import { allowedURLs } from './config';

import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';

import connectionHandler from './routes/socket.routes';
import { messagesHandler } from './routes/messages.routes';
import { validateToken } from './services/socket.service';

// https://socket.io/docs/v4/server-initialization/#with-express
export default function socketServer(app: Express) {
  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: ['https://admin.socket.io', ...allowedURLs],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Get user information from token and store in socket.auth
  io.use(validateToken);

  // Create a socket connection between this server and a client
  io.on('connection', async socket => {
    connectionHandler(socket, io);
    messagesHandler(socket, io);
  });

  // Use the admin dashboard
  instrument(io, { auth: false, mode: 'development' });

  return server;
}
