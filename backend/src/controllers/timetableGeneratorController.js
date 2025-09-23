const Syllabus = require('../models/Syllabus');
const Teacher = require('../models/Teacher');
const Resource = require('../models/Resource');
const TimetableRestriction = require('../models/TimetableRestriction');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const GeneratedTimetable = require('../models/GeneratedTimetable');
const TimetableSlot = require('../models/TimetableSlot');

// ✅ Start Timetable Generation Process
exports.generateTimetable = async (req, res) => {
  console.log('🚀 Starting timetable generation process...');
  
  try {
    // Phase 1: Data Validation
    console.log('📊 Phase 1: Validating system data...');
    
    const validationResult = await validateSystemData();
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'System data validation failed',
        errors: validationResult.errors,
        phase: 'validation'
      });
    }

    // Phase 2: Load Data
    console.log('📥 Phase 2: Loading system data...');
    const systemData = await loadSystemData();

    // Phase 3: Generate Mock Timetable (for now)
    console.log('🧠 Phase 3: Generating timetable...');
    const mockTimetable = generateMockTimetable(systemData);

    // Phase 4: Save Timetable
    console.log('💾 Phase 4: Saving timetable...');
    const savedTimetable = await saveTimetable(mockTimetable);

    res.json({
      success: true,
      message: 'Timetable generated successfully',
      timetable: savedTimetable,
      statistics: mockTimetable.statistics,
      generationId: savedTimetable._id
    });

  } catch (error) {
    console.error('❌ Error during timetable generation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during generation',
      error: error.message
    });
  }
};

// ✅ Get All Generated Timetables for Dashboard
exports.getAllTimetables = async (req, res) => {
  try {
    console.log('📋 Fetching all generated timetables...');
    
    const timetables = await GeneratedTimetable.find()
      .select('name generatedAt status statistics')
      .sort({ generatedAt: -1 });

    console.log(`✅ Found ${timetables.length} timetables`);
    
    res.json({
      success: true,
      timetables: timetables,
      totalCount: timetables.length
    });

  } catch (error) {
    console.error('❌ Error fetching timetables:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching timetables',
      error: error.message
    });
  }
};

// ✅ Get Specific Timetable by ID
exports.getTimetableById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching timetable with ID: ${id}`);

    const timetable = await GeneratedTimetable.findById(id);
    const slots = await TimetableSlot.find({ timetableId: id });

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    console.log('✅ Timetable fetched successfully');
    res.json({
      success: true,
      timetable: {
        ...timetable.toObject(),
        slots: slots
      }
    });

  } catch (error) {
    console.error('❌ Error fetching timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching timetable',
      error: error.message
    });
  }
};

// ✅ Save Generated Timetable (for API compatibility)
exports.saveTimetable = async (req, res) => {
  try {
    const { timetableData } = req.body;
    console.log('💾 Saving timetable via API...');

    const savedTimetable = await saveTimetable(timetableData);

    res.json({
      success: true,
      message: 'Timetable saved successfully',
      timetable: savedTimetable
    });

  } catch (error) {
    console.error('❌ Error saving timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving timetable',
      error: error.message
    });
  }
};

// ✅ Resolve Conflicts with Relaxation Options
exports.resolveConflicts = async (req, res) => {
  try {
    const { conflictResolutions } = req.body;
    console.log('🔧 Processing conflict resolutions:', conflictResolutions?.length || 0);

    // For now, return a mock successful resolution
    res.json({
      success: true,
      message: 'Conflicts resolved successfully (mock implementation)',
      appliedRelaxations: conflictResolutions || [],
      timetable: { name: 'Mock Resolved Timetable', slots: [] },
      statistics: { totalSlots: 0, totalSubjects: 0, totalTeachers: 0 }
    });

  } catch (error) {
    console.error('❌ Error resolving conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving conflicts',
      error: error.message
    });
  }
};

// ✅ Delete Generated Timetable
exports.deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting timetable with ID: ${id}`);

    const timetable = await GeneratedTimetable.findById(id);
    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    // Delete associated slots
    await TimetableSlot.deleteMany({ timetableId: id });
    
    // Delete main timetable
    await GeneratedTimetable.findByIdAndDelete(id);

    console.log('✅ Timetable deleted successfully');
    res.json({
      success: true,
      message: 'Timetable deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting timetable',
      error: error.message
    });
  }
};

// ========================================
// 🔧 HELPER FUNCTIONS
// ========================================

// ✅ Validate System Data
async function validateSystemData() {
  const errors = [];

  try {
    // Check basic requirements
    const timeConfig = await TimeSlotConfiguration.findOne({ isConfigured: true });
    if (!timeConfig) {
      errors.push('Time slot configuration not found');
    }

    const syllabusData = await Syllabus.find();
    if (syllabusData.length === 0) {
      errors.push('No syllabus data found');
    }

    const teacherData = await Teacher.find();
    if (teacherData.length === 0) {
      errors.push('No teacher data found');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };

  } catch (error) {
    console.error('❌ Error validating system data:', error);
    return {
      isValid: false,
      errors: ['System validation error: ' + error.message]
    };
  }
}

// ✅ Load All System Data
async function loadSystemData() {
  console.log('📥 Loading system data...');

  try {
    const [
      timeConfig,
      syllabusData,
      teacherData,
      resources,
      restrictions
    ] = await Promise.all([
      TimeSlotConfiguration.findOne({ isConfigured: true }),
      Syllabus.find(),
      Teacher.find(),
      Resource.find(),
      TimetableRestriction.find({ isActive: true })
    ]);

    return {
      timeConfig,
      syllabusData,
      teacherData,
      resources,
      restrictions
    };
  } catch (error) {
    console.error('❌ Error loading system data:', error);
    throw new Error('Failed to load system data: ' + error.message);
  }
}

// ✅ Generate Mock Timetable (temporary implementation)
function generateMockTimetable(systemData) {
  console.log('🎲 Generating mock timetable...');

  const divisions = [];
  systemData.syllabusData.forEach(syllabus => {
    const divisionNames = syllabus.divisions.split(', ');
    divisionNames.forEach(divName => {
      divisions.push({
        year: syllabus.academicYear,
        divisionName: divName
      });
    });
  });

  const mockSlots = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  divisions.forEach((division, divIndex) => {
    days.forEach((day, dayIndex) => {
      // Add a few mock assignments per division per day
      for (let slot = 1; slot <= 3; slot++) {
        mockSlots.push({
          division: division,
          day: day,
          slotNumber: slot,
          subject: {
            name: `Subject ${slot}`,
            type: 'TH',
            credits: 3
          },
          teacher: {
            name: `Teacher ${divIndex + 1}`,
            id: `teacher_${divIndex + 1}`
          },
          room: {
            name: `Room ${divIndex + 1}${slot}`,
            type: 'CR',
            capacity: 60
          },
          type: 'lecture',
          startTime: `${7 + slot}:00`,
          endTime: `${8 + slot}:00`
        });
      }
    });
  });

  return {
    name: `Mock_Timetable_${Date.now()}`,
    divisions: divisions,
    slots: mockSlots,
    statistics: {
      totalSubjects: 10,
      totalSlots: mockSlots.length,
      totalTeachers: systemData.teacherData.length,
      utilizationRate: 75,
      generationTime: 1500
    }
  };
}

// ✅ Save Timetable to Database
async function saveTimetable(timetableData) {
  console.log('💾 Saving generated timetable...');

  try {
    // Create main timetable document
    const newTimetable = new GeneratedTimetable({
      name: timetableData.name,
      generatedAt: new Date(),
      status: 'active',
      divisions: timetableData.divisions,
      statistics: timetableData.statistics
    });

    const savedTimetable = await newTimetable.save();

    // Save individual slots
    const slotPromises = timetableData.slots.map(slot => {
      const newSlot = new TimetableSlot({
        timetableId: savedTimetable._id,
        division: slot.division,
        day: slot.day,
        slotNumber: slot.slotNumber,
        subject: slot.subject,
        teacher: slot.teacher,
        room: slot.room,
        batch: slot.batch,
        type: slot.type,
        startTime: slot.startTime,
        endTime: slot.endTime
      });
      return newSlot.save();
    });

    await Promise.all(slotPromises);

    console.log(`✅ Timetable saved with ${timetableData.slots.length} slots`);
    
    return savedTimetable;

  } catch (error) {
    console.error('❌ Error saving timetable:', error);
    throw new Error('Failed to save timetable: ' + error.message);
  }
}
