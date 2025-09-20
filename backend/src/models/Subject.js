const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['TH', 'PR', 'VAP', 'OE'],
    required: true
  },
  credits: {
    type: Number,
    required: true,
    min: 1
  },
  hoursPerWeek: {
    type: Number,
    required: true,
    min: 1
  },
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  },
  syllabusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Syllabus',
    required: true
  }
}, {
  timestamps: true
});

// Compound unique index: courseCode + academicYear + syllabusId
SubjectSchema.index({ courseCode: 1, academicYear: 1, syllabusId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
