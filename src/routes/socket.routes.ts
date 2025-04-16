import prisma from '../db';

import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';
import {
  connectFriendsToRoom,
  formatPopulatedMessage,
} from '../services/rooms.service';
import { connectUsersToFriends } from '../services/users.service';
import OpenAI from 'openai';

const userSocketMap = new Map<Socket['id'], Set<User['id']>>();

export default async function connectionHandler(socket: Socket, io: Server) {
  const user = socket.handshake.auth.user as User; // with friends property

  // Add socket ID to the map for the user
  if (!userSocketMap.has(user.id)) {
    userSocketMap.set(user.id, new Set());
  }
  userSocketMap.get(user.id).add(socket.id);

  console.log(`${socket.id} connected to "${user.name}" ${user.id}`);
  console.log('🔌 New connection:', userSocketMap);

  // Add friend
  socket.on('add-friend', async (friendIDs: string[]) => {
    console.log(`${user.name} added ${friendIDs} as a friend`);

    try {
      for (const friendID of friendIDs) {
        const [updatedUser, updatedFriend] = await connectUsersToFriends(
          friendID,
          user.id
        );

        const [reshapedUser, reshapedFriend] = [updatedUser, updatedFriend].map(
          user => ({
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
            isDeleted: user.isDeleted,
          })
        );

        const friendsSockets = userSocketMap.get(friendID);
        if (friendsSockets) {
          io.to([...friendsSockets]).emit(
            'added-friend',
            updatedFriend,
            reshapedUser
          );
        }

        const userSockets = userSocketMap.get(user.id);
        if (userSockets) {
          io.to([...userSockets]).emit(
            'added-friend',
            updatedUser,
            reshapedFriend
          );
        }
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      return;
    }
  });

  // Room Invitations
  socket.on('invite-to-room', async (roomID: string, friendIDs: string[]) => {
    console.log(`${user.name} invited ${friendIDs} to room ${roomID}`);

    const { broadcastList, room } = await connectFriendsToRoom(
      friendIDs,
      roomID
    );

    // Emit the event to all sockets of the invited friends
    broadcastList.forEach(friendID => {
      const friendSockets = userSocketMap.get(friendID);

      if (friendSockets) {
        friendSockets.forEach(socketID => {
          io.to(socketID).emit('invited-to-room', room, user);
          // room: room in which the friend is invited
          // user: host who invited the friend
          console.log(`📻 broadcasting to ${friendID} on socket (${socketID})`);
        });
      }
    });

    // Emit the event to the host's sockets as well
    userSocketMap.get(user.id).forEach(socketID => {
      io.to(socketID).emit('invited-to-room', room, user);
    });
  });

  // Room Join Requests
  socket.on('join-room', async (roomIDs: string[]) => {
    // FIXME validate and handle roomIDs: string[]
    // Filter out rooms that the socket is already in
    const roomsToJoin = roomIDs.filter(roomID => {
      const room = io.sockets.adapter.rooms.get(roomID);
      return !room || !room.has(socket.id); // Only join if the socket is not already in the room
    });

    if (roomsToJoin.length > 0) {
      socket.join(roomsToJoin);
      console.log(`${user.name} joined rooms: ${roomsToJoin}`);
    } else {
      console.log(`${user.name} is already in the specified rooms.`);
    }

    socket.on('send-message', async (roomID: string, rawMessage: string) => {
      console.log(`${roomID} | ${user.name}: ${rawMessage}`);
      if (!roomID) return;

      try {
        /***************
         * USER MESSAGE
         **************/
        const newMessage = await prisma.message.create({
          data: {
            content: rawMessage,
            userId: user.id,
            roomId: roomID,
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

        const reshapedMessage = formatPopulatedMessage(newMessage);

        // Emit the reshaped message to all room members
        io.to(roomID).emit('receive-message', reshapedMessage);

        /*************
         * CHAT BOT
         ************/
        // Check if assistant is in the room
        const { Users: roomMembers } = await prisma.room.findFirst({
          where: { id: roomID },
          select: {
            Users: { select: { User: { select: { id: true, name: true } } } },
          },
        });

        const roomHasBot = roomMembers.some(m => m.User.id === 'chat-bot');

        let botResponse = null;

        if (roomHasBot) {
          console.log('Room has Bot');

          const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com/beta',
            apiKey: process.env.DEEPSEEK_API_KEY,
          });

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
            where: { id: user.id },
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
              content: rawMessage,
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

          botResponse = botResponse || '';

          for await (const chunk of stream) {
            if (chunk.choices && chunk.choices.length > 0) {
              console.log(`🚀 ~ forawait ~ chunk.choices:`, chunk.choices);

              const newContent = chunk.choices[0].delta.content;
              botResponse += newContent;
            }
          }

          const botMessage = await prisma.message.create({
            data: {
              content: botResponse,
              userId: 'chat-bot',
              roomId: roomID,
              Readers: { connect: { id: user.id } },
              // FIXME Fix date
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

          io.to(roomID).emit('receive-message', reshapedBotmessage);
        }
      } catch (error) {
        throw error;

        // BUG When trying to send a message in a deleted room

        // send a message to client to delete this room from UI

        // PrismaClientKnownRequestError:
        // Invalid `prisma.message.create()` invocation in
        // C:\Users\panda\projects\ironhack\project-chat-server\src\routes\socket.routes.ts:119:49

        //   116 if (!roomID) return;
        //   117
        //   118 try {
        // → 119   const newMessage = await prisma.message.create(
        // Foreign key constraint violated: `Message_roomId_fkey (index)`
        //     at Wn.handleRequestError (C:\Users\panda\projects\ironhack\project-chat-server\node_modules\@prisma\client\runtime\library.js:121:7534)
        //     at Wn.handleAndLogRequestError (C:\Users\panda\projects\ironhack\project-chat-server\node_modules\@prisma\client\runtime\library.js:121:6858)
        //     at Wn.request (C:\Users\panda\projects\ironhack\project-chat-server\node_modules\@prisma\client\runtime\library.js:121:6565)
        //     at l (C:\Users\panda\projects\ironhack\project-chat-server\node_modules\@prisma\client\runtime\library.js:130:10067)
        // [ERROR] 18:34:40 PrismaClientKnownRequestError:
        // Invalid `prisma.message.create()` invocation in
        // C:\Users\panda\projects\ironhack\project-chat-server\src\routes\socket.routes.ts:119:49

        //   116 if (!roomID) return;
        //   117
        //   118 try {
        // → 119   const newMessage = await prisma.message.create(
        // Foreign key constraint violated: `Message_roomId_fkey (index)`
      }

      // FIXME Add a listener for "writing message"
    });
  });

  socket.on('disconnect', reason => {
    console.log(
      `${socket.id} disconnected from ${user.name}. Reason: ${reason}`
    );

    // Remove the socket ID from the map
    const userSockets = userSocketMap.get(user.id);

    if (userSockets) {
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        userSocketMap.delete(user.id);
      }
    }

    console.log('🔌 Changed connections:', userSocketMap);
  });
}
