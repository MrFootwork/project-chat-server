import { Prisma } from '.prisma/client';
import { MessageAuthor } from '../types/users';
import prisma from '../db';

/**
 * Transforms an array of user objects from the database format into a simplified format
 * suitable for use as message authors.
 *
 * @param {Awaited<Prisma.PrismaPromise<MessageAuthor[]>>} users - An array of user objects from the database.
 * @returns {MessageAuthor[]} An array of message author objects with selected properties.
 */
export function reshapeReaders(
  users: Awaited<Prisma.PrismaPromise<MessageAuthor[]>>
  // users: UserDB[] | MessageAuthor[]
): MessageAuthor[] {
  return users.map(user => ({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || '',
    isDeleted: user.isDeleted,
  }));
}

export async function connectUsersToFriends(friendID: string, userID: string) {
  try {
    await prisma.user.update({
      where: { id: userID },
      data: {
        friends: {
          connect: { id: friendID },
        },
      },
    });

    const newFriend = await prisma.user.update({
      where: { id: friendID },
      data: {
        friends: {
          connect: { id: userID },
        },
      },
    });

    console.log(`🚀 ~ connectUsersToFriends ~ newFriend:`, newFriend);

    const reshapedFriend = reshapeReaders([newFriend]);

    return reshapedFriend[0];
  } catch (error) {
    throw error;
  }
}
