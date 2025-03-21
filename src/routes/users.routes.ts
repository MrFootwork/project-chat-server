import { Router } from 'express';
import prisma from '../db';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const newUser = await prisma.user.create({ data: req.body });
    console.log('New user:', newUser);
    res.json(newUser);
  } catch (error) {
    console.log(error);
    res.json(`Something went wrong, ${error}`);
    return;
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.log(error);
    res.json('Something went wrong');
    return;
  }
});

export default router;
