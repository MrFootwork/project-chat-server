import express, { ErrorRequestHandler } from 'express';
import healthRoutes from './routes/health.routes';
import indexRoutes from './routes/index.routes';
import authRoutes from './routes/auth.routes';
import authMiddleware from './middlewares/auth';
import { errorHandler, notFoundHandler } from './middlewares/error';

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const app = express();

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require('./config')(app);

// Auth
app.use(authMiddleware);

// Routes
app.use('/api', indexRoutes);
app.use('/auth', authRoutes);
app.use(healthRoutes);

// 404 handler (must come after all routes)
app.use(notFoundHandler);

// Error-handling middleware (must come last)
app.use(errorHandler as ErrorRequestHandler);

module.exports = app;
