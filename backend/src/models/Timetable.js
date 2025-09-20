const mongoose = require('mongoose');

const TimetableEntrySchema = new mongoose.Schema({
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
    type: String,
    required: true
  },
  teacher: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  roomType: {
    type: String,
    enum: ['CR', 'LAB'],
    required: true
  },
  batch: {
    type: String,
    enum: ['ALL', 'A1', 'A2', 'A3'],
    default: 'ALL'
  },
  isLabSession: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 1 // hours
  }
});

const TimetableSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true // SE, TE, BE
  },
  division: {
    type: String,
    required: true // A, B, C
  },
  batch: {
    type: String,
    enum: ['ALL', 'A1', 'A2', 'A3'],
    default: 'ALL'
  },
  entries: [TimetableEntrySchema],
  generatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Timetable', TimetableSchema);
