import Note from '../models/Note.js';
import Project from '../models/Project.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Get all notes for a project
 * GET /api/notes/project/:projectId
 */
export const getProjectNotes = asyncHandler(
  async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const isMember = project.members.some(
      (member) =>
        member.user.toString() === req.user._id.toString()
    );

    const isCreator =
      project.createdBy.toString() ===
      req.user._id.toString();

    if (!isMember && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this project'
      });
    }

    const notes = await Note.find({
      project: projectId
    })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes
    });
  }
);

/**
 * Get single note
 * GET /api/notes/:id
 */
export const getNote = asyncHandler(
  async (req, res) => {
    const note = await Note.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    res.status(200).json({
      success: true,
      data: note
    });
  }
);

/**
 * Create note
 * POST /api/notes
 */
export const createNote = asyncHandler(
  async (req, res) => {
    const {
      title,
      content,
      projectId
    } = req.body;

    if (!title || !content || !projectId) {
      return res.status(400).json({
        success: false,
        message:
          'Title, content and projectId are required'
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const isMember = project.members.some(
      (member) =>
        member.user.toString() === req.user._id.toString()
    );

    const isCreator =
      project.createdBy.toString() ===
      req.user._id.toString();

    if (!isMember && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this project'
      });
    }

    const note = await Note.create({
      title,
      content,
      project: projectId,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const populatedNote = await Note.findById(note._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: populatedNote
    });
  }
);

/**
 * Update note
 * PUT /api/notes/:id
 */
export const updateNote = asyncHandler(
  async (req, res) => {
    const {
      title,
      content
    } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    note.title = title ?? note.title;
    note.content = content ?? note.content;
    note.updatedBy = req.user._id;

    await note.save();

    const updatedNote =
      await Note.findById(note._id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: updatedNote
    });
  }
);

/**
 * Delete note
 * DELETE /api/notes/:id
 */
export const deleteNote = asyncHandler(
  async (req, res) => {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });
  }
);