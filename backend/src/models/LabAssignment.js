const mongoose = require('mongoose');

const LabAssignmentSchema = new mongoose.Schema({
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

  // ✅ FIXED: Removed hard max limit (supports 3 or 4 batches)
  batchNumber: {
    type: Number,
    required: true,
    min: 1
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

// Prevent duplicate assignments (same subject + division + batch)
LabAssignmentSchema.index(
  { subjectId: 1, divisionId: 1, batchNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model('LabAssignment', LabAssignmentSchema);
