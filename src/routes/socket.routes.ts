import { Server, Socket } from 'socket.io';

export default async function connectionHandler(socket: Socket, io: Server) {
  const user = socket.handshake.auth.user;
  console.log(`${socket.id} connected to ${user.name}`);

  socket.on('join-room', (roomIDs: string[]) => {
    socket.join(roomIDs);
    console.log(`${user.name} joined rooms: ${roomIDs}`);

    socket.on('send-message', (roomID, message) => {
      console.log(`${roomID} | ${user.name}: ${message}`);
      if (!roomID) return;

      socket.to(roomID).emit('receive-message', user.name, message);
      // FIXME persist message to database
    });
  });

  socket.on('disconnect', reason => {
    console.log(
      `${socket.id} disconnected from ${user.name}. Reason: ${reason}`
    );
  });
}
