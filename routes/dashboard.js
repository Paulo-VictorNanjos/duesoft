import express from 'express';
import auth from '../middlewares/auth.js';
import { checkPlanAccess } from '../middlewares/planAccess.js';
import DashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/', auth, checkPlanAccess('dashboard'), DashboardController.index);

export default router;