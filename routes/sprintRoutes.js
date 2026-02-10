import express from 'express';
import { body } from 'express-validator';
import {
  getSprints,
  getSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  getSprintStats,
  getSprintTasks
} from '../controllers/sprintController.js';
import { protect, isProjectManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const createSprintValidation = [
  body('name').trim().notEmpty().withMessage('Sprint name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
];

// All routes are protected
router.use(protect);

// Sprint-specific routes
router.route('/:id')
  .get(getSprint)
  .put(isProjectManager, updateSprint)
  .delete(isProjectManager, deleteSprint);

router.get('/:id/stats', getSprintStats);
router.get('/:id/tasks', getSprintTasks);

// Project-specific sprint routes
router.route('/project/:projectId')
  .get(getSprints)
  .post(isProjectManager, createSprintValidation, validate, createSprint);

export default router;
