const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['CR', 'LAB'],
    required: true
  },
  capacity: {
    type: Number,
    default: 60
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resource', ResourceSchema);
