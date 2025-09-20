const mongoose = require('mongoose');

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
  
  // ENHANCED: Dual booking modes
  timingMode: {
    type: String,
    enum: ['duration', 'exact'],
    default: 'duration'
  },
  
  // Duration Mode Fields
  durationMinutes: {
    type: Number,
    min: 5,
    max: 300
  },
  startOffset: {
    type: Number,
    default: 0
  },
  
  // Exact Time Mode Fields
  exactStartTime: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.timingMode === 'exact') {
          return /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i.test(v);
        }
        return true;
      },
      message: 'Start time must be in format "12:00 PM"'
    }
  },
  exactEndTime: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.timingMode === 'exact') {
          return /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i.test(v);
        }
        return true;
      },
      message: 'End time must be in format "12:00 PM"'
    }
  },
  
  // Auto-calculated fields
  calculatedDurationMinutes: Number,
  affectedSlots: [Number],
  
  // Conflict resolution
  replacedBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FixedBooking'
  }
});

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
  },
  affectedByBookings: [mongoose.Schema.Types.ObjectId]
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
    min: 1,
    max: 7,
    default: 5
  },
  timeSlotsPerDay: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    default: 8
  },
  periodDurationMinutes: {
    type: Number,
    required: true,
    default: 60
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
