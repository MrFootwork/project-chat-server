import { RequestToken } from '../types/requests';
import prisma from '../db';
import { Router } from 'express';
import { Server, Socket } from 'socket.io';
import OpenAI from 'openai';

export function messagesHandler(socket: Socket, io: Server) {
  // DELETE message
  socket.on('delete-message', async (messageID: string) => {
    console.log('Deleting message: ', messageID);

    // Find Message Object
    const message = await prisma.message.findFirst({
      where: { id: messageID },
    });

    // Set Delete marker to true
    await prisma.message.update({
      where: { id: messageID },
      data: { deleted: true },
    });

    // Send Message Object
    io.to(message.roomId).emit('deleted-message', message);
  });
}

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

// PUT send a prompt to the chat API
router.put('/ai', async (req: RequestToken, res) => {
  const { prompt, roomID } = req.body;
  const userID = req.userId;

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com/beta',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const messages = await prisma.message.findMany({
      where: {
        roomId: roomID,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        User: { select: { id: true, name: true } },
      },
    });

    const reshapedMessages = messages.map(message => ({
      role:
        message.userId === 'chat-bot'
          ? 'assistant'
          : ('user' as 'user' | 'assistant'),
      name: message.User.name,
      content: message.content,
    }));

    const { name: userName } = await prisma.user.findUnique({
      where: { id: userID },
      select: { name: true },
    });

    const chatContext: Array<{
      role: 'system' | 'user' | 'assistant';
      name?: string;
      content: string;
    }> = [
      {
        role: 'system',
        name: 'system',
        content:
          'You are a helpful and friendly AI assistant. If you have not enough context to answer, just respond, that you are excited to get to know the user by addressing him by his name and ask how you can help him.',
      },
      ...reshapedMessages.slice(-5),
      {
        role: 'user',
        name: userName,
        content: prompt,
      },
      {
        role: 'assistant',
        name: 'Chat Assistant',
        content: '',
      },
    ];

    const stream = await openai.chat.completions.create({
      messages: chatContext,
      model: 'deepseek-chat',
      max_tokens: 1024,
      stream: true,
    });

    let botResponse = '';

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        botResponse += newContent;
        res.write(`data: ${JSON.stringify({ content: newContent })}\n\n`);
      }
    }

    // Persist prompt and response
    await prisma.message.createMany({
      data: [
        {
          content: prompt,
          userId: userID,
          roomId: roomID,
        },
        {
          content: botResponse,
          userId: 'chat-bot',
          roomId: roomID,
        },
      ],
    });

    console.log(stream);
    res.write(`data: DONE`);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch response from AI' });
  }
});

export default router;
