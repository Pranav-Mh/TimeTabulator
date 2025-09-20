const Subject = require("../models/Subject");

// Get all subjects
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    console.log('✅ Subjects fetched:', subjects.length);
    res.json(subjects);
  } catch (err) {
    console.error('❌ Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add new subject
exports.addSubject = async (req, res) => {
  try {
    console.log('🔥 Adding subject:', req.body);
    const subject = await Subject.create(req.body);
    console.log('✅ Subject created:', subject);
    res.json(subject);
  } catch (err) {
    console.error('❌ Error creating subject:', err);
    res.status(400).json({ error: err.message });
  }
};

// Update subject
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('✅ Subject updated:', subject);
    res.json(subject);
  } catch (err) {
    console.error('❌ Error updating subject:', err);
    res.status(400).json({ error: err.message });
  }
};

// Delete subject
exports.deleteSubject = async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    console.log('✅ Subject deleted');
    res.json({ message: "Subject deleted successfully" });
  } catch (err) {
    console.error('❌ Error deleting subject:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json(subject);
  } catch (err) {
    console.error('❌ Error fetching subject:', err);
    res.status(400).json({ error: err.message });
  }
};
