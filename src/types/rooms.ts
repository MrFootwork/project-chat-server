export type PopulatedRoom = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  Users: {
    isAdmin: boolean;
    userLeft: boolean;
    User: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
  Messages: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    User: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
};

export type FormattedRoom = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  members: {
    id: string;
    name: string;
    avatarUrl: string;
    isAdmin: boolean;
    userLeft: boolean;
  }[];
  messages: {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
};
