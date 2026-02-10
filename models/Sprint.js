import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true,
    minlength: [3, 'Sprint name must be at least 3 characters long'],
    maxlength: [100, 'Sprint name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  goal: {
    type: String,
    trim: true,
    maxlength: [500, 'Goal cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['Planning', 'Active', 'Completed', 'Cancelled'],
    default: 'Planning'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
sprintSchema.index({ project: 1, status: 1 });
sprintSchema.index({ startDate: 1, endDate: 1 });

// Virtual for tasks
sprintSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'sprint'
});

const Sprint = mongoose.model('Sprint', sprintSchema);

export default Sprint;
