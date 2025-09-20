const mongoose = require('mongoose');

const TimetableRestrictionSchema = new mongoose.Schema({
  restrictionName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Simple type: time, teacher, or subject
  type: {
    type: String,
    enum: ['time', 'teacher', 'subject'],
    required: true
  },
  
  // Scope: global or specific years
  scope: {
    type: String,
    enum: ['global', 'year-specific'],
    default: 'global'
  },
  
  // For year-specific restrictions
  affectedYears: [{
    type: String,
    enum: ['2nd Year', '3rd Year', '4th Year']
  }],
  
  // TIME-BASED fields (when type = 'time')
  startTime: String,
  endTime: String,
  days: [{
    type: String,
    enum: ['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  }],
  
  // TEACHER-BASED fields (when type = 'teacher')  
  teacherName: String,
  unavailableSlots: [{
    day: String,
    startTime: String,
    endTime: String,
    reason: String
  }],
  
  // SUBJECT-BASED fields (when type = 'subject')
  subjectName: String,
  blockedDays: [String],
  
  // Common fields
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  description: String,
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TimetableRestriction', TimetableRestrictionSchema);
