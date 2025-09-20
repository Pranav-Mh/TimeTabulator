const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['CR', 'LAB'],
    required: true
  },
  capacity: {
    type: Number,
    default: 60,
    min: 1,
    max: 200
  },
  isActive: {
    type: Boolean,
    default: true
  },
  location: {
    type: String,
    default: ''
  },
  equipment: [{
    type: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Resource', ResourceSchema);
