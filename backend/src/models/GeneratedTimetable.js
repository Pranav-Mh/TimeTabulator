const mongoose = require('mongoose');

const GeneratedTimetableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  },
  divisions: [{
    type: String,
    required: true
  }],
  generatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'saved'],
    default: 'generating'
  },
  conflicts: [{
    type: {
      type: String,
      enum: ['teacher_conflict', 'room_conflict', 'workload_exceeded'],
      required: true
    },
    description: String,
    suggestion: String,
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  slots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimetableSlot'
  }],
  generationSettings: {
    workingDays: {
      type: Number,
      default: 5
    },
    slotsPerDay: {
      type: Number,
      default: 8
    },
    allowSaturdayLabs: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GeneratedTimetable', GeneratedTimetableSchema);
