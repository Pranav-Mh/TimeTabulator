const express = require('express');
const router = express.Router();
const Syllabus = require('../models/Syllabus');
const Subject = require('../models/Subject');
const Division = require('../models/Division');
const SyllabusStatus = require('../models/SyllabusStatus');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');

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
    console.error('Error fetching syllabus status:', err);
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
    console.error('Error fetching syllabus:', err);
    res.status(500).json({ error: err.message });
  }
});

// FIXED: Create/Update syllabus with ASSIGNMENT PRESERVATION
router.post('/', async (req, res) => {
  try {
    const { academicYear, numDivisions, subjects } = req.body;
    console.log(`\n📚 SYLLABUS UPDATE: ${academicYear} with ${numDivisions} divisions`);
    
    // Validation
    if (!academicYear || !numDivisions || !subjects || subjects.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: academicYear, numDivisions, and subjects' });
    }

    // Validate subject structure
    for (const subject of subjects) {
      if (!subject.courseCode || !subject.name || !subject.credits || !subject.hoursPerWeek) {
        return res.status(400).json({ error: 'Each subject must have courseCode, name, credits, and hoursPerWeek' });
      }
    }

    // Check for duplicate course codes within the same submission
    const courseCodes = subjects.map(s => s.courseCode.toUpperCase());
    const duplicateCodesInSubmission = courseCodes.filter((code, index) => courseCodes.indexOf(code) !== index);
    if (duplicateCodesInSubmission.length > 0) {
      return res.status(400).json({ error: `Duplicate course codes found: ${[...new Set(duplicateCodesInSubmission)].join(', ')}` });
    }

    // Check if syllabus already exists
    let syllabus = await Syllabus.findOne({ academicYear });
    let isUpdate = !!syllabus;

    if (syllabus) {
      console.log(`✅ Updating existing ${academicYear} syllabus`);
      
      // CRITICAL: Store existing division mappings BEFORE deletion
      const existingDivisions = await Division.find({ academicYear, syllabusId: syllabus._id });
      console.log(`🔍 Found ${existingDivisions.length} existing divisions`);
      
      // Store assignments by division NAME (not ID)
      const existingLectureAssignments = [];
      const existingLabAssignments = [];
      
      for (const division of existingDivisions) {
        // Get lecture assignments for this division
        const lectureAssignments = await LectureAssignment.find({ divisionId: division._id })
          .populate('subjectId', 'name courseCode')
          .populate('teacherId', 'name teacherId');
        
        // Get lab assignments for this division  
        const labAssignments = await LabAssignment.find({ divisionId: division._id })
          .populate('subjectId', 'name courseCode')
          .populate('teacherId', 'name teacherId');
        
        // Store with division name for re-mapping
        lectureAssignments.forEach(assignment => {
          existingLectureAssignments.push({
            divisionName: division.name,
            subjectName: assignment.subjectId.name,
            subjectCode: assignment.subjectId.courseCode,
            teacherId: assignment.teacherId._id,
            teacherName: assignment.teacherId.name,
            academicYear: assignment.academicYear,
            hoursPerWeek: assignment.hoursPerWeek
          });
        });
        
        labAssignments.forEach(assignment => {
          existingLabAssignments.push({
            divisionName: division.name,
            subjectName: assignment.subjectId.name,  
            subjectCode: assignment.subjectId.courseCode,
            batchNumber: assignment.batchNumber,
            teacherId: assignment.teacherId._id,
            teacherName: assignment.teacherId.name,
            academicYear: assignment.academicYear,
            hoursPerWeek: assignment.hoursPerWeek
          });
        });
      }
      
      console.log(`💾 Stored ${existingLectureAssignments.length} lecture assignments`);
      console.log(`💾 Stored ${existingLabAssignments.length} lab assignments`);
      
      // Delete existing subjects and divisions (this will cascade delete assignments)
      await Subject.deleteMany({ syllabusId: syllabus._id });
      await LectureAssignment.deleteMany({ academicYear });
      await LabAssignment.deleteMany({ academicYear });
      await Division.deleteMany({ syllabusId: syllabus._id });
      
      // Update syllabus
      syllabus.numDivisions = numDivisions;
      await syllabus.save();
      
      // Re-create subjects
      const subjectIds = [];
      const createdCourseCodes = [];
      
      for (const subjectData of subjects) {
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
          await Subject.deleteMany({ syllabusId: syllabus._id });
          if (error.code === 11000) {
            return res.status(400).json({ error: `Duplicate courseCode ${subjectData.courseCode} already exists` });
          }
          throw error;
        }
      }
      
      // Update syllabus with new subject IDs
      syllabus.subjects = subjectIds;
      syllabus.isCompleted = true;
      await syllabus.save();
      
      // Re-create divisions with batches
      const newDivisions = await createDivisions(academicYear, numDivisions, syllabus._id);
      
      // CRITICAL: Re-map existing assignments to new divisions
      console.log(`🔄 Re-mapping assignments to new divisions...`);
      
      // Re-map lecture assignments
      for (const storedAssignment of existingLectureAssignments) {
        const newDivision = newDivisions.find(d => d.name === storedAssignment.divisionName);
        const newSubject = await Subject.findOne({ 
          courseCode: storedAssignment.subjectCode,
          academicYear,
          syllabusId: syllabus._id
        });
        
        if (newDivision && newSubject) {
          const newLectureAssignment = new LectureAssignment({
            subjectId: newSubject._id,
            divisionId: newDivision._id,
            teacherId: storedAssignment.teacherId,
            academicYear: storedAssignment.academicYear,
            hoursPerWeek: storedAssignment.hoursPerWeek
          });
          await newLectureAssignment.save();
          console.log(`  ✅ Restored lecture: ${storedAssignment.subjectName} → ${storedAssignment.teacherName} (${storedAssignment.divisionName})`);
        }
      }
      
      // Re-map lab assignments
      for (const storedAssignment of existingLabAssignments) {
        const newDivision = newDivisions.find(d => d.name === storedAssignment.divisionName);
        const newSubject = await Subject.findOne({
          courseCode: storedAssignment.subjectCode,
          academicYear,
          syllabusId: syllabus._id
        });
        
        if (newDivision && newSubject) {
          const newLabAssignment = new LabAssignment({
            subjectId: newSubject._id,
            divisionId: newDivision._id,
            batchNumber: storedAssignment.batchNumber,
            teacherId: storedAssignment.teacherId,
            academicYear: storedAssignment.academicYear,
            hoursPerWeek: storedAssignment.hoursPerWeek
          });
          await newLabAssignment.save();
          console.log(`  ✅ Restored lab: ${storedAssignment.subjectName} → ${storedAssignment.teacherName} (${storedAssignment.divisionName}-${storedAssignment.batchNumber})`);
        }
      }
      
    } else {
      // Create new syllabus
      console.log(`➕ Creating new ${academicYear} syllabus`);
      syllabus = new Syllabus({ academicYear, numDivisions, subjects: [] });
      await syllabus.save();
      
      // Create subjects
      const subjectIds = [];
      const createdCourseCodes = [];
      
      for (const subjectData of subjects) {
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
          await Subject.deleteMany({ syllabusId: syllabus._id });
          if (error.code === 11000) {
            return res.status(400).json({ error: `Duplicate courseCode ${subjectData.courseCode} already exists` });
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
    }
    
    // Update syllabus completion status
    await updateSyllabusStatus(academicYear);
    
    console.log(`✅ ${isUpdate ? 'Updated' : 'Created'} ${academicYear} syllabus with ${numDivisions} divisions`);
    
    res.status(201).json({
      syllabus,
      message: `Successfully ${isUpdate ? 'updated' : 'created'} syllabus with ${subjects.length} subjects`,
      courseCodes: subjects.map(s => s.courseCode.toUpperCase())
    });
    
  } catch (err) {
    console.error('❌ Error creating syllabus:', err);
    res.status(400).json({ error: err.message });
  }
});

// Helper function to create divisions and batches
const createDivisions = async (academicYear, numDivisions, syllabusId) => {
  const divisions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const createdDivisions = [];
  
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
    createdDivisions.push(division);
    console.log(`✅ Created division ${divisionName} with batches: ${batches.map(b => b.name).join(', ')}`);
  }
  
  return createdDivisions;
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
  
  console.log(`📊 Updated syllabus status: SE=${status.seCompleted}, TE=${status.teCompleted}, BE=${status.beCompleted}, lectureAccess=${status.lectureAccessAllowed}`);
};

module.exports = router;
