import Project from '../models/Project.js';
import Task from '../models/Task.js';
import asyncHandler from '../utils/asyncHandler.js';
import mongoose from 'mongoose';

/**
 * @desc    Get all projects for the logged-in user
 * @route   GET /api/projects
 * @access  Private
 */
export const getProjects = asyncHandler(async (req, res) => {
  let query;

  // Project Managers can see all projects they created or are members of
  // Team Members can only see projects they are members of
  if (req.user.role === 'Project Manager') {
    query = {
      $or: [
        { createdBy: req.user.id },
        { 'members.user': req.user.id }
      ],
      isActive: true
    };
  } else {
    query = {
      'members.user': req.user.id,
      isActive: true
    };
  }

  const projects = await Project.find(query)
    .populate('createdBy', 'name email avatar')
    .populate('members.user', 'name email avatar role')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

/**
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Private
 */
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('createdBy', 'name email avatar')
    .populate('members.user', 'name email avatar role');

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user has access to this project
  const isMember = project.members.some(
    member => member.user._id.toString() === req.user.id
  );
  const isCreator = project.createdBy._id.toString() === req.user.id;

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this project'
    });
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Project Manager only)
 */
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, members, startDate, endDate, status } = req.body;

  // Add creator as a member with Project Manager role
  const projectMembers = [
    {
      user: req.user.id,
      role: 'Project Manager'
    }
  ];

  // Add other members if provided
  if (members && Array.isArray(members)) {
    members.forEach(member => {
      // Avoid duplicate if creator is in members array
      if (member.user !== req.user.id) {
        projectMembers.push({
          user: member.user,
          role: member.role || 'Team Member'
        });
      }
    });
  }

  const project = await Project.create({
    name,
    description,
    createdBy: req.user.id,
    members: projectMembers,
    startDate: startDate || Date.now(),
    endDate,
    status: status || 'Planning'
  });

  const populatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email avatar')
    .populate('members.user', 'name email avatar role');

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: populatedProject
  });
});

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (Project Manager only)
 */
export const updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user is the creator or a project manager member
  const isCreator = project.createdBy.toString() === req.user.id;
  const isPM = project.members.some(
    member => 
      member.user.toString() === req.user.id && 
      member.role === 'Project Manager'
  );

  if (!isCreator && !isPM) {
    return res.status(403).json({
      success: false,
      message: 'Only Project Manager can update this project'
    });
  }

  const { name, description, status, startDate, endDate } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (description) updateFields.description = description;
  if (status) updateFields.status = status;
  if (startDate) updateFields.startDate = startDate;
  if (endDate) updateFields.endDate = endDate;

  project = await Project.findByIdAndUpdate(
    req.params.id,
    updateFields,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('createdBy', 'name email avatar')
    .populate('members.user', 'name email avatar role');

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: project
  });
});

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (Project Manager - Creator only)
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Only creator can delete project
  if (project.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Only the project creator can delete this project'
    });
  }

  // Soft delete - mark as inactive
  project.isActive = false;
  await project.save();

  // Also mark all tasks as inactive
  await Task.updateMany(
    { project: req.params.id },
    { isActive: false }
  );

  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
    data: {}
  });
});

/**
 * @desc    Add member to project
 * @route   POST /api/projects/:id/members
 * @access  Private (Project Manager only)
 */
export const addMember = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user is authorized
  const isCreator = project.createdBy.toString() === req.user.id;
  const isPM = project.members.some(
    member => 
      member.user.toString() === req.user.id && 
      member.role === 'Project Manager'
  );

  if (!isCreator && !isPM) {
    return res.status(403).json({
      success: false,
      message: 'Only Project Manager can add members'
    });
  }

  // Check if user is already a member
  const isMember = project.members.some(
    member => member.user.toString() === userId
  );

  if (isMember) {
    return res.status(400).json({
      success: false,
      message: 'User is already a member of this project'
    });
  }

  project.members.push({
    user: userId,
    role: role || 'Team Member'
  });

  await project.save();

  const updatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email avatar')
    .populate('members.user', 'name email avatar role');

  res.status(200).json({
    success: true,
    message: 'Member added successfully',
    data: updatedProject
  });
});

/**
 * @desc    Remove member from project
 * @route   DELETE /api/projects/:id/members/:userId
 * @access  Private (Project Manager only)
 */
export const removeMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user is authorized
  const isCreator = project.createdBy.toString() === req.user.id;
  const isPM = project.members.some(
    member => 
      member.user.toString() === req.user.id && 
      member.role === 'Project Manager'
  );

  if (!isCreator && !isPM) {
    return res.status(403).json({
      success: false,
      message: 'Only Project Manager can remove members'
    });
  }

  // Cannot remove project creator
  if (project.createdBy.toString() === req.params.userId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot remove project creator'
    });
  }

  project.members = project.members.filter(
    member => member.user.toString() !== req.params.userId
  );

  await project.save();

  const updatedProject = await Project.findById(project._id)
    .populate('createdBy', 'name email avatar')
    .populate('members.user', 'name email avatar role');

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data: updatedProject
  });
});

/**
 * @desc    Get project statistics
 * @route   GET /api/projects/:id/stats
 * @access  Private
 */
export const getProjectStats = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Check if user has access
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

  // Aggregate task statistics
  const taskStats = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(req.params.id),
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

  const priorityStats = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(req.params.id),
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

  // Get delayed tasks
  const delayedTasks = await Task.countDocuments({
    project: req.params.id,
    isActive: true,
    status: { $ne: 'Done' },
    dueDate: { $lt: new Date() }
  });

  // Total tasks
  const totalTasks = await Task.countDocuments({
    project: req.params.id,
    isActive: true
  });

  const completedTasks = taskStats.find(s => s._id === 'Done')?.count || 0;
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  res.status(200).json({
    success: true,
    data: {
      totalTasks,
      completedTasks,
      completionPercentage,
      delayedTasks,
      tasksByStatus: taskStats,
      tasksByPriority: priorityStats
    }
  });
});
