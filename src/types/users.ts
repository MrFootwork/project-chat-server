export type UserDB = {
  id: string;
  name: string;
  email: string;
  password: string; //FIXME Default to never fetch user passwords
  avatarUrl: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomMember = Omit<
  UserDB,
  'password' | 'createdAt' | 'updatedAt'
> & {
  avatarUrl: string;
  isAdmin: boolean;
  userLeft: boolean;
};

export type MessageAuthor = Pick<
  RoomMember,
  'id' | 'name' | 'avatarUrl' | 'isDeleted'
>;
