import { Router } from 'express';
import prisma from '../db';
import { RequestToken } from '../types/requests';

const router = Router();

// UPDATE a message to being read by the logged in user
router.put('/:messageID/read', async (req: RequestToken, res) => {
  const { messageID } = req.params;
  const userID = req.userId;

  try {
    await prisma.message.update({
      where: { id: messageID },
      data: { Readers: { connect: { id: userID } } },
    });

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    throw error;
  }
});

export default router;
