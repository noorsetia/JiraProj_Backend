import Sprint from '../models/Sprint.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import asyncHandler from '../utils/asyncHandler.js';
import mongoose from 'mongoose';

/**
 * @desc    Get all sprints for a project
 * @route   GET /api/projects/:projectId/sprints
 * @access  Private
 */
export const getSprints = asyncHandler(async (req, res) => {
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

  const sprints = await Sprint.find({ project: projectId, isActive: true })
    .populate('createdBy', 'name email avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: sprints.length,
    data: sprints
  });
});

/**
 * @desc    Get single sprint
 * @route   GET /api/sprints/:id
 * @access  Private
 */
export const getSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id)
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name');

  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }

  // Verify access through project
  const project = await Project.findById(sprint.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );
  const isCreator = project.createdBy.toString() === req.user.id;

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this sprint'
    });
  }

  res.status(200).json({
    success: true,
    data: sprint
  });
});

/**
 * @desc    Create new sprint
 * @route   POST /api/projects/:projectId/sprints
 * @access  Private (Project Manager only)
 */
export const createSprint = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, startDate, endDate, goal } = req.body;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  const sprint = await Sprint.create({
    name,
    description,
    project: projectId,
    startDate,
    endDate,
    goal,
    createdBy: req.user.id
  });

  const populatedSprint = await Sprint.findById(sprint._id)
    .populate('createdBy', 'name email avatar');

  res.status(201).json({
    success: true,
    message: 'Sprint created successfully',
    data: populatedSprint
  });
});

/**
 * @desc    Update sprint
 * @route   PUT /api/sprints/:id
 * @access  Private (Project Manager only)
 */
export const updateSprint = asyncHandler(async (req, res) => {
  let sprint = await Sprint.findById(req.params.id);

  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }

  const { name, description, startDate, endDate, goal, status } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (startDate) updateFields.startDate = startDate;
  if (endDate) updateFields.endDate = endDate;
  if (goal !== undefined) updateFields.goal = goal;
  if (status) updateFields.status = status;

  sprint = await Sprint.findByIdAndUpdate(
    req.params.id,
    updateFields,
    {
      new: true,
      runValidators: true
    }
  ).populate('createdBy', 'name email avatar');

  res.status(200).json({
    success: true,
    message: 'Sprint updated successfully',
    data: sprint
  });
});

/**
 * @desc    Delete sprint
 * @route   DELETE /api/sprints/:id
 * @access  Private (Project Manager only)
 */
export const deleteSprint = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);

  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }

  // Soft delete
  sprint.isActive = false;
  await sprint.save();

  // Remove sprint reference from tasks
  await Task.updateMany(
    { sprint: req.params.id },
    { $unset: { sprint: 1 } }
  );

  res.status(200).json({
    success: true,
    message: 'Sprint deleted successfully',
    data: {}
  });
});

/**
 * @desc    Get sprint statistics
 * @route   GET /api/sprints/:id/stats
 * @access  Private
 */
export const getSprintStats = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);

  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }

  // Verify access
  const project = await Project.findById(sprint.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );
  const isCreator = project.createdBy.toString() === req.user.id;

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this sprint'
    });
  }

  // Aggregate task statistics
  const taskStats = await Task.aggregate([
    {
      $match: {
        sprint: new mongoose.Types.ObjectId(req.params.id),
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

  const totalTasks = await Task.countDocuments({
    sprint: req.params.id,
    isActive: true
  });

  const completedTasks = taskStats.find(s => s._id === 'Done')?.count || 0;
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Calculate sprint progress based on dates
  const now = new Date();
  const sprintStart = new Date(sprint.startDate);
  const sprintEnd = new Date(sprint.endDate);
  const totalDuration = sprintEnd - sprintStart;
  const elapsed = now - sprintStart;
  const timeProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

  res.status(200).json({
    success: true,
    data: {
      totalTasks,
      completedTasks,
      completionPercentage,
      timeProgress: Math.round(timeProgress),
      tasksByStatus: taskStats,
      sprintInfo: {
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status: sprint.status,
        daysRemaining: Math.ceil((sprintEnd - now) / (1000 * 60 * 60 * 24))
      }
    }
  });
});

/**
 * @desc    Get tasks in a sprint
 * @route   GET /api/sprints/:id/tasks
 * @access  Private
 */
export const getSprintTasks = asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id);

  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }

  // Verify access
  const project = await Project.findById(sprint.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );
  const isCreator = project.createdBy.toString() === req.user.id;

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this sprint'
    });
  }

  const tasks = await Task.find({ sprint: req.params.id, isActive: true })
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort('position');

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});
