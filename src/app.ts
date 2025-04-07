import express, { ErrorRequestHandler } from 'express';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import roomsRoutes from './routes/rooms.routes';
import messagesRoutes from './routes/messages.routes';

import authMiddleware from './middlewares/auth';
import isProtected from './middlewares/protected';
import { errorHandler, notFoundHandler } from './middlewares/error';

import socketServer from './socket';

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const app = express();
const server = socketServer(app);

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require('./config')(app);

// Auth
app.use(authMiddleware);

// Routes
app.use('/api/users', isProtected, usersRoutes);
app.use('/api/rooms', isProtected, roomsRoutes);
app.use('/api/messages', isProtected, messagesRoutes);
app.use('/auth', authRoutes);
app.use(healthRoutes);

// 404 handler (must come after all routes)
app.use(notFoundHandler);

// Error-handling middleware (must come last)
app.use(errorHandler as ErrorRequestHandler);

// module.exports = app;
export default server;
