export type InputUserSignup = {
  name: string;
  email: string;
  password: string;
};

export type InputUserLogin = (
  | { name: string; email?: never }
  | { email: string; name?: never }
) & {
  password: string;
};
