import { Router } from 'express';
import * as auth from '../services/auth.service';
import { cookieSet } from '../config/auth';
import { User } from '@prisma/client';

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
    console.log(`🚀 ~ router.post ~ body:`, body);

    // Validate and narrow down req.body
    if (!isLoginWithName(body) && !isLoginWithEmail(body)) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Either name or email must be provided along with a password.',
      });
      return;
    }

    console.log(
      `🚀 ~ router.post ~ isLoginWithName(body):`,
      isLoginWithName(body)
    );
    console.log(
      `🚀 ~ router.post ~ isLoginWithEmail(body):`,
      isLoginWithEmail(body)
    );

    // Check if user exists
    let user: User;
    if (isLoginWithName(body)) user = await auth.getUserByName(body.name);
    if (isLoginWithEmail(body)) user = await auth.getUserByEmail(body.email);
    console.log(`🚀 ~ router.post ~ user:`, user);
    if (!user) throw Error(`NoUserError`);

    // Check if password matches
    const userPasswordMatches = await auth.checkPasswordMatch(
      body.password,
      user.id
    );
    console.log(`🚀 ~ router.post ~ userPasswordMatches:`, userPasswordMatches);
    if (!userPasswordMatches) throw Error(`WrongPasswordError`);

    // Create and respond with JWT
    const token = await auth.createJWTFromUser(user);
    res.cookie('bearer', token, cookieSet);
    res.status(200).json({ jwt: token });
  } catch (error) {
    next(error);
  }
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
function isLoginWithName(
  body: any
): body is { name: string; password: string } {
  return typeof body.name === 'string' && typeof body.password === 'string';
}

// Type guard to check if req.body is InputUserLogin with email
function isLoginWithEmail(
  body: any
): body is { email: string; password: string } {
  return typeof body.email === 'string' && typeof body.password === 'string';
}

export default router;
