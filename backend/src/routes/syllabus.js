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

// Create/Update syllabus
router.post('/', async (req, res) => {
  try {
    const { academicYear, numDivisions, subjects } = req.body;
    
    // Validation
    if (!academicYear || !numDivisions || !subjects || subjects.length === 0) {
      return res.status(400).json({ 
        error: "Missing required fields: academicYear, numDivisions, and subjects" 
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

    // Create subjects
    const subjectIds = [];
    for (const subjectData of subjects) {
      const subject = new Subject({
        ...subjectData,
        academicYear,
        syllabusId: syllabus._id
      });
      await subject.save();
      subjectIds.push(subject._id);
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
    res.status(201).json(syllabus);

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
