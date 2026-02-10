import mongoose from 'mongoose';
import validator from 'validator';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true, // Allow multiple null values
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if not using Google OAuth
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: {
      values: ['Project Manager', 'Team Member'],
      message: 'Role must be either Project Manager or Team Member'
    },
    default: 'Team Member',
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries (email is already unique, so no need for separate index)
userSchema.index({ role: 1 });

// Pre-save middleware to ensure role is set
userSchema.pre('save', function(next) {
  if (!this.role) {
    this.role = 'Team Member';
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
