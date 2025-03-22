import { Router } from 'express';
import prisma from '../db';
import { getUserFromJWT } from '../services/auth.service';
import { RequestToken } from '../types/requests';

const router = Router();

// GET all users
router.get('/', async (req, res, next) => {
  try {
    // TODO return only users without passwords
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// GET user from token
router.get('/me', async (req: RequestToken, res, next) => {
  try {
    const userWithoutPassword = await getUserFromJWT(req.token);
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// DELETE user
router.delete('/:userId', async (req, res, next) => {
  const { userId } = req.params;

  try {
    // Delete related entries in the join table (e.g., RoomConfig)
    await prisma.roomConfig.deleteMany({
      where: { userId },
    });

    // Delete user
    const users = await prisma.user.delete({
      where: { id: userId },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

export default router;
