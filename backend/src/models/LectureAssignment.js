const mongoose = require('mongoose');

const LectureAssignmentSchema = new mongoose.Schema({
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  divisionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  },
  hoursPerWeek: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Prevent duplicate assignments (same subject + division)
LectureAssignmentSchema.index({ subjectId: 1, divisionId: 1 }, { unique: true });

module.exports = mongoose.model('LectureAssignment', LectureAssignmentSchema);
