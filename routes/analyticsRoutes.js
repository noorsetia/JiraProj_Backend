import express from 'express';
import {
  getDashboardAnalytics,
  getProjectAnalytics,
  getTeamPerformance
} from '../controllers/analyticsController.js';
import { getAnalytics } from '../controllers/analyticsController_new.js';
import { protect, isProjectManager } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getAnalytics);
router.get('/dashboard', getDashboardAnalytics);
router.get('/project/:projectId', getProjectAnalytics);
router.get('/team-performance/:projectId', isProjectManager, getTeamPerformance);

export default router;
