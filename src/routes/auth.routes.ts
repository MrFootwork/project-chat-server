import { Router } from 'express';
import { User } from '@prisma/client';

import { cookieClear, cookieSet } from '../config/auth';
import * as auth from '../services/auth.service';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    // TODO Handle duplicate email
    await auth.createUser(req.body);
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body;

    // Validate and narrow down req.body
    if (!usingName(body) && !usingEmail(body)) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Either name or email must be provided along with a password.',
      });
      return;
    }

    // Check if user exists
    let user: User;
    if (usingName(body)) user = await auth.getUserByName(body.name);
    if (usingEmail(body)) user = await auth.getUserByEmail(body.email);
    if (!user) throw Error(`NoUserError`);

    // Check if password matches
    const userPasswordMatches = await auth.checkPasswordMatch(
      body.password,
      user.id
    );

    if (!userPasswordMatches) throw Error(`WrongPasswordError`);

    // Create and respond with JWT
    const token = await auth.createJWTFromUser(user);
    res.cookie('bearer', token, cookieSet);
    res.status(200).json({ jwt: token });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_, res) => {
  res.clearCookie('bearer', cookieClear);
  res.status(200).json({ message: 'Succesfully logged out.' });
});

// router.get('/refresh-token', async (req, res, next) => {
//   try {
//     if (!(req.token || req.userId)) {
//       throw Error(
//         `The route "${req.originalUrl}" requires a valid token. 🍪🍪🍪`,
//         { cause: 'no-cookie' }
//       );
//     }

//     const user = await getUserById(req.userId);
//     const token = await createJWTFromUser(user);

//     res.cookie('bearer', token, cookieOptions.set);
//     res.status(200).json({ jwt: token });
//     return;
//   } catch (error) {
//     next(error);
//   }
// });

// Type guard to check if req.body is InputUserLogin with name
function usingName(body: any): body is { name: string; password: string } {
  return typeof body.name === 'string' && typeof body.password === 'string';
}

// Type guard to check if req.body is InputUserLogin with email
function usingEmail(body: any): body is { email: string; password: string } {
  return typeof body.email === 'string' && typeof body.password === 'string';
}

export default router;
