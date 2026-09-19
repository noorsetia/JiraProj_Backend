import express from 'express';
import multer from 'multer';

import { protect } from '../middleware/auth.js';
import { explainCodeFile } from '../controllers/fileController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 2 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      '.js',
      '.jsx',
      '.py',
      '.java',
      '.html',
      '.css',
      '.json'
    ];

    const extension = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(
        new Error(
          'Unsupported file type. Allowed: .js, .jsx, .py, .java, .html, .css, .json'
        )
      );
    }

    cb(null, true);
  }
});

router.use(protect);

router.post(
  '/explain',
  upload.single('file'),
  explainCodeFile
);

export default router;
