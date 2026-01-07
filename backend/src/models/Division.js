const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
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
  },

  // ✅ NEW: Source of truth for lab batch count
  batchCount: {
    type: Number,
    enum: [3, 4],
    default: 3
  },

  // Existing batches (A1, A2, A3, A4...)
  batches: [
    {
      name: {
        type: String
      },
      batchNumber: {
        type: Number
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Division', DivisionSchema);
