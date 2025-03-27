import { MessageAuthor, UserDB } from '../types/users';

/**
 * Transforms an array of user objects from the database format into a simplified format
 * suitable for use as message authors.
 *
 * @param {UserDB[]} users - An array of user objects from the database.
 * @returns {MessageAuthor[]} An array of message author objects with selected properties.
 */
export function reshapeReaders(users: UserDB[]): MessageAuthor[] {
  return users.map(user => ({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || '',
    isDeleted: user.isDeleted,
  }));
}
