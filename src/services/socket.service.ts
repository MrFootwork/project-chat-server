import { ExtendedError, Socket } from 'socket.io';
import { getUserFromJWT } from './auth.service';

export async function extendSocketByUser(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    const user = await getUserFromJWT(token);
    socket.data.user = user;
    next();
  } catch (error) {
    const err = new Error('not authorized');
    console.error('Not authorized');
    next(err);
  }
}

export function connectionHandler(socket: Socket) {
  console.log('Socket connected', socket.data.user.name);
  socket.emit('hello', 'world');
}
