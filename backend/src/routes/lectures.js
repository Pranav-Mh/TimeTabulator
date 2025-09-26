const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Division = require('../models/Division');
const Teacher = require('../models/Teacher');
const LectureAssignment = require('../models/LectureAssignment');
const SyllabusStatus = require('../models/SyllabusStatus');

// Check if user can access lecture tab
router.get('/access-check', async (req, res) => {
  try {
    let status = await SyllabusStatus.findOne();
    if (!status || !status.lectureAccessAllowed) {
      return res.status(403).json({ error: 'Complete SE and TE syllabus first to access Lecture assignments', canAccess: false });
    }
    res.json({ canAccess: true });
  } catch (err) {
    console.error('Error checking lecture access:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get theory subjects with assignments
router.get('/subjects/:year/:division', async (req, res) => {
  try {
    const { year, division } = req.params;
    console.log(`\n🔍 Fetching subjects for ${year}-${division}`);
    
    const divisionDoc = await Division.findOne({ 
      academicYear: year, 
      name: `${year}-${division}` 
    });
    
    if (!divisionDoc) {
      console.log(`❌ Division ${year}-${division} not found`);
      return res.status(404).json({ error: `Division ${year}-${division} not found` });
    }
    console.log(`✅ Division: ${divisionDoc._id}`);

    const subjects = await Subject.find({ 
      academicYear: year, 
      type: { $in: ['TH', 'VAP', 'OE'] }
    });
    console.log(`📚 Subjects found: ${subjects.length}`);

    // Get assignments with proper population
    const assignments = await LectureAssignment.find({ 
      divisionId: divisionDoc._id 
    }).populate('teacherId').populate('subjectId');
    
    console.log(`📋 Assignments found: ${assignments.length}`);

    // Map subjects with assignments
    const subjectsWithTeachers = subjects.map(subject => {
      const assignment = assignments.find(a => 
        a.subjectId && a.subjectId._id && 
        a.subjectId._id.toString() === subject._id.toString()
      );

      const result = {
        _id: subject._id,
        name: subject.name,
        type: subject.type,
        hoursPerWeek: subject.hoursPerWeek,
        academicYear: subject.academicYear,
        assignedTeacher: null
      };

      if (assignment && assignment.teacherId) {
        result.assignedTeacher = {
          _id: assignment.teacherId._id,
          id: assignment.teacherId._id.toString(),
          name: assignment.teacherId.name,
          teacherId: assignment.teacherId.teacherId
        };
        console.log(`✅ ${subject.name} → ${assignment.teacherId.name}`);
      } else {
        console.log(`❌ ${subject.name} → No assignment`);
      }

      return result;
    });

    console.log(`🎯 Response ready: ${subjectsWithTeachers.length} subjects`);
    
    res.json({ 
      division: divisionDoc, 
      subjects: subjectsWithTeachers 
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get divisions
router.get('/divisions/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const divisions = await Division.find({ academicYear: year }).select('name _id');
    res.json(divisions);
  } catch (err) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign teacher
router.post('/assign', async (req, res) => {
  try {
    const { subjectId, divisionId, teacherId } = req.body;
    console.log(`\n🎯 ASSIGNMENT:`, { subjectId, divisionId, teacherId });
    
    if (!subjectId || !divisionId || !teacherId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const subject = await Subject.findById(subjectId);
    const teacher = await Teacher.findById(teacherId);
    
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    console.log(`📚 Subject: ${subject.name}`);
    console.log(`👨‍🏫 Teacher: ${teacher.name}`);

    let assignment = await LectureAssignment.findOne({ subjectId, divisionId });
    
    if (assignment) {
      assignment.teacherId = teacherId;
      assignment.hoursPerWeek = subject.hoursPerWeek;
      await assignment.save();
      console.log(`✅ Updated assignment`);
    } else {
      assignment = new LectureAssignment({
        subjectId,
        divisionId,
        teacherId,
        academicYear: subject.academicYear,
        hoursPerWeek: subject.hoursPerWeek
      });
      await assignment.save();
      console.log(`✅ Created assignment`);
    }

    res.json({ 
      message: 'Assignment saved successfully', 
      assignment 
    });

  } catch (err) {
    console.error('❌ Assignment error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get teacher workload
router.get('/teacher-workload', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('name teacherId maxHours');
    const lectureAssignments = await LectureAssignment.find().populate('subjectId', 'hoursPerWeek');
    const LabAssignment = require('../models/LabAssignment');
    const labAssignments = await LabAssignment.find().populate('subjectId', 'hoursPerWeek');

    const workloadSummary = teachers.map(teacher => {
      const teacherLectures = lectureAssignments.filter(a => a.teacherId.toString() === teacher._id.toString());
      const teacherLabs = labAssignments.filter(a => a.teacherId.toString() === teacher._id.toString());

      const lectureHours = teacherLectures.reduce((sum, assignment) => sum + (assignment.hoursPerWeek || 0), 0);
      const labHours = teacherLabs.reduce((sum, assignment) => sum + (assignment.hoursPerWeek || 0), 0);

      return {
        teacherId: teacher._id,
        name: teacher.name,
        teacherCode: teacher.teacherId,
        lectureHours,
        labHours,
        totalHours: lectureHours + labHours,
        maxHours: teacher.maxHours,
        availableHours: teacher.maxHours - (lectureHours + labHours)
      };
    });

    res.json(workloadSummary);
  } catch (err) {
    console.error('Error fetching teacher workload:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
