const mongoose = require('mongoose');

const LabScheduleSessionSchema = new mongoose.Schema({
  // Scheduling metadata
  schedule_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    index: true 
  },
  
  // Division and batch information
  division: { 
    type: String, 
    required: true 
  }, // "SE-A"
  
  batch: { 
    type: String, 
    required: true 
  }, // "SE-A1", "SE-A2", "SE-A3"
  
  // Time slot information
  day: { 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true 
  },
  
  start_slot: { 
    type: Number, 
    required: true,
    min: 1,
    max: 8 
  },
  
  end_slot: { 
    type: Number, 
    required: true,
    min: 1,
    max: 8 
  },
  
  // Subject and assignments
  subject: { 
    type: String, 
    required: true 
  }, // "OOPL", "CEPL", etc.
  
  teacher_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Teacher', 
    required: true 
  },
  
  lab_id: { 
    type: String, 
    required: true 
  }, // "CL01", "CL02", etc.
  
  // Session details
  session_type: { 
    type: String, 
    default: 'lab' 
  },
  
  hours_duration: { 
    type: Number, 
    default: 2 
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'rescheduled'],
    default: 'scheduled'
  },
  
  // Formatted display
  formatted: {
    type: String // "OOPL/T12/A1/CL01"
  }
}, {
  timestamps: true
});

// Indexes for performance
LabScheduleSessionSchema.index({ schedule_id: 1, division: 1 });
LabScheduleSessionSchema.index({ day: 1, start_slot: 1, lab_id: 1 });
LabScheduleSessionSchema.index({ teacher_id: 1, day: 1, start_slot: 1 });

module.exports = mongoose.model('LabScheduleSession', LabScheduleSessionSchema);
