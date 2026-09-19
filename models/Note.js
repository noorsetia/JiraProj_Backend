import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      minlength: 2,
      maxlength: 150
    },

    content: {
      type: String,
      required: [true, 'Note content is required'],
      maxlength: 20000
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

noteSchema.index({
  project: 1,
  createdAt: -1
});

const Note = mongoose.model('Note', noteSchema);

export default Note;
