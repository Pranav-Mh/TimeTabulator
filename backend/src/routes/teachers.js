const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher'); // Import the model

// ✅ Get all teachers (FIXED - no populate)
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find(); // ← REMOVED .populate('subjects')
    console.log('✅ Teachers fetched from MongoDB:', teachers.length);
    res.json(teachers);
  } catch (err) {
    console.error('❌ Error fetching teachers:', err);
    res.status(500).json({ error: err.message });
  }
});
// ✅ Add new teacher (IMPROVED ERROR HANDLING FOR DUPLICATES)
router.post('/', async (req, res) => {
  try {
    const { name, maxWorkload, teacherId, department, phone } = req.body; // ✅ Changed email → teacherId
    
    if (!name || !teacherId) { // ✅ Changed !email → !teacherId
      return res.status(400).json({ error: "Missing required fields: name and teacherId" });
    }

    console.log('🔥 Creating teacher in MongoDB:', req.body);
    const newTeacher = await Teacher.create({
      name,
      maxHours: maxWorkload ? Number(maxWorkload) : 20, // ✅ Map maxWorkload → maxHours
      teacherId, // ✅ Changed email → teacherId
      department,
      phone
    });

    console.log('✅ Teacher saved to MongoDB:', newTeacher);
    res.status(201).json(newTeacher);
  } catch (err) {
    console.error('❌ Error creating teacher:', err);
    
    // ✅ Handle duplicate key error (E11000) gracefully
    if (err.code === 11000) {
      // Extract field name from error message
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      
      if (field === 'teacherId') {
        return res.status(400).json({ 
          error: `Teacher ID "${value}" already exists! Please use a different Teacher ID.`,
          type: 'duplicate_error',
          field: 'teacherId'
        });
      }
    }
    
    // ✅ Handle other errors
    res.status(400).json({ error: err.message });
  }
});



// ✅ Update a teacher (FIXED - use teacherId instead of email)
router.put('/:id', async (req, res) => {
  try {
    const { name, maxWorkload, teacherId, department, phone } = req.body; // ✅ Changed email → teacherId
    
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(maxWorkload && { maxHours: Number(maxWorkload) }), // ✅ Map maxWorkload → maxHours
        ...(teacherId && { teacherId }), // ✅ Changed email → teacherId
        ...(department && { department }),
        ...(phone && { phone })
      },
      { new: true } // Return updated document
    );

    if (!updatedTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    console.log('✅ Teacher updated in MongoDB:', updatedTeacher);
    res.json(updatedTeacher);
  } catch (err) {
    console.error('❌ Error updating teacher:', err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete a teacher (same as before)
router.delete('/:id', async (req, res) => {
  try {
    const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);
    
    if (!deletedTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    console.log('✅ Teacher deleted from MongoDB:', deletedTeacher.name);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting teacher:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
