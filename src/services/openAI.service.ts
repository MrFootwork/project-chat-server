import OpenAI from 'openai';
import prisma from '../db';
import { User } from '@prisma/client';
import { formatPopulatedMessage } from './rooms.service';
import { Server } from 'socket.io';

const client = new OpenAI();

export default async function handleOpenAIResponse(
  io: Server,
  user: User,
  roomID: string,
  rawMessage: string
) {
  // Create Context for Chat Bot
  const messages = await prisma.message.findMany({
    where: { roomId: roomID },
    orderBy: { createdAt: 'desc' },
    take: 7, // Includes the prompt
    include: { User: { select: { id: true, name: true } } },
  });

  if (messages[0].content !== rawMessage) {
    console.error(`DB messages are missing the prompt.`);
  }

  type Role = 'user' | 'assistant' | 'system' | 'developer';

  const reshapedMessages = messages.reverse().map(message => ({
    role: (message.userId === 'chat-bot' ? 'assistant' : 'user') as Role,
    content: `[${message.User.name}]: ${message.content}`,
  }));

  const systemMessage = `
    You are a helpful and friendly AI assistant named "Char-Li".
    Be nice, motivating and inspring. The user who sent this prompt has the name ${user.name}.
    This Chat room can have multiple users. I label the context messages with the users.
    Be curious about the user of this prompt, if you lack context.
    Ask questions to engage him into a conversation.
    Always add lots of emojis, where applicable.
    Do not start your response with [Char-Li]:`;

  const chatContext: Array<{
    role: Role;
    content: string;
  }> = [
    {
      role: 'developer',
      content: systemMessage,
    },
    ...reshapedMessages,
    {
      role: 'assistant',
      content: '',
    },
  ];

  // Create dummy message for frontend to render
  const createdDummyMessage = await prisma.message.create({
    data: {
      content: '',
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

  // Request a response from chat bot
  const stream = await client.responses.create({
    input: chatContext,
    model: 'gpt-4.1-nano',
    max_output_tokens: 1024,
    store: true,
    stream: true,
  });

  // Stream bot response
  let botResponse = '';

  async function emitChunkWithDelay(
    chunk: { delta: string | undefined },
    delay: number
  ) {
    if (chunk.delta) {
      botResponse += chunk.delta;

      io.to(roomID).emit(
        'stream-bot-message',
        createdDummyMessage.id,
        chunk.delta
      );

      // Wait for the specified delay before processing the next chunk
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  for await (const chunk of stream) {
    if (chunk.type === 'response.output_text.delta') {
      await emitChunkWithDelay(chunk, 35);
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

  return reshapedBotmessage;
}
