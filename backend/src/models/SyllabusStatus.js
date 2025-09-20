const mongoose = require('mongoose');

const SyllabusStatusSchema = new mongoose.Schema({
  seCompleted: {
    type: Boolean,
    default: false
  },
  teCompleted: {
    type: Boolean,
    default: false
  },
  beCompleted: {
    type: Boolean,
    default: false
  },
  lectureAccessAllowed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Static method to check if both SE and TE are completed
SyllabusStatusSchema.methods.updateLectureAccess = function() {
  this.lectureAccessAllowed = this.seCompleted && this.teCompleted;
  return this.save();
};

module.exports = mongoose.model('SyllabusStatus', SyllabusStatusSchema);
