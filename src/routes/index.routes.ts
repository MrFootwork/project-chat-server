import { Router } from 'express';
import prisma from '../db';

const router: Router = require('express').Router();

router.get('/', (req, res) => {
  res.json('All good in here');
});

router.post('/books', async (req, res) => {
  const { title, author } = req.body;
  try {
    const bookData = {
      title: 'The Fellowship of the Ring',
      year: 1954,
      quantity: 5,
      genre: ['High fantasy', 'Adventure'],
      authorName: 'J. R. R. Tolkien',
    };

    const newBook = await prisma.book.create({ data: bookData });

    console.log('New book:', newBook);

    res.json(newBook);
  } catch (error) {
    console.log(error);
    res.json('Something went wrong');
    return;
  }
});

router.get('/books', async (req, res) => {
  try {
    const books = await prisma.book.findMany();
    console.log('Found books:', books);

    res.json(books);
  } catch (error) {
    console.log(error);
    res.json('Something went wrong');
    return;
  }
});

module.exports = router;
