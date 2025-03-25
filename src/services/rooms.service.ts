import { FormattedRoom, PopulatedRoom } from '../types/rooms';

/**
 * Transforms an array of populated room objects from the database into a more readable format.
 *
 * Each room object includes its basic properties, a list of members, and a list of messages.
 * - Members are derived from the `Users` relation and include user details such as ID, name, avatar URL, and admin status.
 * - Messages are derived from the `Messages` relation and include message details such as ID, content, timestamps, and the associated user.
 *
 * @param {PopulatedRoom[]} rooms - An array of populated room objects retrieved from the database.
 * @returns {FormattedRoom[]} An array of formatted room objects with simplified structure.
 */
export function formatPopulatedRooms(rooms: PopulatedRoom[]): FormattedRoom[] {
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
        avatarUrl: userRelation.User.avatarUrl || '',
        isAdmin: userRelation.isAdmin,
        userLeft: userRelation.userLeft,
      })),
      messages: Messages.map(message => ({
        id: message.id,
        content: message.content,
        edited: message.edited,
        readBy: message.readBy,
        roomId: message.roomId,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        user: {
          id: message.User.id,
          name: message.User.name,
          avatarUrl: message.User.avatarUrl || '',
        },
      })),
    })
  );
}
