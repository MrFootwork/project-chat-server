import { Response, NextFunction } from 'express';
import { RequestToken } from '../types/requests';
// const jwt = require('jsonwebtoken');
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

// Adds token and userId to request, if cookie or authorization header is provided
function authMiddleware(
  req: RequestToken,
  res: Response,
  next: NextFunction
): void {
  let token = null;
  let userId = null;

  try {
    //Check for cookies first because they are the lower priority
    if (req.cookies['bearer']) {
      token = req.cookies['bearer'];
      // console.log('🍪 Found Token in cookies ', token);
    }

    // Then we check for the auth header
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const splitHeader = authHeader.split(' ');

      if (splitHeader[0] === 'Bearer' && splitHeader[1]) {
        token = splitHeader[1];
        // console.log('🍪 Header ', authHeader, splitHeader);
        // console.log('🍪 Found Token in header ', token);
      }
    }

    // The header token takes presedence over the cookie token, if both exist.
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      userId = decoded.id;
    }

    req.token = token;
    req.userId = userId;

    next();
  } catch (error) {
    next(error);
  }
}

export default authMiddleware;
