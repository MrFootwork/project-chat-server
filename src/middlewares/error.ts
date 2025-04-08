import { Request, Response, NextFunction } from 'express';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from '@prisma/client/runtime/library';
import { JsonWebTokenError } from 'jsonwebtoken';

// Error-handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  console.error('❌ ERROR', req.method, req.path, err);

  // Auth
  if (err.message === 'NoUserError' || err.message === 'WrongPasswordError') {
    res.status(401).json({
      error: 'wrong_credentials',
      message: '🔐🔐 Wrong Credentials 🙅‍♂️🙅‍♀️',
    });

    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      error: 'token_error',
      message: '🔐🔐 Token is invalid 🙅‍♂️🙅‍♀️',
    });

    return;
  }

  // Handle Prisma-specific errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2025' && err.meta.modelName === 'User') {
      const friendIDMatch = req.path.match(/\/friends\/([^/]+)/);
      const friendID = friendIDMatch ? friendIDMatch[1] : null;

      res.status(404).json({
        error: 'user_not_found',
        message: `The user (friend) with the specified ID '${friendID}' does not exist. 🤷🏻`,
      });

      return;
    }

    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'duplicate_record',
        message: `A record with the specified ${
          (err.meta?.target as string[]).join(', ') || 'field(s)'
        } already exists. Please use a different value.`,
        target: err.meta?.target,
      });

      return;
    }

    res.status(500).json({
      message: 'Unhandled Prisma error. Check the server console',
    });

    return;
  }

  // No Database Connection
  if (err instanceof PrismaClientInitializationError) {
    res.status(500).json({
      error: 'database_connection_error',
      message:
        'Unable to connect to the database. Please check your database connection string, environment variables, and server logs for more details.',
    });

    return;
  }

  // Handle other errors
  if (!res.headersSent) {
    res.status(500).json({
      message: 'Internal server error. Check the server console',
    });
  }
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message:
      'This route does not exist, you should probably look at your URL or what your backend is expecting',
  });
};
