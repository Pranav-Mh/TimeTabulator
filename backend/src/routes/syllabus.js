const express = require('express');
const router = express.Router();
const Syllabus = require('../models/Syllabus');
const Subject = require('../models/Subject');
const Division = require('../models/Division');
const SyllabusStatus = require('../models/SyllabusStatus');

// Get syllabus completion status
router.get('/status', async (req, res) => {
  try {
    let status = await SyllabusStatus.findOne();
    if (!status) {
      status = new SyllabusStatus();
      await status.save();
    }
    res.json(status);
  } catch (err) {
    console.error('❌ Error fetching syllabus status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get syllabus by academic year
router.get('/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const syllabus = await Syllabus.findOne({ academicYear: year }).populate('subjects');
    
    if (!syllabus) {
      return res.status(404).json({ error: `${year} syllabus not found` });
    }
    
    res.json(syllabus);
  } catch (err) {
    console.error('❌ Error fetching syllabus:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create/Update syllabus with course code validation
router.post('/', async (req, res) => {
  try {
    const { academicYear, numDivisions, subjects } = req.body;
    
    // Validation
    if (!academicYear || !numDivisions || !subjects || subjects.length === 0) {
      return res.status(400).json({ 
        error: "Missing required fields: academicYear, numDivisions, and subjects" 
      });
    }

    // Validate subject structure
    for (const subject of subjects) {
      if (!subject.courseCode || !subject.name || !subject.credits || !subject.hoursPerWeek) {
        return res.status(400).json({ 
          error: "Each subject must have courseCode, name, credits, and hoursPerWeek" 
        });
      }
    }

    // Check for duplicate course codes within the same submission
    const courseCodes = subjects.map(s => s.courseCode.toUpperCase());
    const duplicateCodesInSubmission = courseCodes.filter((code, index) => courseCodes.indexOf(code) !== index);
    
    if (duplicateCodesInSubmission.length > 0) {
      return res.status(400).json({ 
        error: `Duplicate course codes found: ${[...new Set(duplicateCodesInSubmission)].join(', ')}` 
      });
    }

    // Check if syllabus already exists
    let syllabus = await Syllabus.findOne({ academicYear });
    
    if (syllabus) {
      // Delete existing subjects
      await Subject.deleteMany({ syllabusId: syllabus._id });
      // Delete existing divisions
      await Division.deleteMany({ syllabusId: syllabus._id });
    } else {
      // Create new syllabus
      syllabus = new Syllabus({
        academicYear,
        numDivisions,
        subjects: []
      });
    }

    // Update syllabus
    syllabus.numDivisions = numDivisions;
    await syllabus.save();

    console.log('✅ Syllabus saved:', syllabus);

    // Create subjects with duplicate detection
    const subjectIds = [];
    const createdCourseCodes = [];
    
    for (const subjectData of subjects) {
      // Check if course code already exists for this academic year (from previous syllabuses)
      const existingSubject = await Subject.findOne({
        courseCode: subjectData.courseCode.toUpperCase(),
        academicYear,
        syllabusId: { $ne: syllabus._id } // Exclude current syllabus
      });

      if (existingSubject) {
        // Clean up created subjects if validation fails
        await Subject.deleteMany({ syllabusId: syllabus._id });
        return res.status(400).json({
          error: `Course code "${subjectData.courseCode}" already exists for ${academicYear} academic year`
        });
      }

      try {
        const subject = new Subject({
          ...subjectData,
          courseCode: subjectData.courseCode.toUpperCase(),
          academicYear,
          syllabusId: syllabus._id
        });
        
        await subject.save();
        subjectIds.push(subject._id);
        createdCourseCodes.push(subject.courseCode);
        
      } catch (error) {
        // Clean up created subjects if validation fails
        await Subject.deleteMany({ syllabusId: syllabus._id });
        
        if (error.code === 11000) { // MongoDB duplicate key error
          const duplicateField = error.keyPattern?.courseCode ? 'courseCode' : 'unknown field';
          return res.status(400).json({
            error: `Duplicate ${duplicateField}: ${subjectData.courseCode} already exists`
          });
        }
        throw error;
      }
    }

    // Update syllabus with subject IDs
    syllabus.subjects = subjectIds;
    syllabus.isCompleted = true;
    await syllabus.save();

    // Create divisions with batches
    await createDivisions(academicYear, numDivisions, syllabus._id);

    // Update syllabus completion status
    await updateSyllabusStatus(academicYear);

    console.log('✅ Syllabus completed for:', academicYear);
    console.log('✅ Created course codes:', createdCourseCodes);
    
    res.status(201).json({
      syllabus,
      message: `Successfully created syllabus with ${createdCourseCodes.length} subjects`,
      courseCodes: createdCourseCodes
    });

  } catch (err) {
    console.error('❌ Error creating syllabus:', err);
    res.status(400).json({ error: err.message });
  }
});

// Helper function to create divisions and batches
const createDivisions = async (academicYear, numDivisions, syllabusId) => {
  const divisions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  
  for (let i = 0; i < numDivisions; i++) {
    const divisionName = `${academicYear}-${divisions[i]}`;
    
    // Create batches (3 batches per division)
    const batches = [];
    for (let j = 1; j <= 3; j++) {
      batches.push({
        name: `${divisionName}${j}`,
        batchNumber: j
      });
    }
    
    const division = new Division({
      name: divisionName,
      academicYear,
      syllabusId,
      batches
    });
    
    await division.save();
    console.log(`✅ Created division: ${divisionName} with batches:`, batches.map(b => b.name));
  }
};

// Helper function to update syllabus completion status
const updateSyllabusStatus = async (academicYear) => {
  let status = await SyllabusStatus.findOne();
  if (!status) {
    status = new SyllabusStatus();
  }
  
  // Update completion status
  if (academicYear === 'SE') {
    status.seCompleted = true;
  } else if (academicYear === 'TE') {
    status.teCompleted = true;
  } else if (academicYear === 'BE') {
    status.beCompleted = true;
  }
  
  // Update lecture access (SE + TE required)
  await status.updateLectureAccess();
  
  console.log('✅ Updated syllabus status:', {
    SE: status.seCompleted,
    TE: status.teCompleted,
    BE: status.beCompleted,
    lectureAccess: status.lectureAccessAllowed
  });
};

module.exports = router;
