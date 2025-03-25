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

    socket.on('send-message', async (roomID: string, rawMessage: string) => {
      console.log(`${roomID} | ${user.name}: ${rawMessage}`);
      if (!roomID) return;

      const newMessage = await prisma.message.create({
        data: {
          content: rawMessage,
          userId: user.id,
          roomId: roomID,
          readBy: { set: [user.id] },
        },
        include: {
          User: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Reshape the response to include additional data
      const reshapedMessage = {
        id: newMessage.id,
        content: newMessage.content,
        edited: newMessage.edited,
        readBy: newMessage.readBy,
        roomId: newMessage.roomId,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt,
        user: {
          id: newMessage.User.id,
          name: newMessage.User.name,
          avatarUrl: newMessage.User.avatarUrl || '',
        },
      };

      // Emit the reshaped message to all room members
      io.to(roomID).emit('receive-message', reshapedMessage);
    });
  });

  socket.on('disconnect', reason => {
    console.log(
      `${socket.id} disconnected from ${user.name}. Reason: ${reason}`
    );
  });
}
