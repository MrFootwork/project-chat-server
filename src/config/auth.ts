import { CookieOptions } from 'express';

const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  // sameSite: 'None',
  secure: true,
  partitioned: true,
};

export const cookieSet: CookieOptions = {
  ...baseOptions,
  maxAge: 1000 * 60 * 60 * 12,
};

export const cookieClear: CookieOptions = {
  ...baseOptions,
};
