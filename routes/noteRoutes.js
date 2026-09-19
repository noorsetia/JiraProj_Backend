import express from 'express';

import {
  getProjectNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote
} from '../controllers/noteController.js';

import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get(
  '/project/:projectId',
  getProjectNotes
);

router.post(
  '/',
  createNote
);

router.get(
  '/:id',
  getNote
);

router.put(
  '/:id',
  updateNote
);

router.delete(
  '/:id',
  deleteNote
);

export default router;