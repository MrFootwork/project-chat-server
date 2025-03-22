import { Router } from 'express';
import prisma from '../db';
import { getUserFromJWT } from '../services/auth.service';
import { RequestToken } from '../types/requests';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req: RequestToken, res, next) => {
  try {
    const userWithoutPassword = await getUserFromJWT(req.token);
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export default router;
