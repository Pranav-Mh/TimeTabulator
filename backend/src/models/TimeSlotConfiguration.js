const mongoose = require('mongoose');

const TimeSlotConfigurationSchema = new mongoose.Schema({
  collegeStartTime: {
    type: String,
    required: true
  },
  collegeEndTime: {
    type: String,
    required: true
  },
  numberOfSlots: {
    type: Number,
    required: true,
    min: 3,
    max: 15
  },
  timeSlots: [{
    slotNumber: {
      type: Number,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    originalStartTime: String,
    originalEndTime: String,
    isBooked: {
      type: Boolean,
      default: false
    },
    bookedBy: String,
    bookingScope: String,
    bookingAffectedYears: [String]
  }],
  isManualMode: {
    type: Boolean,
    default: false
  },
  isConfigured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better performance
TimeSlotConfigurationSchema.index({ isConfigured: 1 });

module.exports = mongoose.model('TimeSlotConfiguration', TimeSlotConfigurationSchema);
