import OpenAI from 'openai';
import prisma from '../db';
import { User } from '@prisma/client';
import { formatPopulatedMessage } from './rooms.service';
import { Server } from 'socket.io';

export default async function handleDeepSeekResponse(
  io: Server,
  user: User,
  roomID: string,
  rawMessage: string
) {
  let botResponse = null;

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  // Create Context for Chat Bot
  const messages = await prisma.message.findMany({
    where: { roomId: roomID },
    orderBy: { createdAt: 'desc' },
    take: 7,
    include: { User: { select: { id: true, name: true } } },
  });

  type Role = 'system' | 'user' | 'assistant';

  const reshapedMessages = messages.reverse().map(message => ({
    role: (message.userId === 'chat-bot' ? 'assistant' : 'user') as Role,
    name: message.User.name,
    content: message.content,
  }));

  const systemMessage = `
    You are a helpful and friendly AI assistant named "Char-Li".
    If you have not enough context to answer, just respond, 
    that you are excited to get to know the user by addressing him 
    by his name and ask how you can help him.`;

  const chatContext: Array<{
    role: Role;
    name?: string;
    content: string;
  }> = [
    {
      role: 'system',
      name: 'system',
      content: systemMessage,
    },
    ...reshapedMessages.slice(-6),
    {
      role: 'user',
      name: user.name,
      content: rawMessage,
    },
    {
      role: 'assistant',
      name: 'Char-Li',
      content: '',
    },
  ];

  // Request a response from chat bot
  const stream = await openai.chat.completions.create({
    messages: chatContext,
    model: 'deepseek-chat',
    max_tokens: 1024,
    stream: true,
  });

  botResponse = botResponse || '';

  // Create dummy message for frontend to render
  const createdDummyMessage = await prisma.message.create({
    data: {
      content: botResponse,
      userId: 'chat-bot',
      roomId: roomID,
    },
    include: {
      Readers: true,
      User: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          isDeleted: true,
        },
      },
    },
  });

  const reshapedDummyMessage = formatPopulatedMessage(createdDummyMessage);
  io.to(roomID).emit('receive-message', reshapedDummyMessage);

  // Stream bot response
  for await (const chunk of stream) {
    if (chunk.choices && chunk.choices.length > 0) {
      const newContent = chunk.choices[0].delta.content;
      botResponse += newContent;

      io.to(roomID).emit(
        'stream-bot-message',
        createdDummyMessage.id,
        newContent
      );
    }
  }

  // Update DB record with final message
  const botMessage = await prisma.message.update({
    where: { id: createdDummyMessage.id },
    data: {
      content: botResponse,
      Readers: { connect: { id: user.id } },
    },
    include: {
      Readers: true,
      User: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          isDeleted: true,
        },
      },
    },
  });

  const reshapedBotmessage = formatPopulatedMessage(botMessage);
  console.log(`🚀 ~ reshapedBotmessage:`, reshapedBotmessage);

  return reshapedBotmessage;
}
