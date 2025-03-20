import { Router } from 'express';
import prisma from '../db';

const router: Router = require('express').Router();

router.get('/', (req, res) => {
  res.json('All good in here');
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
