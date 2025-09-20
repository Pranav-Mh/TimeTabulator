const Teacher = require("../models/Teacher");

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate("subjects");
    console.log('✅ Teachers fetched:', teachers.length);
    res.json(teachers);
  } catch (err) {
    console.error('❌ Error fetching teachers:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add new teacher
exports.addTeacher = async (req, res) => {
  try {
    console.log('🔥 Adding teacher:', req.body);
    const teacher = await Teacher.create(req.body);
    console.log('✅ Teacher created:', teacher);
    res.json(teacher);
  } catch (err) {
    console.error('❌ Error creating teacher:', err);
    res.status(400).json({ error: err.message });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('✅ Teacher updated:', teacher);
    res.json(teacher);
  } catch (err) {
    console.error('❌ Error updating teacher:', err);
    res.status(400).json({ error: err.message });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    console.log('✅ Teacher deleted');
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error('❌ Error deleting teacher:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate("subjects");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.json(teacher);
  } catch (err) {
    console.error('❌ Error fetching teacher:', err);
    res.status(400).json({ error: err.message });
  }
};
