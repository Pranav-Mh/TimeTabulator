const mongoose = require('mongoose');

const SyllabusSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true,
    unique: true
  },
  numDivisions: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Syllabus', SyllabusSchema);
