import { MessageDB, MessageFormatted } from './messages';
import { RoomMember, UserDB } from './users';

export type RoomDB = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  Users: {
    isAdmin: boolean;
    userLeft: boolean;
    User?: Omit<UserDB, 'password'>;
    id: string;
    userId: string;
    roomId: string;
  }[];
  Messages: MessageDB[];
};

export type RoomFormatted = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  members: RoomMember[];
  messages: MessageFormatted[];
};
