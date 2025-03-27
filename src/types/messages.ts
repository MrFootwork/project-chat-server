import { MessageAuthor, UserDB } from './users';

export type MessageDB = {
  id: string;
  content: string;
  edited: boolean;
  Readers: UserDB[];
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
  User: MessageAuthor;
};

export type MessageFormatted = {
  id: string;
  content: string;
  edited: boolean;
  readers: MessageAuthor[];
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
  author: MessageAuthor;
};
