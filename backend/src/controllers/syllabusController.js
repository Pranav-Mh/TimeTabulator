// src/controllers/syllabusController.js
const Syllabus = require('../models/Syllabus');

function getDivisionNames(year, count) {
  return Array.from({length: count}, (_, i) => `${year}-${String.fromCharCode(65 + i)}`);
}

// ✅ EXISTING: Save syllabus function (your current code)
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

    // ✅ FIXED: Check if syllabus already exists for this year
    let existingSyllabus = await Syllabus.findOne({ academicYear: year });
    
    if (existingSyllabus) {
      // Update existing syllabus
      existingSyllabus.numberOfDivisions = Number(divisionCount);
      existingSyllabus.divisions = divisionNames.join(', ');
      existingSyllabus.subjects = mappedSubjects;
      
      const updatedSyllabus = await existingSyllabus.save();
      console.log('✅ DEBUG: Syllabus updated successfully:', updatedSyllabus);
      
      res.json({ 
        message: "Syllabus updated successfully", 
        data: updatedSyllabus 
      });
    } else {
      // Create new syllabus
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
    }
    
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

// ✅ NEW: Get syllabus function (this was missing!)
exports.getSyllabus = async (req, res) => {
  console.log('🔥 DEBUG: getSyllabus function called');
  console.log('🔥 DEBUG: Request params:', req.params);
  
  const { year } = req.params;

  if (!year) {
    console.log('❌ DEBUG: No year provided');
    return res.status(400).json({ message: "Year parameter is required" });
  }

  try {
    console.log('🔥 DEBUG: Looking for syllabus with year:', year);
    
    const syllabus = await Syllabus.findOne({ academicYear: year });
    
    if (!syllabus) {
      console.log('❌ DEBUG: No syllabus found for year:', year);
      return res.status(404).json({ 
        message: `No syllabus found for academic year ${year}`,
        academicYear: year,
        numberOfDivisions: 0,
        divisions: '',
        subjects: []
      });
    }

    console.log('✅ DEBUG: Syllabus found:', syllabus);
    
    // ✅ FIXED: Return data in the format that frontend expects
    const responseData = {
      academicYear: syllabus.academicYear,
      numberOfDivisions: syllabus.numberOfDivisions,
      divisions: syllabus.divisions, // This is the string "SE-A, SE-B, SE-C"
      subjects: syllabus.subjects
    };
    
    console.log('✅ DEBUG: Returning syllabus data:', responseData);
    res.json(responseData);
    
  } catch (err) {
    console.error('❌ DEBUG: Error fetching syllabus:', err);
    console.error('❌ DEBUG: Error details:', err.message);
    
    res.status(500).json({ 
      message: "Error fetching syllabus", 
      error: err.message 
    });
  }
};

// ✅ NEW: Get all syllabuses function (optional, for debugging)
exports.getAllSyllabuses = async (req, res) => {
  try {
    console.log('🔥 DEBUG: getAllSyllabuses function called');
    
    const syllabuses = await Syllabus.find({});
    
    console.log('✅ DEBUG: Found syllabuses:', syllabuses.length);
    res.json({
      count: syllabuses.length,
      data: syllabuses
    });
    
  } catch (err) {
    console.error('❌ DEBUG: Error fetching all syllabuses:', err);
    res.status(500).json({ 
      message: "Error fetching syllabuses", 
      error: err.message 
    });
  }
};

// ✅ NEW: Delete syllabus function (optional, for management)
exports.deleteSyllabus = async (req, res) => {
  const { year } = req.params;

  try {
    console.log('🔥 DEBUG: deleteSyllabus function called for year:', year);
    
    const deletedSyllabus = await Syllabus.findOneAndDelete({ academicYear: year });
    
    if (!deletedSyllabus) {
      return res.status(404).json({ 
        message: `No syllabus found for academic year ${year}` 
      });
    }

    console.log('✅ DEBUG: Syllabus deleted successfully:', deletedSyllabus);
    res.json({ 
      message: "Syllabus deleted successfully", 
      data: deletedSyllabus 
    });
    
  } catch (err) {
    console.error('❌ DEBUG: Error deleting syllabus:', err);
    res.status(500).json({ 
      message: "Error deleting syllabus", 
      error: err.message 
    });
  }
};
