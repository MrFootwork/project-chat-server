import { Router } from 'express';
import usersRoutes from './users.routes';
import roomsRoutes from './rooms.routes';

const router = Router();

router.use('/users', usersRoutes);
router.use('/rooms', roomsRoutes);

router.get('/', (_, res) => {
  res.json('All good in here');
});

export default router;
