const mongoose = require('mongoose');

const timetableSlotSchema = new mongoose.Schema({
  timetableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedTimetable',
    required: true
  },
  division: {
    year: String,
    divisionName: String
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  slotNumber: {
    type: Number,
    required: true
  },
  subject: {
    name: String,
    type: String,
    credits: Number
  },
  teacher: {
    name: String,
    id: String
  },
  room: {
    name: String,
    type: String,
    capacity: Number
  },
  batch: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['lecture', 'lab'],
    required: true
  },
  startTime: String,
  endTime: String
}, {
  timestamps: true
});

module.exports = mongoose.model('TimetableSlot', timetableSlotSchema);
