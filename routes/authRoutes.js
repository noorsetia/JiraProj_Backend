import express from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  getAllUsers,
  googleCallback
} from '../controllers/authController.js';
import { protect, isProjectManager } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['Project Manager', 'Team Member'])
    .withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      console.log('Google callback - User authenticated:', req.user?.email);
      
      if (!req.user) {
        console.error('No user in request after Google auth');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      }
      
      // Generate JWT token
      const { generateToken } = await import('../utils/auth.js');
      const token = generateToken(req.user._id);
      
      console.log('Token generated, redirecting to frontend');
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
  }
);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfile);
router.put('/updatepassword', protect, updatePasswordValidation, validate, updatePassword);
router.get('/users', protect, isProjectManager, getAllUsers);

export default router;
