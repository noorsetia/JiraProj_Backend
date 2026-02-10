import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private
export const getAnalytics = asyncHandler(async (req, res) => {
  // Get all projects user has access to
  const projects = await Project.find({
    $or: [
      { createdBy: req.user._id },
      { members: req.user._id }
    ]
  });

  const projectIds = projects.map(p => p._id);

  // Total counts
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  
  const tasks = await Task.find({ project: { $in: projectIds } });
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done').length;

  // Get unique team members
  const memberSet = new Set();
  projects.forEach(p => {
    p.members.forEach(m => memberSet.add(m.toString()));
  });
  const totalMembers = memberSet.size;

  // Completion rate
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Tasks by status
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'Todo').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    inReview: tasks.filter(t => t.status === 'In Review').length,
    done: tasks.filter(t => t.status === 'Done').length
  };

  // Tasks by priority
  const tasksByPriority = {
    low: tasks.filter(t => t.priority === 'Low').length,
    medium: tasks.filter(t => t.priority === 'Medium').length,
    high: tasks.filter(t => t.priority === 'High').length
  };

  // Average tasks per project
  const avgTasksPerProject = totalProjects > 0 
    ? Math.round(totalTasks / totalProjects) 
    : 0;

  // Average members per project
  const avgMembersPerProject = totalProjects > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.members.length, 0) / totalProjects)
    : 0;

  // Tasks completed this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const tasksCompletedThisWeek = await Task.countDocuments({
    project: { $in: projectIds },
    status: 'Done',
    updatedAt: { $gte: oneWeekAgo }
  });

  res.json({
    success: true,
    data: {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      totalMembers,
      activeMembers: totalMembers,
      completionRate,
      tasksByStatus,
      tasksByPriority,
      avgTasksPerProject,
      avgMembersPerProject,
      tasksCompletedThisWeek,
      projectsTrend: 5,
      tasksTrend: 12,
      completionTrend: 8
    }
  });
});
