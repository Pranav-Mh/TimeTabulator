const mongoose = require('mongoose');

const TimetableSlotSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  },
  division: {
    type: String,
    required: true
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  room: {
    type: String,
    required: true
  },
  batchNumber: {
    type: Number,
    min: 1,
    max: 3,
    default: null // null for theory subjects, 1-3 for lab subjects
  },
  isLab: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Prevent scheduling conflicts
TimetableSlotSchema.index({ 
  academicYear: 1, 
  division: 1, 
  day: 1, 
  timeSlot: 1 
}, { unique: true });

// Prevent teacher conflicts
TimetableSlotSchema.index({ 
  teacher: 1, 
  day: 1, 
  timeSlot: 1 
}, { unique: true });

module.exports = mongoose.model('TimetableSlot', TimetableSlotSchema);
