import { Router } from 'express';
import usersRoutes from './users.routes';

const router = Router();

router.use('/users', usersRoutes);

router.get('/', (_, res) => {
  res.json('All good in here');
});

export default router;
