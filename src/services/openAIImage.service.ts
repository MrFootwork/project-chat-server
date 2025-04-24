import OpenAI from 'openai';
import prisma from '../db';
import { User } from '@prisma/client';
import { formatPopulatedMessage } from './rooms.service';
import { Server } from 'socket.io';
import { uploadImage } from './cloudinary.service';

const client = new OpenAI();

export default async function handleOpenAIImage(
  io: Server,
  user: User,
  roomID: string,
  rawMessage: string
) {
  console.log('Creating image from:', rawMessage);

  try {
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

    let response = {} as OpenAI.Images.ImagesResponse & {
      _request_id?: string | null;
    };

    try {
      response = await client.images.generate({
        model: 'dall-e-3',
        prompt: rawMessage,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
      });
    } catch (error) {
      await handleOpenAIError(error, createdDummyMessage.id);
      return;
    }

    const imageURL = response.data[0].url;

    const cloudinaryURL = await uploadImage(imageURL);

    io.to(roomID).emit(
      'stream-bot-message',
      createdDummyMessage.id,
      `![Generated Image](${cloudinaryURL})`
    );

    // Update DB record with final message
    const botMessage = await prisma.message.update({
      where: { id: createdDummyMessage.id },
      data: {
        content: `![Generated Image](${cloudinaryURL})`,
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

    async function handleOpenAIError(error: any, dummyMessageID: string) {
      if (
        error.status === 400 &&
        error.error.type === 'invalid_request_error'
      ) {
        const violationMessage = `Violation against OpenAI's content policies 🙅🏻`;

        io.to(roomID).emit(
          'stream-bot-message',
          dummyMessageID,
          violationMessage
        );

        // Update DB record with final message
        await prisma.message.update({
          where: { id: dummyMessageID },
          data: {
            content: violationMessage,
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
      }
    }
  } catch (error) {
    throw error;
  }
}
