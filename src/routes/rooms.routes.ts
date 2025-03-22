import { Router } from 'express';
import prisma from '../db';
import { RequestToken } from '../types/requests';

const router = Router();

// GET all rooms
router.get('/', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: { Users: { select: { userId: true } } },
    });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

// GET one room
router.get('/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    res.json(room);
  } catch (error) {
    next(error);
  }
});

// POST Create a new room
router.post('/', async (req: RequestToken, res, next) => {
  try {
    const { name } = req.body;
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
      // Include RoomConfig relations
      include: { Users: true },
    });

    res.status(200).json(newRoom);
  } catch (error) {
    next(error);
  }
});

// PUT Update one room
router.put('/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { name: newRoomName, private: isPrivate } = req.body;

    // Construct the data object dynamically based on provided fields
    const data: { name?: string; private?: boolean } = {};
    if (newRoomName !== undefined) data.name = newRoomName;
    if (isPrivate !== undefined) data.private = isPrivate;

    // Ensure at least one field is being updated
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data,
    });

    res.json(updatedRoom);
  } catch (error) {
    next(error);
  }
});

// DELETE one room
router.delete('/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Delete related entries in the join table (e.g., RoomConfig)
    await prisma.roomConfig.deleteMany({
      where: { roomId },
    });

    // Delete the room
    const deletedRoom = await prisma.room.delete({
      where: { id: roomId },
    });

    res.json(deletedRoom);
  } catch (error) {
    next(error);
  }
});

export default router;
