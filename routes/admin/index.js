import express from 'express';
import { auth } from '../../middlewares/auth.js';
import { isAdmin } from '../../middlewares/isAdmin.js';
import tasksRouter from './tasks.js';

const router = express.Router();

router.use('/tasks', tasksRouter);

export default router; 