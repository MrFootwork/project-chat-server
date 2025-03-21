import { NextFunction, RequestHandler, Response } from 'express';
import { RequestToken } from '../types/requests';

function checkProtection(req: Request, res: Response, next: NextFunction) {
  const typedReq = req as unknown as RequestToken;

  if (!typedReq.token)
    return res
      .status(401)
      .json({ message: 'You need to log in to access this route' });

  next();
}

export default checkProtection as unknown as RequestHandler;
