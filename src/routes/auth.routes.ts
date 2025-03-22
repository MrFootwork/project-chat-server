import { Router } from 'express';
import * as auth from '../services/auth.service';
import { cookieSet } from '../config/auth';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    console.log(req.body);
    // TODO Handle duplicate email
    await auth.createUser(req.body);
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await auth.getUserByEmail(req.body.email);
    if (!user) throw Error(`NoEmailError`);

    const userPasswordMatches = await auth.checkPasswordMatch(
      req.body.password,
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

export default router;
