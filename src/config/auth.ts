import { CookieOptions } from 'express';

export const cookieSet: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  // sameSite: 'None',
  secure: true,
  partitioned: true,
  maxAge: 1000 * 60 * 60 * 12,
};

export const cookieClear: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  // sameSite: 'None',
  secure: true,
  partitioned: true,
};
