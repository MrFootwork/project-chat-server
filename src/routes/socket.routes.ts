import { Server, Socket } from 'socket.io';
import prisma from '../db';
import {
  connectFriendsToRoom,
  formatPopulatedMessage,
} from '../services/rooms.service';

const userSocketMap = new Map<string, Set<string>>();

export default async function connectionHandler(socket: Socket, io: Server) {
  const user = socket.handshake.auth.user;

  // Add socket ID to the map for the user
  if (!userSocketMap.has(user.id)) {
    userSocketMap.set(user.id, new Set());
  }
  userSocketMap.get(user.id).add(socket.id);

  console.log(`${socket.id} connected to "${user.name}" ${user.id}`);
  console.log('SOCKET MAP:', userSocketMap);

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

    // Remove the socket ID from the map
    const userSockets = userSocketMap.get(user.id);

    if (userSockets) {
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        userSocketMap.delete(user.id);
      }
    }

    console.log('SOCKET MAP ~ after disconnect:', userSocketMap);
  });
}
