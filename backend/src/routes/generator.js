const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const Syllabus = require('../models/Syllabus');
const TimetableRestriction = require('../models/TimetableRestriction');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
const { runLabScheduler } = require('../controllers/labSchedulerController');
const { runLectureScheduler } = require('../controllers/lectureSchedulerController');

// Get divisions for a specific academic year
router.get('/divisions/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    console.log('Fetching divisions for academic year:', academicYear);

    const divisions = await Division.find({ academicYear })
      .populate('syllabusId')
      .sort({ name: 1 });

    console.log(`Found ${divisions.length} divisions for ${academicYear}:`, divisions.map(d => d.name));

    if (divisions.length === 0) {
      return res.status(404).json({
        error: `No divisions found for academic year ${academicYear}`,
        suggestions: [
          'Check if syllabus is completed',
          'Verify divisions were created during syllabus setup'
        ]
      });
    }

    res.json(divisions);
  } catch (error) {
    console.error('Error fetching divisions:', error);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

// Get all restrictions for timetable generation
router.get('/restrictions', async (req, res) => {
  try {
    console.log('Fetching all timetable restrictions for generation...');
    
    const globalRestrictions = await TimetableRestriction.find({
      scope: 'global',
      isActive: true
    }).sort({ createdAt: 1 });

    const yearWiseRestrictions = await TimetableRestriction.find({
      scope: 'year-specific',
      isActive: true
    }).sort({ createdAt: 1 });

    console.log(`Found ${globalRestrictions.length} global restrictions`);
    console.log(`Found ${yearWiseRestrictions.length} year-wise restrictions`);

    res.json({
      global: globalRestrictions,
      yearWise: yearWiseRestrictions,
      totalRestrictions: globalRestrictions.length + yearWiseRestrictions.length
    });
  } catch (error) {
    console.error('Error fetching restrictions:', error);
    res.status(500).json({ error: 'Failed to fetch restrictions' });
  }
});

// Get latest lab schedule
router.get('/lab-schedule/latest', async (req, res) => {
  try {
    console.log('🔍 Fetching latest lab schedule for TimetableGrid display...');
    
    const LabScheduleSession = require('../models/LabScheduleSession');
    
    const sessions = await LabScheduleSession.find()
      .populate('teacher_id', 'name teacherId')
      .sort({ createdAt: -1 })
      .lean();
    
    if (sessions.length === 0) {
      console.log('ℹ️ No lab schedule found in database');
      return res.status(404).json({
        success: false,
        message: 'No lab schedule found'
      });
    }
    
    console.log(`✅ Found ${sessions.length} lab sessions for TimetableGrid display`);
    
    const enhancedSessions = sessions.map(session => {
      const teacherName = session.teacherName || 
                         session.teacher_name ||
                         session.teacher_id?.name ||
                         session.teacherDisplayId ||
                         session.teacher_display_id ||
                         `Teacher-${session.teacher_id?.teacherId || 'Unknown'}`;
      
      return {
        ...session,
        teacherName: teacherName,
        teacher_name: teacherName,
        teacherDisplayId: teacherName,
        teacher_display_id: teacherName,
        formattedDisplay: `${session.subject} | ${teacherName} | ${session.lab_id}`,
        formatted: session.formatted || `${session.subject}/${teacherName}/${session.batch}/${session.lab_id}`
      };
    });
    
    const formattedResponse = {
      success: true,
      schedule_matrix: enhancedSessions,
      sessions: enhancedSessions,
      total_sessions: enhancedSessions.length,
      message: `Lab schedule with ${enhancedSessions.length} sessions`
    };
    
    res.json(formattedResponse);
    
  } catch (error) {
    console.error('❌ Error fetching lab schedule for display:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ FIXED: Generate complete timetable with proper structure
router.post('/generate-timetable', async (req, res) => {
  try {
    const { years, includeFourthYear } = req.body;
    
    console.log('🎯 Starting Timetable Generation...');
    
    // Determine academic years
    let academicYears = ['SE', 'TE'];
    if (includeFourthYear) {
      academicYears.push('BE');
    }
    
    // Fetch divisions
    const divisions = await Division.find({
      academicYear: { $in: academicYears }
    }).populate('syllabusId');
    
    if (divisions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No divisions found for selected years'
      });
    }
    
    // ✅ ADDED: Fetch time slots and restrictions
    const timeSlotConfig = await TimeSlotConfiguration.findOne({});
    if (!timeSlotConfig || !timeSlotConfig.timeSlots) {
      return res.status(400).json({
        success: false,
        error: 'Time slot configuration not found. Please configure time slots first.'
      });
    }
    
    const restrictions = await TimetableRestriction.find({ isActive: true });
    
    console.log(`📊 Found ${restrictions.length} active restrictions`);
    console.log(`🕐 Found ${timeSlotConfig.timeSlots.length} time slots`);
    
    // ✅ FIXED: Generate proper timetable structure with restrictions
    const timetableStructure = generateTimetableWithRestrictions(
      divisions,
      restrictions,
      timeSlotConfig.timeSlots,
      academicYears
    );
    
    // Generate unique schedule ID
    const scheduleId = new mongoose.Types.ObjectId();
    
    // STEP 1: Run LAB Scheduling
    console.log('🔬 STEP 1: Running Lab Scheduling...');
    const labScheduleResult = await runLabScheduler({
      academicYears,
      divisions,
      scheduleId
    });
    
    console.log('✅ Lab Scheduling Completed');
    
    // STEP 2: Run LECTURE Scheduling (AFTER labs)
    console.log('🎓 STEP 2: Running Lecture Scheduling...');
    const lectureScheduleResult = await runLectureScheduler({
      academicYears,
      divisions,
      scheduleId
    });
    
    console.log('✅ Lecture Scheduling Completed');
    
    // Return combined results
    res.json({
      success: true,
      message: 'Timetable generated successfully with labs and lectures',
      timetable: timetableStructure, // ✅ Now includes proper day/division/slot structure
      labScheduleResult,
      lectureScheduleResult,
      metadata: {
        scheduleId,
        academicYears,
        divisionsCount: divisions.length,
        restrictionsApplied: restrictions.length,
        labSessions: labScheduleResult.scheduledLabs?.length || 0,
        lectureSessions: lectureScheduleResult.scheduledLectures?.length || 0,
        totalSessions: (labScheduleResult.scheduledLabs?.length || 0) + (lectureScheduleResult.scheduledLectures?.length || 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Timetable Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ Helper function to generate timetable with restrictions
function generateTimetableWithRestrictions(divisions, restrictions, timeSlots, includedYears) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timetable = {};

  console.log('🏗️ Initializing empty timetable structure...');
  console.log('Divisions:', divisions.map(d => `${d.name} (${d.academicYear})`));

  // ✅ Initialize empty timetable with DIVISION NAMES as keys
  days.forEach(day => {
    timetable[day] = {};
    divisions.forEach(division => {
      timetable[day][division.name] = {}; // ✅ Use division.name (e.g., "SE-A", "TE-B")
      timeSlots.forEach(slot => {
        timetable[day][division.name][slot.slotNumber] = {
          activity: null,
          type: 'free',
          priority: 0
        };
      });
    });
  });

  console.log('📝 Applying restrictions to timetable...\n');

  // Apply restrictions with priority system
  restrictions.forEach((restriction, index) => {
    console.log(`🔍 Processing restriction ${index + 1}:`);
    console.log(`  name: '${restriction.restrictionName}',`);
    console.log(`  scope: '${restriction.scope}',`);
    console.log(`  slots: [${restriction.timeSlots}],`);
    console.log(`  days: [${restriction.days}],`);
    console.log(`  affectedYears: [${restriction.affectedYears}]`);

    const priority = restriction.scope === 'global' ? 1 : 2;

    if (!restriction.timeSlots || !restriction.days || !restriction.restrictionName) {
      console.warn('⚠️ Skipping restriction with missing data:', restriction.id);
      return;
    }

    let applicationsCount = 0;

    restriction.timeSlots.forEach(slotNum => {
      const daysToProcess = restriction.days.includes('All days') ? days : restriction.days;

      daysToProcess.forEach(day => {
        if (restriction.scope === 'global') {
          // Apply to ALL divisions
          divisions.forEach(division => {
            if (timetable[day] && timetable[day][division.name] && timetable[day][division.name][slotNum]) {
              timetable[day][division.name][slotNum] = {
                activity: restriction.restrictionName,
                type: 'global-restriction',
                priority: 1,
                restrictionId: restriction.id
              };
              applicationsCount++;
            }
          });
        } else if (restriction.scope === 'year-specific') {
          console.log(`    🎓 Year-specific restriction for years: ${restriction.affectedYears?.join(', ')}`);
          
          const yearMappings = {
            '2nd Year': 'SE',
            '3rd Year': 'TE', 
            '4th Year': 'BE'
          };

          const academicYearCodes = restriction.affectedYears?.map(year => yearMappings[year] || year);
          console.log(`    📚 Mapped to academic years: ${academicYearCodes.join(', ')}`);

          const targetDivisions = divisions.filter(div => academicYearCodes.includes(div.academicYear));
          console.log(`    🎯 Target divisions: ${targetDivisions.map(d => d.name).join(', ')}`);

          targetDivisions.forEach(division => {
            if (timetable[day] && timetable[day][division.name] && timetable[day][division.name][slotNum]) {
              if (timetable[day][division.name][slotNum].priority < 2) {
                timetable[day][division.name][slotNum] = {
                  activity: restriction.restrictionName,
                  type: 'year-restriction',
                  priority: 2,
                  restrictionId: restriction.id,
                  academicYear: restriction.affectedYears[0]
                };
                applicationsCount++;
              }
            }
          });
        }
      });
    });

    console.log(`    ✅ Applied ${applicationsCount} times to timetable\n`);
  });

  // Debug: Count applied restrictions
  let globalCount = 0, yearCount = 0, freeCount = 0;
  days.forEach(day => {
    divisions.forEach(division => {
      timeSlots.forEach(slot => {
        const cell = timetable[day][division.name][slot.slotNumber];
        if (cell.type === 'global-restriction') globalCount++;
        else if (cell.type === 'year-restriction') yearCount++;
        else if (cell.type === 'free') freeCount++;
      });
    });
  });

  console.log('📊 Timetable generation complete:');
  console.log(`  - Global restrictions: ${globalCount} slots`);
  console.log(`  - Year-specific restrictions: ${yearCount} slots`);
  console.log(`  - Free slots: ${freeCount} slots`);

  return timetable;
}

// Get subjects with assignments for generation
router.get('/subjects/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    console.log('Fetching subjects for academic year:', academicYear);

    const subjects = await Subject.find({ academicYear });
    const lectureAssignments = await LectureAssignment.find({ academicYear })
      .populate('subjectId')
      .populate('teacherId') 
      .populate('divisionId');
    const labAssignments = await LabAssignment.find({ academicYear })
      .populate('subjectId')
      .populate('teacherId')
      .populate('divisionId');

    res.json({
      subjects,
      lectureAssignments,
      labAssignments
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Get teachers
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    console.log(`✅ Teachers fetched from MongoDB: ${teachers.length}`);
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Get generator readiness status
router.get('/status', async (req, res) => {
  try {
    const syllabuses = await Syllabus.find({ isCompleted: true });
    const teachers = await Teacher.find();
    const lectureAssignments = await LectureAssignment.find();
    const labAssignments = await LabAssignment.find();
    const restrictions = await TimetableRestriction.find({ isActive: true });

    const status = {
      syllabusReady: syllabuses.length > 0,
      teachersReady: teachers.length > 0,
      lectureAssignmentsReady: lectureAssignments.length > 0,
      labAssignmentsReady: labAssignments.length > 0,
      restrictionsConfigured: restrictions.length > 0,
      allReady: syllabuses.length > 0 && teachers.length > 0 && 
                lectureAssignments.length > 0 && labAssignments.length > 0
    };

    res.json(status);
  } catch (error) {
    console.error('Error checking generator status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
