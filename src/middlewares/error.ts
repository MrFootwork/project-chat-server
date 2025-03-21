import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Application, Request, Response, NextFunction } from 'express';

// const errorMiddleware = (app: Application) => {
//   // Error handler
//   app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//     // whenever you call next(err), this middleware will handle the error
//     // always logs the error
//     console.error('ERROR', req.method, req.path, err);

//     // Handle Prisma errors
//     if (err instanceof PrismaClientKnownRequestError) {
//       if (err.code === 'P2002') {
//         // Handle unique constraint violation
//         return res.status(409).json({
//           message: 'A record with this field already exists.',
//           target: err.meta?.target, // Optional: Include the target field(s)
//         });
//       }
//     }

//     // Other errors
//     if (!res.headersSent) {
//       res.status(500).json({
//         message: 'Internal server error. Check the server console',
//       });
//     }
//   });

//   // 404 handler
//   app.use((req, res) => {
//     // this middleware runs whenever requested page is not available
//     res.status(404).json({
//       message:
//         'This route does not exist, you should probably look at your URL or what your backend is expecting',
//     });
//   });
// };

// Error-handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  console.error('ERROR', req.method, req.path, err);

  // Handle Prisma-specific errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Handle unique constraint violation
      res.status(409).json({
        error: 'duplicate email',
        message: `A record with this field already exists.`,
        target: err.meta?.target, // Optional: Include the target field(s)
      });

      return;
    }

    res.status(500).json({
      message: 'Unhandled Prisma error. Check the server console',
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
