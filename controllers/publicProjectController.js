import Project from '../models/Project.js';
import Task from '../models/Task.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get public project information
 * @route   GET /api/public/projects/:projectId
 * @access  Public
 */
export const getPublicProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId)
    .populate('createdBy', 'name')
    .populate('members.user', 'name role');

  if (!project || !project.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  const tasks = await Task.find({
    project: projectId,
    isActive: true
  })
    .select('title status priority dueDate assignedTo')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 });

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    task => task.status === 'Done'
  ).length;

  const inProgressTasks = tasks.filter(
    task => task.status === 'In Progress'
  ).length;

  const completionRate =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

  res.status(200).json({
    success: true,
    data: {
      id: project._id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,

      createdBy: {
        name: project.createdBy?.name || 'Project Manager'
      },

      members: project.members.map(member => ({
        name: member.user?.name || 'Unknown',
        role: member.role || member.user?.role || 'Team Member'
      })),

      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        completionRate
      },

      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo
          ? {
              name: task.assignedTo.name
            }
          : null
      }))
    }
  });
});