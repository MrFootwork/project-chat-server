import { MessageDB, MessageFormatted } from '../types/messages';
import { RoomFormatted, RoomDB } from '../types/rooms';
import { RoomMember } from '../types/users';

import { Prisma } from '@prisma/client';
import prisma from '../db';
import { roomIncludePopulated } from '../routes/rooms.routes';
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
        avatarUrl: userRelation.User.avatarUrl,
        isDeleted: userRelation.User.isDeleted,
        isAdmin: userRelation.isAdmin,
        userLeft: userRelation.userLeft,
      })),
      messages: Messages.map(message =>
        formatPopulatedMessage(message)
      ).reverse(), // reorder messages
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
    deleted: message.deleted,
    readers: reshapeReaders(message.Readers),
    roomId: message.roomId,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    author: {
      id: message.User.id,
      name: message.User.name,
      avatarUrl: message.User.avatarUrl,
      isDeleted: message.User.isDeleted,
    },
  };
}

export async function connectFriendsToRoom(
  friendIDs: string[],
  roomID: string
): Promise<{ addedMembers: RoomMember[]; room: RoomFormatted }> {
  // Prepare the data for createMany
  const roomConfigData = friendIDs.map(friendID => ({
    userId: friendID,
    roomId: roomID,
    isAdmin: false,
    userLeft: false,
  }));

  try {
    // Update existing records where userLeft is true
    await prisma.roomConfig.updateMany({
      where: {
        userId: { in: friendIDs },
        roomId: roomID,
        userLeft: true,
      },
      data: {
        userLeft: false,
      },
    });

    // Create new records for users entering this room for their first time
    await prisma.roomConfig.createManyAndReturn({
      data: roomConfigData,
      skipDuplicates: true,
    });

    // Fetch updated room
    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomID },
      include: roomIncludePopulated,
    });

    const formattedRooms = formatPopulatedRooms([updatedRoom]);

    const addedMembers = formattedRooms[0].members.filter(m =>
      friendIDs.includes(m.id)
    );

    return { addedMembers, room: formattedRooms[0] };
  } catch (error) {
    throw error;
  }
}

export async function disconnectFriendsFromRoom(
  friendIDs: string[],
  roomID: string
): Promise<{ broadcastList: string[]; room: RoomFormatted }> {
  const broadcastList: string[] = [];

  try {
    await prisma.roomConfig.updateManyAndReturn({
      where: {
        userId: { in: friendIDs },
        roomId: roomID,
      },
      data: { userLeft: true },
    });

    friendIDs.forEach(friendID => broadcastList.push(friendID));

    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomID },
      include: roomIncludePopulated,
    });

    const formattedRooms = formatPopulatedRooms([updatedRoom]);

    return { broadcastList, room: formattedRooms[0] };
  } catch (error) {
    throw error;
  }
}
