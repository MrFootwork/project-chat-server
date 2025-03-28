import { Prisma } from '.prisma/client';
import { MessageAuthor, UserDB } from '../types/users';

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
