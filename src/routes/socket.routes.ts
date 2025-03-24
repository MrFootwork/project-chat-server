import { Server, Socket } from 'socket.io';
import prisma from '../db';

export default async function connectionHandler(socket: Socket, io: Server) {
  const user = socket.handshake.auth.user;
  console.log(`${socket.id} connected to "${user.name}" ${user.id}`);

  socket.on('join-room', (roomIDs: string[]) => {
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

    socket.on('send-message', async (roomID: string, message: string) => {
      console.log(`${roomID} | ${user.name}: ${message}`);
      if (!roomID) return;

      // FIXME persist message to database
      // And send messages after fetched from database
      // To ensure messages to clients have complete data

      const newMessage = await prisma.message.create({
        data: {
          content: message,
          userId: user.id,
          roomId: roomID,
        },
      });

      console.log(`🚀 ~ socket.on ~ newMessage:`, newMessage);

      socket.to(roomID).emit('receive-message', user.name, message);
    });
  });

  socket.on('disconnect', reason => {
    console.log(
      `${socket.id} disconnected from ${user.name}. Reason: ${reason}`
    );
  });
}
