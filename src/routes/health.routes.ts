import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.get('/health', async (_, res) => {
  try {
    // Attempt a simple query to check database connectivity
    await prisma.user.findFirst({ select: { id: true } });
    res.status(200).send('Database connection is healthy.');
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).send('Database connection error.');
  }
});

export default router;
