const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true
  },
  originalStartTime: {
    type: String,
    required: true
  },
  originalEndTime: {
    type: String,
    required: true
  },
  adjustedStartTime: {
    type: String,
    required: true
  },
  adjustedEndTime: {
    type: String,
    required: true
  },
  isAdjusted: {
    type: Boolean,
    default: false
  }
});

const FixedBookingSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true
  },
  days: [{
    type: String,
    enum: ['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  slotName: {
    type: String,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 5,
    max: 180
  },
  timingMode: {
    type: String,
    enum: ['duration', 'exact'],
    default: 'duration'
  },
  exactStartTime: String,
  exactEndTime: String,
  calculatedDurationMinutes: Number,
  affectedSlots: [Number],
  startOffset: {
    type: Number,
    default: 0
  }
});

const TimeSlotConfigurationSchema = new mongoose.Schema({
  collegeStartTime: {
    type: String,
    required: true,
    default: "08:00 AM"
  },
  collegeEndTime: {
    type: String,
    required: true,
    default: "03:00 PM"
  },
  workingDaysPerWeek: {
    type: Number,
    required: true,
    default: 5,
    min: 1,
    max: 7
  },
  timeSlotsPerDay: {
    type: Number,
    required: true,
    default: 8,
    min: 1,
    max: 15
  },
  periodDurationMinutes: {
    type: Number,
    required: true,
    default: 60,
    min: 30,
    max: 120
  },
  timeSlots: [TimeSlotSchema],
  fixedBookings: [FixedBookingSchema],
  isConfigured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TimeSlotConfiguration', TimeSlotConfigurationSchema);
