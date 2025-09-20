const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema({
  teacherId: { 
    type: String, 
    required: true, 
    unique: true  // ✅ Unique constraint on teacherId, not email
  },
  name: { 
    type: String, 
    required: true 
  },
  department: {
    type: String,
    required: true
  },
  maxHours: { 
    type: Number, 
    default: 20 
  },
  subjects: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Subject" 
  }],
  phone: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Teacher", TeacherSchema);
