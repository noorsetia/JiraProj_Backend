import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  explainContent,
  generateDocs,
  generateReadme
} from '../controllers/geminiController.js';

const router = express.Router();

router.use(protect);

router.post('/explain', explainContent);
router.post('/docs', generateDocs);
router.post('/readme', generateReadme);

export default router;
