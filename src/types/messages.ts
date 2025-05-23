import { MessageAuthor } from './users';

export type MessageDB = {
  id: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  userId: string;
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
  Readers?: MessageAuthor[];
  User?: MessageAuthor;
};

export type MessageFormatted = {
  id: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  readers: MessageAuthor[];
  roomId: string;
  createdAt: Date;
  updatedAt: Date;
  author: MessageAuthor;
};
