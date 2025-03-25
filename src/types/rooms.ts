import { MessageAuthor, RoomMember, UserDB } from './users';

export type PopulatedRoom = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  Users: {
    isAdmin: boolean;
    userLeft: boolean;
    User: Omit<UserDB, 'password'>;
  }[];
  Messages: {
    id: string;
    content: string;
    edited: boolean;
    readBy: UserDB[];
    roomId: string;
    createdAt: string;
    updatedAt: string;
    User: {
      id: string;
      name: string;
      avatarUrl: string;
      isDeleted: boolean;
    };
  }[];
};

export type FormattedRoom = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  members: RoomMember[];
  messages: {
    id: string;
    content: string;
    edited: boolean;
    readBy: MessageAuthor[];
    roomId: string;
    createdAt: string;
    updatedAt: string;
    author: MessageAuthor;
  }[];
};
