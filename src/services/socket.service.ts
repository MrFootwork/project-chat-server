import { ExtendedError, Socket } from 'socket.io';
import { getUserFromJWT } from './auth.service';

export async function validateToken(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  try {
    // Client uses auth, Postman uses headers
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    if (!token) throw new Error('Provide a token!');

    const user = await getUserFromJWT(token);
    if (!user) throw new Error('Token cannot be matched to a user.');

    socket.handshake.auth.user = user;

    next();
  } catch (error) {
    console.error(`Not authorized: ${error}`);
    next(error);
  }
}
