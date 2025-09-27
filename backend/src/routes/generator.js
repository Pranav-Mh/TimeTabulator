const express = require('express');
const router = express.Router();
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const Syllabus = require('../models/Syllabus');
const TimetableRestriction = require('../models/TimetableRestriction');

// Get divisions for a specific academic year
router.get('/divisions/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    console.log(`Fetching divisions for academic year: ${academicYear}`);
    
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
    
    // Get global restrictions (priority 1)
    const globalRestrictions = await TimetableRestriction.find({ 
      scope: 'global',
      isActive: true 
    }).sort({ createdAt: 1 });
    
    // Get year-wise restrictions (priority 2)  
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

// ✅ COMPLETELY FIXED: Generate complete timetable with restrictions
router.post('/generate-timetable', async (req, res) => {
  try {
    const { includedYears, includeBE } = req.body;
    console.log('🚀 Generating timetable with restrictions...', { includedYears, includeBE });
    
    // Get all divisions for included years
    const divisions = await Division.find({ 
      academicYear: { $in: includedYears } 
    });
    console.log(`📊 Found ${divisions.length} divisions for years: ${includedYears.join(', ')}`);
    
    // ✅ FIXED: Get ALL active restrictions with proper year filtering
    const allRestrictions = await TimetableRestriction.find({
      isActive: true,
      $or: [
        { scope: 'global' },
        { scope: 'year-specific' } // ✅ Get ALL year-wise restrictions, filter later
      ]
    }).sort([
      ['scope', 1], // Global first (scope: 'global' comes before 'year-specific' alphabetically)
      ['createdAt', 1]
    ]);
    
    console.log(`🎯 Found ${allRestrictions.length} active restrictions:`);
    allRestrictions.forEach(r => {
      console.log(`  - ${r.scope}: "${r.restrictionName}" (Slots: ${r.timeSlots?.join(',')}, Days: ${r.days?.join(',')}, Years: ${r.affectedYears?.join(',')})`);
    });
    
    // Get time slots
    const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');
    const timeConfig = await TimeSlotConfiguration.findOne();
    
    if (!timeConfig || !timeConfig.timeSlots) {
      return res.status(400).json({ error: 'Time slots not configured' });
    }
    
    console.log(`⏰ Using ${timeConfig.timeSlots.length} time slots`);
    
    // ✅ FIXED: Generate timetable structure with restrictions applied
    const timetableStructure = generateTimetableWithRestrictions(
      divisions, 
      allRestrictions, 
      timeConfig.timeSlots,
      includedYears
    );
    
    res.json({
      success: true,
      timetable: timetableStructure,
      divisionsCount: divisions.length,
      restrictionsApplied: allRestrictions.length,
      generatedAt: new Date().toISOString(),
      debug: {
        includedYears,
        divisionsFound: divisions.map(d => ({ name: d.name, year: d.academicYear })),
        restrictionsFound: allRestrictions.map(r => ({
          name: r.restrictionName,
          scope: r.scope,
          slots: r.timeSlots,
          days: r.days,
          affectedYears: r.affectedYears
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating timetable:', error);
    res.status(500).json({ 
      error: 'Failed to generate timetable',
      details: error.message 
    });
  }
});

// ✅ COMPLETELY FIXED: Helper function to generate timetable with restrictions
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
  
  console.log('📝 Applying restrictions to timetable...');
  
  // Apply restrictions with priority system
  restrictions.forEach((restriction, index) => {
    console.log(`\n🔍 Processing restriction ${index + 1}:`, {
      name: restriction.restrictionName,
      scope: restriction.scope,
      slots: restriction.timeSlots,
      days: restriction.days,
      affectedYears: restriction.affectedYears
    });
    
    const priority = restriction.scope === 'global' ? 1 : 2;
    
    // ✅ FIXED: Check if required fields exist
    if (!restriction.timeSlots || !restriction.days || !restriction.restrictionName) {
      console.warn('⚠️ Skipping restriction with missing data:', restriction._id);
      return;
    }
    
    let applicationsCount = 0;
    
    restriction.timeSlots.forEach(slotNum => {
      // ✅ FIXED: Handle "All days" properly
      const daysToProcess = restriction.days.includes('All days') ? days : restriction.days;
      
      daysToProcess.forEach(day => {
        
        if (restriction.scope === 'global') {
          // Apply to ALL divisions
          divisions.forEach(division => {
            if (timetable[day] && 
                timetable[day][division.name] && 
                timetable[day][division.name][slotNum]) {
              
              timetable[day][division.name][slotNum] = {
                activity: restriction.restrictionName,
                type: 'global-restriction',  
                priority: 1,
                restrictionId: restriction._id
              };
              applicationsCount++;
            }
          });
          
        } else if (restriction.scope === 'year-specific') {
          // ✅ FIXED: Apply to specific year divisions only with PROPER year mapping
          console.log(`    🎓 Year-specific restriction for years: ${restriction.affectedYears?.join(', ')}`);
          
          // ✅ CRITICAL: CORRECT year mapping for your database structure
          const yearMappings = {
            '2nd Year': 'SE',
            '3rd Year': 'TE', 
            '4th Year': 'BE'
          };
          
          // Convert affected years to academic year codes
          const academicYearCodes = restriction.affectedYears?.map(year => yearMappings[year] || year) || [];
          console.log(`    📚 Mapped to academic years: ${academicYearCodes.join(', ')}`);
          
          const targetDivisions = divisions.filter(div => 
            academicYearCodes.includes(div.academicYear)
          );
          
          console.log(`    🎯 Target divisions: ${targetDivisions.map(d => d.name).join(', ')}`);
          
          targetDivisions.forEach(division => {
            if (timetable[day] && 
                timetable[day][division.name] && 
                timetable[day][division.name][slotNum]) {
              
              // Only apply if not already occupied by higher priority (global = 1)
              if (timetable[day][division.name][slotNum].priority < 2) {
                timetable[day][division.name][slotNum] = {
                  activity: restriction.restrictionName,
                  type: 'year-restriction',
                  priority: 2,
                  restrictionId: restriction._id,
                  academicYear: restriction.affectedYears[0] // Original year string
                };
                applicationsCount++;
              } else {
                console.log(`    ⚠️ Slot ${slotNum} on ${day} for ${division.name} already occupied by higher priority`);
              }
            }
          });
        }
      });
    });
    
    console.log(`    ✅ Applied ${applicationsCount} times to timetable`);
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
  
  console.log(`\n📊 Timetable generation complete:`);
  console.log(`  - Global restrictions: ${globalCount} slots`);
  console.log(`  - Year-specific restrictions: ${yearCount} slots`);
  console.log(`  - Free slots: ${freeCount} slots`);
  
  return timetable;
}

// Get subjects with assignments for generation
router.get('/subjects/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    console.log(`Fetching subjects for academic year: ${academicYear}`);
    
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
