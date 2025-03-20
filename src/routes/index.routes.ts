import { Router } from 'express';
import prisma from '../db';

const router: Router = require('express').Router();

router.get('/', (req, res) => {
  res.json('All good in here');
});

router.post('/books', async (req, res) => {
  try {
    const newBook = await prisma.book.create({ data: req.body });
    console.log('New book:', newBook);
    res.json(newBook);
  } catch (error) {
    console.log(error);
    res.json(`Something went wrong, ${error}`);
    return;
  }
});

router.get('/books', async (req, res) => {
  try {
    const books = await prisma.book.findMany();
    res.json(books);
  } catch (error) {
    console.log(error);
    res.json('Something went wrong');
    return;
  }
});

module.exports = router;
