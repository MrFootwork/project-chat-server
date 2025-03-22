import { Router } from 'express';
import prisma from '../db';
import isProtected from '../middlewares/protected';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const newUser = await prisma.user.create({ data: req.body });
    console.log('New user:', newUser);
    res.json(newUser);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/protected', isProtected, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

export default router;
