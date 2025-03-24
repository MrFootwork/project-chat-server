export type PopulatedRoom = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  private: boolean;
  Users: {
    isAdmin: boolean;
    User: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  }[];
  Messages: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    User: {
      id: string;
      name: string;
      avatarUrl: string;
    };
    content: string;
  }[];
};
