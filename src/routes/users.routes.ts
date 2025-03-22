import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

export default router;
