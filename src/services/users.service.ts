import { MessageAuthor, UserDB } from '../types/users';

export function reshapeReadByField(users: UserDB[]): MessageAuthor[] {
  return users.map(user => ({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || '',
    isDeleted: user.isDeleted,
  }));
}
