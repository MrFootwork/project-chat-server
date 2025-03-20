import { Router } from 'express';

const router: Router = require('express').Router();

router.get('/', (req, res) => {
  res.json('All good in here');
});

module.exports = router;
