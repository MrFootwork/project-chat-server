export type UserDB = {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  friends: MessageAuthor[];
};

export type RoomMember = Omit<
  UserDB,
  'password' | 'createdAt' | 'updatedAt' | 'friends'
> & {
  isAdmin: boolean;
  userLeft: boolean;
};

export type MessageAuthor = Pick<
  RoomMember,
  'id' | 'name' | 'avatarUrl' | 'isDeleted'
>;
