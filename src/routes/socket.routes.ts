import prisma from '../db';

import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';

import {
  connectFriendsToRoom,
  disconnectFriendsFromRoom,
  formatPopulatedMessage,
} from '../services/rooms.service';
import { connectUsersToFriends } from '../services/users.service';
import handleDeepSeekResponse from '../services/deepseek.service';
import handleOpenAIResponse from '../services/openAI.service';
import handleOpenAIImage from '../services/openAIImage.service';

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

    const { Users: oldMembers } = await prisma.room.findFirst({
      where: { id: roomID },
      select: { Users: { select: { userId: true, userLeft: true } } },
    });

    const { addedMembers, room } = await connectFriendsToRoom(
      friendIDs,
      roomID
    );

    // Send to all existing room members, also one who left
    io.to(roomID).emit('invited-to-room', room, addedMembers);

    // Send to all friends entering their first time
    friendIDs.forEach(friendID => {
      const friendSockets = userSocketMap.get(friendID);
      const isReEntering = oldMembers.some(m => m.userId === friendID);

      if (friendSockets && !isReEntering) {
        friendSockets.forEach(socketID => {
          io.to(socketID).emit('invited-to-room', room, addedMembers);
          // room: room in which the friend is invited
          // user: host who invited the friend
          console.log(`📻 broadcasting to ${friendID} on socket (${socketID})`);
        });
      }
    });
  });

  // Room Member Removal
  socket.on('remove-from-room', async (roomID: string, friendIDs: string[]) => {
    console.log(`${user.name} removed ${friendIDs} from room ${roomID}`);

    const { broadcastList, room } = await disconnectFriendsFromRoom(
      friendIDs,
      roomID
    );

    // Emit event to all room members clients for updates
    io.to(roomID).emit('removed-from-room', room, friendIDs);

    // Emit the event to all sockets of the invited friends
    // broadcastList.forEach(friendID => {
    //   const friendSockets = userSocketMap.get(friendID);

    //   if (friendSockets) {
    //     friendSockets.forEach(socketID => {
    //       io.to(socketID).emit('removed-from-room', room, friendID);
    //       // room: room in which the friend is removed from
    //       // user: host who removed the friend
    //       console.log(`📻 broadcasting to ${friendID} on socket (${socketID})`);
    //     });
    //   }
    // });

    // Emit the event to the host's sockets as well
    // userSocketMap.get(user.id).forEach(socketID => {
    //   io.to(socketID).emit('removed-from-room', room, user);
    // });
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
        const botsRoomConfig = await prisma.roomConfig.findFirst({
          where: { roomId: roomID, userId: 'chat-bot' },
        });

        const roomHasActiveBot = !botsRoomConfig
          ? false
          : !botsRoomConfig?.userLeft;

        if (roomHasActiveBot) {
          // await handleDeepSeekResponse(io, user, roomID, rawMessage);
          await handleOpenAIResponse(io, user, roomID, rawMessage);
          // await handleOpenAIImage(io, user, roomID, rawMessage);
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

  socket.on('connect_error', err => handleErrors(err));
  socket.on('connect_failed', err => handleErrors(err));
  socket.on('disconnect', err => handleErrors(err));

  function handleErrors(err: Error | string) {
    console.error(err);
    console.log('BLABLABLA');
  }
}
