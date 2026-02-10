import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task_created', 'task_updated', 'task_completed', 'member_added', 'comment_added', 'project_created', 'sprint_created'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }
}, {
  timestamps: true
});

// Index for efficient queries
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
