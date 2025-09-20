const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Subject', SubjectSchema);
