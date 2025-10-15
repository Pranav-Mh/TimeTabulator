const mongoose = require('mongoose');

const LectureScheduleSessionSchema = new mongoose.Schema({
  schedule_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Division information (NO batches - entire division together)
  division: {
    type: String,
    required: true
  },
  
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  },
  
  // Time information
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  
  slot_number: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  
  // Subject information
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  
  subject_name: {
    type: String,
    required: true
  },
  
  subject_type: {
    type: String,
    enum: ['TH', 'VAP'],
    required: true
  },
  
  // Teacher information
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  
  teacher_name: {
    type: String,
    required: true
  },
  
  // Classroom information
  classroom_id: {
    type: String,
    required: true
  },
  
  classroom_name: {
    type: String,
    required: true
  },
  
  // Metadata
  session_type: {
    type: String,
    default: 'lecture'
  },
  
  duration: {
    type: Number,
    default: 1 // 1 hour per lecture
  },
  
  // Display format: "Subject Name / Teacher Name / Classroom Name"
  formatted_display: {
    type: String
  },
  
  // Tracking
  created_at: {
    type: Date,
    default: Date.now
  },
  
  generated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
LectureScheduleSessionSchema.index({ schedule_id: 1, division: 1 });
LectureScheduleSessionSchema.index({ schedule_id: 1, day: 1, slot_number: 1 });
LectureScheduleSessionSchema.index({ teacher_id: 1, day: 1, slot_number: 1 });
LectureScheduleSessionSchema.index({ classroom_id: 1, day: 1, slot_number: 1 });

module.exports = mongoose.model('LectureScheduleSession', LectureScheduleSessionSchema);
