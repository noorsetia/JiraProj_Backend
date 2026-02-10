import express from 'express';
import { body } from 'express-validator';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProjectStats
} from '../controllers/projectController.js';
import { protect, isProjectManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const createProjectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').trim().notEmpty().withMessage('Project description is required'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date')
];

const addMemberValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('role')
    .optional()
    .isIn(['Project Manager', 'Team Member'])
    .withMessage('Invalid role')
];

// All routes are protected
router.use(protect);

router.route('/')
  .get(getProjects)
  .post(isProjectManager, createProjectValidation, validate, createProject);

router.route('/:id')
  .get(getProject)
  .put(isProjectManager, updateProject)
  .delete(isProjectManager, deleteProject);

router.route('/:id/members')
  .post(isProjectManager, addMemberValidation, validate, addMember);

router.route('/:id/members/:userId')
  .delete(isProjectManager, removeMember);

router.get('/:id/stats', getProjectStats);

export default router;
