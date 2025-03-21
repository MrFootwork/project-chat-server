import express from 'express';
import indexRoutes from './routes/index.routes';

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const app = express();

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require('./config')(app);

// Routes
app.use('/api', indexRoutes);

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require('./middlewares/error')(app);

module.exports = app;
