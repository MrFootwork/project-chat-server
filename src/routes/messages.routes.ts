import { RequestToken } from '../types/requests';
import prisma from '../db';

import { Router } from 'express';
import { Server, Socket } from 'socket.io';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import webPush from 'web-push';

// Define a separate include object for Messages
export const messagesIncludePopulated = <Prisma.MessageInclude>{
  select: {
    id: true,
    content: true,
    roomId: true,
    edited: true,
    deleted: true,
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
};

export function messagesHandler(socket: Socket, io: Server) {
  // DELETE message
  socket.on('delete-message', async (messageID: string) => {
    console.log('Deleting message: ', messageID);

    // Set Delete marker to true
    const message = await prisma.message.update({
      where: { id: messageID },
      data: { deleted: true },
    });

    // Send Message Object
    io.to(message.roomId).emit('deleted-message', message);
  });

  // EDIT message
  socket.on('edit-message', async (messageID: string, content: string) => {
    console.log('Editing message: ', messageID, content);

    try {
      // Set Edit marker to true
      const message = await prisma.message.update({
        where: { id: messageID },
        data: { edited: true, content },
      });

      // Send Message Object
      io.to(message.roomId).emit('edited-message', message);
    } catch (error) {
      console.error(error);
    }
  });
}

const router = Router();

// POST Subscriptions from clients
router.post('/subscribe', async (req: RequestToken, res) => {
  const { endpoint, keys } = req.body;

  try {
    const subscription = await prisma.subscription.upsert({
      where: { userId: req.userId },
      update: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: req.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });
    // console.log(`🚀 ~ router.post ~ subscription:`, subscription);

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: 'You subscribed successfully! 🎉',
        body: 'This is how you will get notified.',
      })
    );

    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    throw error;
  }
});

// TEST Push Notification
router.post('/push', async (req: RequestToken, res) => {
  // Generate VAPID keys (do this once and save them)
  const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };

  // Configure VAPID details
  webPush.setVapidDetails(
    `mailto:${process.env.MY_MAIL}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  // Example subscription object (received from the client)
  const subscription = {
    endpoint:
      'https://fcm.googleapis.com/fcm/send/eHDiKp7Tgxs:APA91bGGuKvAH0D3I1fpAKEWkN3p6wU8lUqOK0n88RLZlJ5qiSalbG4WR1xqxY3tg8v0nZ3uEGJJ5CY0gixue1y5mbfGZrhJ4tq73DHeqhaPVd2GMFM-8NKswGHjEo-dCc2qP1WMmwxv',
    expirationTime: null as number | null,
    keys: {
      p256dh:
        'BKJxbZ8fOVki7GazID8f1o2aebKeuwYPyRgjHTekDV7W7D95lFvQhdhopDJY5dpP_g-mirsH-Orultxz5BpLqCc',
      auth: 'uU3OScneaLY3oYyj3ArZkw',
    },
  };

  // Send a push notification
  const payload = JSON.stringify({
    title: 'Hello!',
    body: 'This is a test notification.',
  });

  webPush
    .sendNotification(subscription, payload)
    .then(response => console.log('Notification sent:', response))
    .catch(error => console.error('Error sending notification:', error));
});

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
