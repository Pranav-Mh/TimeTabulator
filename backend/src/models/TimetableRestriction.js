const mongoose = require('mongoose');

const TimetableRestrictionSchema = new mongoose.Schema({
  restrictionName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Type: time, teacher, or subject
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
  timeSlots: [Number], // Array of slot numbers (1, 2, 3, etc.)
  days: [{
    type: String,
    enum: ['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  }],
  duration: {
    type: Number,
    default: 30 // Duration in minutes
  },
  
  // TEACHER-BASED fields (when type = 'teacher')  
  teacherName: String,
  unavailableSlots: [Number],
  reason: String,
  
  // SUBJECT-BASED fields (when type = 'subject')
  subjectName: String,
  restrictedDays: [String],
  allowedTimeSlots: [Number],
  roomType: {
    type: String,
    enum: ['any', 'CR', 'LAB'],
    default: 'any'
  },
  
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
  },
  
  // Booking metadata
  bookedSlots: [{
    slotNumber: Number,
    day: String,
    isConflict: {
      type: Boolean,
      default: false
    }
  }],
  
  // Advanced time configuration reference
  timeConfigurationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeSlotConfiguration'
  }
}, {
  timestamps: true
});

// ✅ FIXED: Only safe indexes (no compound array indexes)
TimetableRestrictionSchema.index({ type: 1, isActive: 1 });
TimetableRestrictionSchema.index({ scope: 1 });

module.exports = mongoose.model('TimetableRestriction', TimetableRestrictionSchema);
