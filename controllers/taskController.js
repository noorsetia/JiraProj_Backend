import Task from '../models/Task.js';
import Project from '../models/Project.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get all tasks for a project
 * @route   GET /api/projects/:projectId/tasks
 * @access  Private
 */
export const getTasks = asyncHandler(async (req, res) => {
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

  const tasks = await Task.find({ project: projectId, isActive: true })
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('sprint', 'name')
    .populate('comments.user', 'name email avatar')
    .sort('position');

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

/**
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Private
 */
export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('project', 'name')
    .populate('sprint', 'name')
    .populate('comments.user', 'name email avatar');

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Verify access through project
  const project = await Project.findById(task.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );
  const isCreator = project.createdBy.toString() === req.user.id;

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this task'
    });
  }

  res.status(200).json({
    success: true,
    data: task
  });
});

/**
 * @desc    Create new task
 * @route   POST /api/projects/:projectId/tasks
 * @access  Private (Project Manager only)
 */
export const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, priority, assignedTo, dueDate, sprint, estimatedHours, status } = req.body;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  // Get the highest position for tasks in this project
  const highestPositionTask = await Task.findOne({ project: projectId })
    .sort('-position')
    .select('position');
  
  const position = highestPositionTask ? highestPositionTask.position + 1 : 0;

  const task = await Task.create({
    title,
    description,
    project: projectId,
    priority: priority || 'Medium',
    status: status || 'To Do',
    assignedTo: assignedTo || null,
    createdBy: req.user.id,
    dueDate,
    sprint: sprint || null,
    estimatedHours: estimatedHours || 0,
    position
  });

  const populatedTask = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('sprint', 'name');

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: populatedTask
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
export const updateTask = asyncHandler(async (req, res) => {
  let task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Verify project access
  const project = await Project.findById(task.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );
  const isCreator = project.createdBy.toString() === req.user.id;
  const isPM = project.members.some(
    member => 
      member.user.toString() === req.user.id && 
      member.role === 'Project Manager'
  );

  if (!isMember && !isCreator) {
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this task'
    });
  }

  // Team members can only update status and add comments
  // Project managers can update all fields
  const allowedFields = req.user.role === 'Project Manager' || isPM
    ? ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate', 'sprint', 'estimatedHours', 'actualHours']
    : ['status', 'actualHours'];

  const updateFields = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  });

  task = await Task.findByIdAndUpdate(
    req.params.id,
    updateFields,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('sprint', 'name');

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: task
  });
});

/**
 * @desc    Update task status (for drag and drop)
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, position } = req.body;

  let task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Update task status and position
  task.status = status;
  if (position !== undefined) {
    task.position = position;
  }

  await task.save();

  task = await Task.findById(task._id)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('sprint', 'name');

  res.status(200).json({
    success: true,
    message: 'Task status updated successfully',
    data: task
  });
});

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Project Manager only)
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  // Soft delete
  task.isActive = false;
  await task.save();

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
    data: {}
  });
});

/**
 * @desc    Add comment to task
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
export const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }

  task.comments.push({
    user: req.user.id,
    text
  });

  await task.save();

  const updatedTask = await Task.findById(task._id)
    .populate('comments.user', 'name email avatar');

  res.status(200).json({
    success: true,
    message: 'Comment added successfully',
    data: updatedTask.comments
  });
});

/**
 * @desc    Get tasks assigned to current user
 * @route   GET /api/tasks/my-tasks
 * @access  Private
 */
export const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({
    assignedTo: req.user.id,
    isActive: true
  })
    .populate('project', 'name')
    .populate('sprint', 'name')
    .populate('createdBy', 'name email avatar')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

/**
 * @desc    Bulk update task positions (for drag and drop reordering)
 * @route   PATCH /api/tasks/bulk-update-positions
 * @access  Private
 */
export const bulkUpdatePositions = asyncHandler(async (req, res) => {
  const { updates } = req.body; // Array of { id, position, status }

  if (!Array.isArray(updates)) {
    return res.status(400).json({
      success: false,
      message: 'Updates must be an array'
    });
  }

  // Update all tasks
  const updatePromises = updates.map(update =>
    Task.findByIdAndUpdate(
      update.id,
      { 
        position: update.position,
        ...(update.status && { status: update.status })
      },
      { new: true }
    )
  );

  await Promise.all(updatePromises);

  res.status(200).json({
    success: true,
    message: 'Task positions updated successfully'
  });
});
