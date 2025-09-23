const mongoose = require('mongoose');

const generatedTimetableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'draft'],
    default: 'active'
  },
  divisions: [{
    year: String,
    divisionName: String,
    totalStudents: Number
  }],
  statistics: {
    totalSubjects: Number,
    totalSlots: Number,
    utilizationRate: Number,
    conflictCount: Number,
    generationTime: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('GeneratedTimetable', generatedTimetableSchema);
