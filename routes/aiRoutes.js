import express from 'express';
import { body } from 'express-validator';
import {
  generateTasks,
  suggestPriority,
  generateSprintPlan,
  getProjectSummary,
  detectIssues,
  aiChat
} from '../controllers/aiController.js';
import { protect, isProjectManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const generateTasksValidation = [
  body('projectDescription').trim().notEmpty().withMessage('Project description is required')
];

const chatValidation = [
  body('message').trim().notEmpty().withMessage('Message is required')
];

// Optional unauthenticated test route (disabled by default).
// Enable by setting ALLOW_UNAUTH_AI_TEST=true in your environment. This is
// intended only for local testing and will be skipped in production.
if (process.env.ALLOW_UNAUTH_AI_TEST === 'true') {
  // Lightweight validation is still applied to keep behavior consistent.
  router.post('/chat-test', chatValidation, validate, aiChat);
}

// All remaining routes are protected
router.use(protect);

// AI features
router.post('/generate-tasks', isProjectManager, generateTasksValidation, validate, generateTasks);
router.post('/suggest-priority', suggestPriority);
router.post('/generate-sprint-plan', isProjectManager, generateSprintPlan);
router.get('/project-summary/:projectId', getProjectSummary);
router.get('/detect-issues/:projectId', detectIssues);
router.post('/chat', chatValidation, validate, aiChat);

export default router;
