// src/controllers/syllabusController.js
const Syllabus = require('../models/Syllabus');

function getDivisionNames(year, count) {
  return Array.from({length: count}, (_, i) => `${year}-${String.fromCharCode(65 + i)}`);
}

exports.saveSyllabus = async (req, res) => {
  console.log('🔥 DEBUG: saveSyllabus function called');
  console.log('🔥 DEBUG: Request body:', req.body);
  
  const { year, divisionCount, divisions, subjects } = req.body;

  if (!year || !divisionCount || !subjects || subjects.length === 0) {
    console.log('❌ DEBUG: Invalid input detected');
    return res.status(400).json({ message: "Invalid input" });
  }

  const divisionNames = divisions && divisions.length > 0 ? divisions : getDivisionNames(year, divisionCount);
  console.log('🔥 DEBUG: Division names:', divisionNames);

  try {
    console.log('🔥 DEBUG: Creating new Syllabus document...');
    
    // ✅ FIXED: Map the frontend 'hours' field to 'hoursPerWeek' for the schema
    const mappedSubjects = subjects.map(subject => ({
      name: subject.name,
      type: subject.type,
      credits: Number(subject.credits), // Ensure it's a number
      hoursPerWeek: Number(subject.hours) // Map 'hours' to 'hoursPerWeek' and ensure it's a number
    }));

    const newSyllabus = new Syllabus({
      academicYear: year,
      numberOfDivisions: Number(divisionCount), // Ensure it's a number
      divisions: divisionNames.join(', '),
      subjects: mappedSubjects // Use the properly mapped subjects
    });

    console.log('🔥 DEBUG: Mapped subjects:', mappedSubjects);
    console.log('🔥 DEBUG: About to save syllabus...');
    
    const savedSyllabus = await newSyllabus.save();
    
    console.log('✅ DEBUG: Syllabus saved successfully:', savedSyllabus);
    res.json({ 
      message: "Syllabus saved successfully", 
      data: savedSyllabus 
    });
    
  } catch (err) {
    console.error('❌ DEBUG: Error saving syllabus:', err);
    console.error('❌ DEBUG: Error details:', err.message);
    console.error('❌ DEBUG: Error stack:', err.stack);
    
    res.status(500).json({ 
      message: "Error saving syllabus", 
      error: err.message 
    });
  }
};
