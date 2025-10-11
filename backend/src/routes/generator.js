const express = require('express');
const router = express.Router();
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const Syllabus = require('../models/Syllabus');
const TimetableRestriction = require('../models/TimetableRestriction');
const { runLabScheduler } = require('../controllers/labSchedulerController');

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

// ✅ ENHANCED: Get latest lab schedule with proper teacher names
router.get('/lab-schedule/latest', async (req, res) => {
  try {
    console.log('🔍 Fetching latest lab schedule for TimetableGrid display...');
    
    const LabScheduleSession = require('../models/LabScheduleSession');
    
    // Get all lab sessions with populated teacher data
    const sessions = await LabScheduleSession.find()
      .populate('teacher_id', 'name teacherId') // Populate teacher info
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
    
    // ✅ ENHANCED: Resolve teacher names for proper display
    const enhancedSessions = sessions.map(session => {
      // Get teacher name from populated data or stored fields
      const teacherName = session.teacherName || 
                         session.teacher_name ||
                         session.teacher_id?.name ||
                         session.teacherDisplayId ||
                         session.teacher_display_id ||
                         `Teacher-${session.teacher_id?.teacherId || 'Unknown'}`;
      
      return {
        ...session,
        teacherName: teacherName,
        teacher_name: teacherName, // For compatibility
        teacherDisplayId: teacherName,
        teacher_display_id: teacherName,
        // Enhanced formatted display
        formattedDisplay: `${session.subject} | ${teacherName} | ${session.lab_id}`,
        formatted: session.formatted || `${session.subject}/${teacherName}/${session.batch}/${session.lab_id}`
      };
    });
    
    // Format data for TimetableGrid component
    const formattedResponse = {
      success: true,
      schedule_matrix: enhancedSessions,
      sessions: enhancedSessions,
      total_sessions: enhancedSessions.length,
      message: `Lab schedule with ${enhancedSessions.length} sessions`,
      debug_info: {
        sample_session: enhancedSessions[0],
        total_sessions: enhancedSessions.length,
        divisions_found: [...new Set(enhancedSessions.map(s => s.division))],
        days_found: [...new Set(enhancedSessions.map(s => s.day))],
        teacher_resolution: {
          first_session_teacher: enhancedSessions[0]?.teacherName,
          teacher_fields_available: Object.keys(enhancedSessions[0] || {}).filter(k => k.includes('teacher'))
        }
      }
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

// COMPLETELY FIXED Generate complete timetable with lab requirement check
// ❗️ REPLACE your existing /generate-timetable route with this one.

router.post('/generate-timetable', async (req, res) => {
    try {
        const { includedYears, includeBE } = req.body;
        console.log('Generating timetable with restrictions and labs...', includedYears, includeBE);

        // (No changes to the code that gets divisions, restrictions, and time slots)
        const divisions = await Division.find({ academicYear: { $in: includedYears } });
        const allRestrictions = await TimetableRestriction.find({
            isActive: true,
            $or: [{ scope: 'global' }, { scope: 'year-specific' }]
        }).sort({ scope: 1, createdAt: 1 });
        const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
        const timeConfig = await TimeSlotConfiguration.findOne();
        if (!timeConfig || !timeConfig.timeSlots) {
            return res.status(400).json({ error: 'Time slots not configured' });
        }

        console.log('🔬 Starting lab scheduling integration...');
        
        let labResult = null; // ✅ Define labResult here
        try {
            labResult = await runLabScheduler();
            
            if (!labResult.success && labResult.error === 'INSUFFICIENT_LAB_CAPACITY') {
                console.log('❌ Lab scheduling failed: Insufficient lab capacity');
                return res.status(400).json({
                    success: false,
                    error: 'INSUFFICIENT_LAB_CAPACITY',
                    labRequirementError: labResult.labRequirementError
                });
            }

            console.log('✅ Lab scheduling completed successfully');
            console.log(`📊 Scheduled ${labResult.schedule_matrix?.length || 0} lab sessions`);

        } catch (labError) {
            console.warn('⚠️ Lab scheduling failed:', labError.message);
        }

        const timetableStructure = generateTimetableWithRestrictions(
            divisions, allRestrictions, timeConfig.timeSlots, includedYears
        );

        // ✅ FINAL FIX: Include the entire labResult in the response
        res.json({
            success: true,
            timetable: timetableStructure,
            labScheduleResult: labResult, // <-- THIS IS THE CRITICAL ADDITION
            divisionsCount: divisions.length,
            restrictionsApplied: allRestrictions.length,
            generatedAt: new Date().toISOString(),
            debug: { /* ... debug info ... */ }
        });

    } catch (error) {
        console.error("Error generating timetable:", error);
        res.status(500).json({ 
            error: "Failed to generate timetable",
            details: error.message
        });
    }
});

// Helper function to generate timetable with restrictions
function generateTimetableWithRestrictions(divisions, restrictions, timeSlots, includedYears) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timetable = {};

  console.log('🏗️ Initializing empty timetable structure...');
  console.log('Divisions:', divisions.map(d => `${d.name} (${d.academicYear})`));

  // Initialize empty timetable
  days.forEach(day => {
    timetable[day] = {};
    divisions.forEach(division => {
      timetable[day][division.name] = {};
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
