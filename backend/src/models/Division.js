const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  academicYear: {
    type: String,
    enum: ['SE', 'TE', 'BE'],
    required: true
  },
  syllabusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Syllabus',
    required: true
  },
  batches: [{
    name: String, // SE-A1, SE-A2, SE-A3
    batchNumber: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Division', DivisionSchema);
