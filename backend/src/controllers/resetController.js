const Syllabus = require('../models/Syllabus');
const Division = require('../models/Division');
const Teacher = require('../models/Teacher');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
const TimetableRestriction = require('../models/TimetableRestriction');
const Subject = require('../models/Subject');
const Resource = require('../models/Resource');

exports.resetWorkingData = async (req, res) => {
  try {
    await Promise.all([
      Syllabus.deleteMany({}),
      Division.deleteMany({}),
      Subject.deleteMany({}),          // ✅ clears old subjects
      Teacher.deleteMany({}),
      LectureAssignment.deleteMany({}),
      LabAssignment.deleteMany({}),
      Resource.deleteMany({}),         // ✅ clears classrooms & labs
      TimeSlotConfiguration.deleteMany({}),
      TimetableRestriction.deleteMany({})
    ]);

    res.json({
      success: true,
      message: 'Working data reset successfully'
    });
  } catch (err) {
    console.error('❌ Reset failed:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
