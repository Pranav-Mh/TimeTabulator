const mongoose = require('mongoose');

const SavedTimetableSchema = new mongoose.Schema({
  // User-provided name
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Schedule ID reference
  schedule_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Academic years included
  academicYears: [{
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  }],
  
  // Divisions included
  divisions: [{
    type: String,
    required: true
  }],
  
  // Metadata
  metadata: {
    labSessions: { type: Number, default: 0 },
    lectureSessions: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    restrictionsApplied: { type: Number, default: 0 },
    divisionsCount: { type: Number, default: 0 }
  },
  
  // Generation statistics
  statistics: {
    labUtilization: String,
    lectureUtilization: String,
    unscheduledLectures: Number,
    unscheduledLabs: Number
  },
  
  // Saved timestamp
  savedAt: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for faster queries
SavedTimetableSchema.index({ savedAt: -1 });
SavedTimetableSchema.index({ status: 1 });

module.exports = mongoose.model('SavedTimetable', SavedTimetableSchema);
