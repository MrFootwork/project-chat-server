import { Router } from 'express';
import prisma from '../db';
import { Prisma } from '@prisma/client';
import { RequestToken } from '../types/requests';
import { formatPopulatedRooms } from '../services/rooms.service';
import { RoomDB } from '../types/rooms';
import { UserDB } from '../types/users';

const router = Router();

// Shared include object for Prisma queries
const roomIncludePopulated = <Prisma.RoomInclude>{
  // Room Members
  Users: {
    select: {
      isAdmin: true,
      userLeft: true,
      User: { omit: { password: true } },
    },
  },
  Messages: {
    select: {
      id: true,
      content: true,
      roomId: true,
      edited: true,
      // Messages Author
      User: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          isDeleted: true,
        },
      },
      // Readers of the message
      Readers: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          isDeleted: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
};

// GET all rooms
router.get('/all', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: roomIncludePopulated,
    });

    const formattedRooms = formatPopulatedRooms(rooms);

    res.json(formattedRooms);
  } catch (error) {
    next(error);
  }
});

// GET all rooms of logged in user
router.get('/', async (req: RequestToken, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { Users: { some: { userId: req.userId } } },
      include: roomIncludePopulated,
    });

    const formattedRooms = formatPopulatedRooms(rooms);

    res.json(formattedRooms);
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
      include: roomIncludePopulated,
    });

    const formattedRoom = formatPopulatedRooms([room])[0];

    res.json(formattedRoom);
  } catch (error) {
    next(error);
  }
});

// POST Create a new room
router.post('/', async (req: RequestToken, res, next) => {
  try {
    const { name, id } = req.body;
    const userId = req.userId;

    const newRoom = await prisma.room.create({
      data: {
        id: id,
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

// PUT set all messages of a room as read by a user
router.put('/:roomId/read', async (req: RequestToken, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    // Fetch all messages in the room that the user hasn't read yet
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        NOT: { Readers: { some: { id: userId } } },
      },
      include: { Readers: true },
    });

    // Update each message to add the user to the Readers field
    for (const message of messages) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          Readers: {
            connect: { id: userId },
          },
        },
      });
    }

    res.json({
      message: `Marked ${messages.length} messages as read by user ${userId}`,
    });
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
    const data: Prisma.RoomUpdateInput = {};
    if (newRoomName !== undefined) data.name = newRoomName;
    if (isPrivate !== undefined) data.isPrivate = isPrivate;

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
