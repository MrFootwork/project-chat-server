import express from 'express';

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const app = express();

// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require('./config')(app);

// 👇 Start handling routes here
const indexRoutes = require('./routes/index.routes');
app.use('/api', indexRoutes);

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require('./error-handling')(app);

// TEST
// const prisma = require('./db/index');
import prisma from './db/index';

const newBook = {
  title: 'The Fellowship of the Ring',
  year: 1954,
  quantity: 5,
  genre: ['High fantasy', 'Adventure'],
  authorName: 'J. R. R. Tolkien',
};

prisma.book
  .create({ data: newBook })
  .then(book => {
    console.log('Success... a new book was created!!');
    console.log(book);
  })
  .catch(error => {
    console.log('Something went wrong...');
    console.log(error);
  });

module.exports = app;
