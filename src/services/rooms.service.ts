import { Prisma } from '@prisma/client';
import { MessageDB, MessageFormatted } from '../types/messages';
import { RoomFormatted, RoomDB } from '../types/rooms';
import { reshapeReaders } from './users.service';

/**
 * Transforms an array of populated room objects from the database into a more readable format.
 *
 * Each room object includes its basic properties, a list of members, and a list of messages.
 * - Members are derived from the `Users` relation and include user details such as ID, name, avatar URL, and admin status.
 * - Messages are derived from the `Messages` relation and include message details such as ID, content, timestamps, and the associated user.
 *
 * @param {Awaited<Prisma.PrismaPromise<RoomDB[]>>} rooms - An array of populated room objects retrieved from the database.
 * @returns {RoomFormatted[]} An array of formatted room objects with simplified structure.
 */
// export function formatPopulatedRooms(rooms: RoomDB[]): RoomFormatted[] {
export function formatPopulatedRooms(
  rooms: Awaited<Prisma.PrismaPromise<RoomDB[]>>
): RoomFormatted[] {
  return rooms.map(
    ({ Users, Messages, id, name, createdAt, updatedAt, isPrivate }) => ({
      id,
      name,
      createdAt,
      updatedAt,
      isPrivate,
      members: Users.map(userRelation => ({
        id: userRelation.User.id,
        name: userRelation.User.name,
        email: userRelation.User.email,
        avatarUrl: userRelation.User.avatarUrl || '',
        isDeleted: userRelation.User.isDeleted,
        isAdmin: userRelation.isAdmin,
        userLeft: userRelation.userLeft,
      })),
      messages: Messages.map(message => formatPopulatedMessage(message)),
    })
  );
}

/**
 * Transforms a single populated message object from the database into a more readable format.
 *
 * The formatted message includes its basic properties, such as ID, content, timestamps, and the associated room ID.
 * It also includes the author details (user who created the message) and a list of readers.
 * - Author details include user ID, name, avatar URL, and deletion status.
 * - Readers are reshaped using the `reshapeReaders` utility function.
 *
 * @param {Awaited<Prisma.PrismaPromise<MessageDB>>} message - A populated message object retrieved from the database.
 * @returns {MessageFormatted} A formatted message object with a simplified structure.
 */
export function formatPopulatedMessage(
  message: Awaited<Prisma.PrismaPromise<MessageDB>>
): MessageFormatted {
  return {
    id: message.id,
    content: message.content,
    edited: message.edited,
    readers: reshapeReaders(message.Readers),
    roomId: message.roomId,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    author: {
      id: message.User.id,
      name: message.User.name,
      avatarUrl: message.User.avatarUrl || '',
      isDeleted: message.User.isDeleted,
    },
  };
}
