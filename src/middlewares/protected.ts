import { NextFunction, RequestHandler, Response } from 'express';
import { RequestToken } from '../types/requests';

function isProtected(req: Request, res: Response, next: NextFunction) {
  const typedReq = req as unknown as RequestToken;

  if (!typedReq.token)
    return res
      .status(401)
      .json({ message: 'You need to be logged in to access this route' });

  next();
}

export default isProtected as unknown as RequestHandler;
