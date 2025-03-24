import { ExtendedError, Server, Socket } from 'socket.io';
import { getUserFromJWT } from './auth.service';

export async function extendSocketByUser(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  try {
    // Client uses auth, Postman uses headers
    const token = socket.handshake.auth.token || socket.handshake.headers.token;

    if (!token) return;

    const user = await getUserFromJWT(token);
    socket.handshake.auth.user = user;

    next();
  } catch (error) {
    console.error(`Not authorized: ${error}`);
    next(error);
  }
}

export async function connectionHandler(socket: Socket, io: Server) {
  const user = socket.handshake.auth.user;
  console.log(`${socket.id} connected to ${user.name}`);

  socket.on('send-message', message => {
    console.log(`${user.name}: ${message}`);
    socket.broadcast.emit('receive-message', user.name, message);
  });

  socket.on('disconnect', reason => {
    console.log(
      `${socket.id} disconnected from ${user.name}. Reason: ${reason}`
    );
  });
}
