export type UserDB = {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomMember = Omit<
  UserDB,
  'password' | 'createdAt' | 'updatedAt'
> & {
  isAdmin: boolean;
  userLeft: boolean;
};

export type MessageAuthor = Pick<
  RoomMember,
  'id' | 'name' | 'avatarUrl' | 'isDeleted'
>;
