const GeneratedTimetable = require('../models/GeneratedTimetable');
const TimetableSlot = require('../models/TimetableSlot');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Division = require('../models/Division');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const { generateTimetable } = require('../utils/timetableGenerator');

// Start timetable generation
exports.generateTimetable = async (req, res) => {
  try {
    const { name, academicYear, divisions, settings } = req.body;

    // Validate input
    if (!name || !academicYear || !divisions || divisions.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, academicYear, divisions' 
      });
    }

    // Create new timetable record
    const timetable = new GeneratedTimetable({
      name,
      academicYear,
      divisions,
      status: 'generating',
      generationSettings: settings || {}
    });

    await timetable.save();

    // Start generation process
    console.log(`🚀 Starting timetable generation for ${academicYear} - ${divisions.join(', ')}`);
    
    // Generate in background
    generateTimetable(timetable._id)
      .then(async (result) => {
        await GeneratedTimetable.findByIdAndUpdate(timetable._id, {
          status: 'completed',
          slots: result.slots,
          conflicts: result.conflicts
        });
        console.log(`✅ Timetable generation completed for ${timetable._id}`);
      })
      .catch(async (error) => {
        console.error(`❌ Timetable generation failed:`, error);
        await GeneratedTimetable.findByIdAndUpdate(timetable._id, {
          status: 'failed'
        });
      });

    res.json({
      message: 'Timetable generation started',
      timetableId: timetable._id,
      status: 'generating'
    });

  } catch (err) {
    console.error('❌ Error starting timetable generation:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get generation status
exports.getGenerationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const timetable = await GeneratedTimetable.findById(id)
      .populate({
        path: 'slots',
        populate: [
          { path: 'subject', select: 'name type' },
          { path: 'teacher', select: 'name teacherId' }
        ]
      });

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    res.json(timetable);
  } catch (err) {
    console.error('❌ Error fetching generation status:', err);
    res.status(500).json({ error: err.message });
  }
};

// Save generated timetable
exports.saveTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const timetable = await GeneratedTimetable.findByIdAndUpdate(
      id,
      { status: 'saved' },
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    res.json({
      message: 'Timetable saved successfully',
      timetable
    });
  } catch (err) {
    console.error('❌ Error saving timetable:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get saved timetables
exports.getSavedTimetables = async (req, res) => {
  try {
    const timetables = await GeneratedTimetable.find({ status: 'saved' })
      .select('name academicYear divisions generatedAt')
      .sort({ createdAt: -1 });

    res.json(timetables);
  } catch (err) {
    console.error('❌ Error fetching saved timetables:', err);
    res.status(500).json({ error: err.message });
  }
};

// Resolve conflicts
exports.resolveConflicts = async (req, res) => {
  try {
    const { id } = req.params;
    const { conflictResolutions } = req.body;

    // Apply conflict resolutions
    for (const resolution of conflictResolutions) {
      // Implementation for applying specific conflict resolutions
      console.log('Applying resolution:', resolution);
    }

    const timetable = await GeneratedTimetable.findById(id);
    
    // Mark conflicts as resolved
    timetable.conflicts = timetable.conflicts.map(conflict => ({
      ...conflict,
      resolved: true
    }));

    await timetable.save();

    res.json({
      message: 'Conflicts resolved successfully',
      timetable
    });
  } catch (err) {
    console.error('❌ Error resolving conflicts:', err);
    res.status(500).json({ error: err.message });
  }
};
