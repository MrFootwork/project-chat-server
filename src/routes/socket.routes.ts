import { Server, Socket } from 'socket.io';
import prisma from '../db';
import { formatPopulatedMessage } from '../services/rooms.service';

const userSocketMap = new Map<string, string>(); // Map of userId -> Set of socketIds

export default async function connectionHandler(socket: Socket, io: Server) {
  const user = socket.handshake.auth.user;

  userSocketMap.set(user.id, socket.id);

  console.log(`${socket.id} connected to "${user.name}" ${user.id}`);
  console.log('SOCKET MAP:', userSocketMap);

  // Room Invitations
  socket.on('invite-to-room', (roomID: string, friendIDs: string[]) => {
    console.log(`${user.name} invited ${friendIDs} to room ${roomID}`);

    // Emit the event to all sockets of the invited friends
    friendIDs.forEach(friendID => {
      const friendSocketID = userSocketMap.get(friendID);

      if (!friendSocketID) return;

      io.to(friendSocketID).emit('invited-to-room', roomID, user);

      // FIXME Connect friends to the room
    });
  });

  // Room Join Requests
  socket.on('join-room', (roomIDs: string[]) => {
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
            select: { id: true, name: true, avatarUrl: true, isDeleted: true },
          },
        },
      });

      const reshapedMessage = formatPopulatedMessage(newMessage);

      // Emit the reshaped message to all room members
      io.to(roomID).emit('receive-message', reshapedMessage);

      // FIXME Add a listener for "writing message"
    });
  });

  socket.on('disconnect', reason => {
    console.log(
      `${socket.id} disconnected from ${user.name}. Reason: ${reason}`
    );

    userSocketMap.delete(user.id);
    console.log('SOCKET MAP ~ after disconnect:', userSocketMap);
  });
}
