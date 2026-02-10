import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import Sprint from '../models/Sprint.js';

/**
 * @desc    Get dashboard analytics for user
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get projects user is part of
  const userProjects = await Project.find({
    $or: [
      { createdBy: userId },
      { 'members.user': userId }
    ],
    isActive: true
  }).select('_id');

  const projectIds = userProjects.map(p => p._id);

  // Overall statistics
  const totalProjects = projectIds.length;
  
  const totalTasks = await Task.countDocuments({
    project: { $in: projectIds },
    isActive: true
  });

  const completedTasks = await Task.countDocuments({
    project: { $in: projectIds },
    isActive: true,
    status: 'Done'
  });

  const myTasks = await Task.countDocuments({
    assignedTo: userId,
    isActive: true
  });

  const myCompletedTasks = await Task.countDocuments({
    assignedTo: userId,
    isActive: true,
    status: 'Done'
  });

  const delayedTasks = await Task.countDocuments({
    project: { $in: projectIds },
    isActive: true,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() }
  });

  // Active sprints
  const activeSprints = await Sprint.countDocuments({
    project: { $in: projectIds },
    status: 'Active',
    isActive: true
  });

  // Tasks by status
  const tasksByStatus = await Task.aggregate([
    {
      $match: {
        project: { $in: projectIds },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Tasks by priority
  const tasksByPriority = await Task.aggregate([
    {
      $match: {
        project: { $in: projectIds },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  // Recent tasks (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentTasks = await Task.countDocuments({
    project: { $in: projectIds },
    isActive: true,
    createdAt: { $gte: sevenDaysAgo }
  });

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalProjects,
        totalTasks,
        completedTasks,
        myTasks,
        myCompletedTasks,
        delayedTasks,
        activeSprints,
        recentTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        myCompletionRate: myTasks > 0 ? Math.round((myCompletedTasks / myTasks) * 100) : 0
      },
      tasksByStatus,
      tasksByPriority
    }
  });
});

/**
 * @desc    Get project analytics
 * @route   GET /api/analytics/project/:projectId
 * @access  Private
 */
export const getProjectAnalytics = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Verify project access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );
  const isCreator = project.createdBy.toString() === req.user.id;

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this project'
    });
  }

  // Task statistics
  const totalTasks = await Task.countDocuments({
    project: projectId,
    isActive: true
  });

  const tasksByStatus = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const tasksByPriority = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  // Team member performance
  const memberStats = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isActive: true,
        assignedTo: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        totalTasks: 1,
        completedTasks: 1,
        completionRate: {
          $cond: [
            { $gt: ['$totalTasks', 0] },
            { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
            0
          ]
        }
      }
    }
  ]);

  // Sprint statistics
  const sprints = await Sprint.find({
    project: projectId,
    isActive: true
  });

  const sprintStats = await Promise.all(
    sprints.map(async (sprint) => {
      const sprintTasks = await Task.countDocuments({
        sprint: sprint._id,
        isActive: true
      });
      
      const completedSprintTasks = await Task.countDocuments({
        sprint: sprint._id,
        isActive: true,
        status: 'Done'
      });

      return {
        sprintId: sprint._id,
        name: sprint.name,
        status: sprint.status,
        totalTasks: sprintTasks,
        completedTasks: completedSprintTasks,
        completionRate: sprintTasks > 0 ? Math.round((completedSprintTasks / sprintTasks) * 100) : 0
      };
    })
  );

  // Task completion trend (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const completionTrend = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isActive: true,
        status: 'Done',
        updatedAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const delayedTasks = await Task.countDocuments({
    project: projectId,
    isActive: true,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() }
  });

  res.status(200).json({
    success: true,
    data: {
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      memberStats,
      sprintStats,
      completionTrend,
      delayedTasks
    }
  });
});

/**
 * @desc    Get team member performance
 * @route   GET /api/analytics/team-performance/:projectId
 * @access  Private (Project Manager only)
 */
export const getTeamPerformance = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const performance = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        isActive: true,
        assignedTo: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'Done'] }, 1, 0] }
        },
        highPriorityTasks: {
          $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] }
        },
        delayedTasks: {
          $sum: {
            $cond: [
              { 
                $and: [
                  { $ne: ['$status', 'Done'] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        avatar: '$user.avatar',
        totalTasks: 1,
        completedTasks: 1,
        highPriorityTasks: 1,
        delayedTasks: 1,
        completionRate: {
          $round: [
            {
              $cond: [
                { $gt: ['$totalTasks', 0] },
                { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
                0
              ]
            },
            2
          ]
        }
      }
    },
    {
      $sort: { completionRate: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: performance
  });
});
