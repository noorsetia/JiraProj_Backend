import express from 'express';
import { body } from 'express-validator';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  getMyTasks,
  bulkUpdatePositions
} from '../controllers/taskController.js';
import { protect, isProjectManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('description').trim().notEmpty().withMessage('Task description is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority')
];

const addCommentValidation = [
  body('text').trim().notEmpty().withMessage('Comment text is required')
];

// All routes are protected
router.use(protect);

// Get my tasks
router.get('/my-tasks', getMyTasks);

// Bulk update positions
router.patch('/bulk-update-positions', bulkUpdatePositions);

// Task-specific routes (not under project)
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(isProjectManager, deleteTask);

router.patch('/:id/status', updateTaskStatus);
router.post('/:id/comments', addCommentValidation, validate, addComment);

// Project-specific task routes
router.route('/project/:projectId')
  .get(getTasks)
  .post(isProjectManager, createTaskValidation, validate, createTask);

export default router;
