// src/models/Syllabus.js
const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true
  },
  numberOfDivisions: {
    type: Number,
    required: true
  },
  divisions: {
    type: String,
    required: false
  },
  subjects: [{  // ✅ FIXED: Define subjects as array of objects, NOT array of strings
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    credits: {
      type: Number,
      required: true
    },
    hoursPerWeek: {
      type: Number,
      required: true
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Syllabus', syllabusSchema);
