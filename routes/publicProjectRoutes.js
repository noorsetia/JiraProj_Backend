import express from 'express';
import { getPublicProject } from '../controllers/publicProjectController.js';

const router = express.Router();

// Public route — NO protect middleware
router.get('/projects/:projectId', getPublicProject);

export default router;