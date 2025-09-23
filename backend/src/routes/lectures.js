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
      return res.status(403).json({ 
        error: "Complete SE and TE syllabus first to access Lecture assignments",
        canAccess: false 
      });
    }
    res.json({ canAccess: true });
  } catch (err) {
    console.error('❌ Error checking lecture access:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get theory subjects for a specific year and division
router.get('/subjects/:year/:division', async (req, res) => {
  try {
    const { year, division } = req.params;
    
    const divisionDoc = await Division.findOne({ 
      academicYear: year, 
      name: `${year}-${division}` 
    });
    
    if (!divisionDoc) {
      return res.status(404).json({ error: `Division ${year}-${division} not found` });
    }

    const subjects = await Subject.find({
      academicYear: year,
      type: { $in: ['TH', 'VAP', 'OE'] }
    });

    const existingAssignments = await LectureAssignment.find({
      divisionId: divisionDoc._id
    }).populate('teacherId', 'name teacherId');

    const subjectsWithAssignments = subjects.map(subject => {
      const assignment = existingAssignments.find(
        a => a.subjectId.toString() === subject._id.toString()
      );
      
      return {
        ...subject.toObject(),
        assignedTeacher: assignment ? assignment.teacherId : null,
        assignmentId: assignment ? assignment._id : null
      };
    });

    res.json({
      division: divisionDoc,
      subjects: subjectsWithAssignments
    });
  } catch (err) {
    console.error('❌ Error fetching subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all available divisions for a year
router.get('/divisions/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const divisions = await Division.find({ academicYear: year }).select('name');
    res.json(divisions);
  } catch (err) {
    console.error('❌ Error fetching divisions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Assign teacher to subject for specific division
router.post('/assign', async (req, res) => {
  try {
    const { subjectId, divisionId, teacherId } = req.body;

    if (!subjectId || !divisionId || !teacherId) {
      return res.status(400).json({ 
        error: "Missing required fields: subjectId, divisionId, teacherId" 
      });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Check teacher workload (include both lecture and lab assignments)
    const lectureAssignments = await LectureAssignment.find({ teacherId });
    const LabAssignment = require('../models/LabAssignment');
    const labAssignments = await LabAssignment.find({ teacherId });
    
    let totalHours = 0;
    
    for (const assignment of lectureAssignments) {
      totalHours += assignment.hoursPerWeek;
    }
    
    for (const assignment of labAssignments) {
      totalHours += assignment.hoursPerWeek;
    }

    if (totalHours + subject.hoursPerWeek > teacher.maxHours) {
      return res.status(400).json({
        error: `Teacher workload exceeded! ${teacher.name} has ${totalHours}/${teacher.maxHours} hours. Adding ${subject.hoursPerWeek} more hours would exceed limit.`,
        type: 'workload_exceeded'
      });
    }

    const existingAssignment = await LectureAssignment.findOne({
      subjectId,
      divisionId
    });

    if (existingAssignment) {
      existingAssignment.teacherId = teacherId;
      await existingAssignment.save();
      res.json({ message: "Assignment updated successfully", assignment: existingAssignment });
    } else {
      const newAssignment = new LectureAssignment({
        subjectId,
        divisionId,
        teacherId,
        academicYear: subject.academicYear,
        hoursPerWeek: subject.hoursPerWeek
      });

      await newAssignment.save();
      res.status(201).json({ message: "Assignment created successfully", assignment: newAssignment });
    }
  } catch (err) {
    console.error('❌ Error creating assignment:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get combined teacher workload summary (lectures + labs)
router.get('/teacher-workload', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('name teacherId maxHours');
    const lectureAssignments = await LectureAssignment.find().populate('subjectId', 'hoursPerWeek');
    const LabAssignment = require('../models/LabAssignment');
    const labAssignments = await LabAssignment.find().populate('subjectId', 'hoursPerWeek');

    const workloadSummary = teachers.map(teacher => {
      const teacherLectures = lectureAssignments.filter(
        a => a.teacherId.toString() === teacher._id.toString()
      );
      const teacherLabs = labAssignments.filter(
        a => a.teacherId.toString() === teacher._id.toString()
      );
      
      const lectureHours = teacherLectures.reduce((sum, assignment) => {
        return sum + (assignment.hoursPerWeek || 0);
      }, 0);
      
      const labHours = teacherLabs.reduce((sum, assignment) => {
        return sum + (assignment.hoursPerWeek || 0);
      }, 0);
      
      const totalHours = lectureHours + labHours;

      return {
        teacherId: teacher._id,
        name: teacher.name,
        teacherCode: teacher.teacherId,
        lectureHours,
        labHours,
        totalHours,
        maxHours: teacher.maxHours,
        availableHours: teacher.maxHours - totalHours
      };
    });

    res.json(workloadSummary);
  } catch (err) {
    console.error('❌ Error fetching teacher workload:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
