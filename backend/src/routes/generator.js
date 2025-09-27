const express = require('express');
const router = express.Router();
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const LectureAssignment = require('../models/LectureAssignment');
const LabAssignment = require('../models/LabAssignment');
const Syllabus = require('../models/Syllabus');

// Get divisions for a specific academic year - THIS WAS MISSING
router.get('/divisions/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    console.log(`Fetching divisions for academic year: ${academicYear}`);
    
    // Find divisions for the academic year
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

// Get subjects with assignments for generation
router.get('/subjects/:academicYear', async (req, res) => {
  try {
    const { academicYear } = req.params;
    console.log(`Fetching subjects for academic year: ${academicYear}`);
    
    // Get subjects for the academic year
    const subjects = await Subject.find({ academicYear });
    
    // Get lecture assignments
    const lectureAssignments = await LectureAssignment.find({ academicYear })
      .populate('subjectId')
      .populate('teacherId')
      .populate('divisionId');
    
    // Get lab assignments  
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
    // Check if all required data exists
    const syllabuses = await Syllabus.find({ isCompleted: true });
    const teachers = await Teacher.find();
    const lectureAssignments = await LectureAssignment.find();
    const labAssignments = await LabAssignment.find();
    
    const status = {
      syllabusReady: syllabuses.length > 0,
      teachersReady: teachers.length > 0,
      lectureAssignmentsReady: lectureAssignments.length > 0,
      labAssignmentsReady: labAssignments.length > 0,
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
