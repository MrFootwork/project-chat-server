import { Router } from 'express';
import prisma from '../db';
import { getUserFromJWT } from '../services/auth.service';
import { RequestToken } from '../types/requests';

const router = Router();

// GET all users
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      omit: { password: true },
    });
    res.json(users);
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

    res.json({ message: 'User deleted successfully', data: users });
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

// PUT Add a friend to me
router.put('/me/friends/:friendId', async (req: RequestToken, res, next) => {
  const { friendId } = req.params;
  const userId = req.userId;

  try {
    if (friendId === userId) {
      res.status(400).json({ message: 'Cannot add yourself as a friend' });
      return;
    }

    // friendId user becomes friend of userId user (me)
    const updatedMe = await prisma.user.update({
      where: { id: userId },
      data: {
        friends: {
          connect: { id: friendId },
        },
      },
      omit: { password: true },
      include: {
        friends: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isDeleted: true,
          },
        },
      },
    });

    // userId user (me) becomes friend of friendId user
    await prisma.user.update({
      where: { id: friendId },
      data: {
        friends: {
          connect: { id: userId },
        },
      },
      omit: { password: true },
      include: {
        friends: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isDeleted: true,
          },
        },
      },
    });

    res.status(200).json(updatedMe);
  } catch (error) {
    next(error);
  }
});

export default router;
