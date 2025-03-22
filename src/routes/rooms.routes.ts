import { Router } from 'express';
import prisma from '../db';
import { RequestToken } from '../types/requests';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany();
    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: RequestToken, res, next) => {
  try {
    const name = req.body.name;
    const userId = req.userId;

    const newRoom = await prisma.room.create({
      data: {
        name: name,
        Users: {
          create: {
            userId: userId,
            isAdmin: true,
          },
        },
      },
      include: {
        Users: true, // Include RoomConfig relations
      },
    });

    res.status(200).json(newRoom);
  } catch (error) {
    next(error);
  }
});

export default router;
