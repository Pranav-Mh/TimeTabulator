const express = require('express');
const router = express.Router();

const Subject = require('../models/Subject');
const Division = require('../models/Division');
const Teacher = require('../models/Teacher');
const LabAssignment = require('../models/LabAssignment');
const SyllabusStatus = require('../models/SyllabusStatus');


// --------------------------------------------------
// Check if user can access lab tab
// --------------------------------------------------
router.get('/access-check', async (req, res) => {
  try {
    const status = await SyllabusStatus.findOne();
    if (!status || !status.lectureAccessAllowed) {
      return res.status(403).json({
        error: 'Complete SE and TE syllabus first to access Lab assignments',
        canAccess: false
      });
    }
    res.json({ canAccess: true });
  } catch (err) {
    console.error('Error checking lab access:', err);
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------------------
// 🔥 NEW FIX: Update batch count for a division
// THIS IS THE MISSING PIECE
// --------------------------------------------------
router.put('/division/:divisionId/batch-count', async (req, res) => {
  try {
    const { divisionId } = req.params;
    const { batchCount } = req.body;

    if (![3, 4].includes(batchCount)) {
      return res.status(400).json({
        error: 'Batch count must be 3 or 4'
      });
    }

    const division = await Division.findById(divisionId);
    if (!division) {
      return res.status(404).json({ error: 'Division not found' });
    }

    division.batchCount = batchCount;
    await division.save();

    res.json({
      message: 'Batch count updated successfully',
      batchCount
    });

  } catch (err) {
    console.error('Error updating batch count:', err);
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------------------
// Get practical subjects for a specific year & division
// ✅ batchCount aware (3 or 4)
// --------------------------------------------------
router.get('/subjects/:year/:division', async (req, res) => {
  try {
    const { year, division } = req.params;
    console.log(`🔬 Fetching lab subjects for ${year}-${division}`);

    const divisionDoc = await Division.findOne({
      academicYear: year,
      name: `${year}-${division}`
    });

    if (!divisionDoc) {
      return res.status(404).json({
        error: `Division ${year}-${division} not found`
      });
    }

    // ✅ READ FROM DB (THIS FIXES A4)
    const batchCount = divisionDoc.batchCount || 3;

    const subjects = await Subject.find({
      academicYear: year,
      type: 'PR'
    });

    const existingAssignments = await LabAssignment.find({
      divisionId: divisionDoc._id
    }).populate('teacherId', 'name teacherId');

    const subjectsWithAssignments = subjects.map(subject => {
      const batches = Array.from({ length: batchCount }, (_, i) => {
        const batchNumber = i + 1;

        const assignment = existingAssignments.find(a =>
          a.subjectId.toString() === subject._id.toString() &&
          a.batchNumber === batchNumber
        );

        return {
          batchNumber,
          batchName: `${year}-${division}${batchNumber}`,
          assignedTeacher: assignment ? assignment.teacherId : null,
          assignmentId: assignment ? assignment._id : null
        };
      });

      return {
        ...subject.toObject(),
        batches
      };
    });

    res.json({
      division: divisionDoc,
      subjects: subjectsWithAssignments
    });

  } catch (err) {
    console.error('Error fetching lab subjects:', err);
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------------------
// Get divisions by year
// --------------------------------------------------
router.get('/divisions/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const divisions = await Division.find({ academicYear: year })
      .select('name _id batchCount');
    res.json(divisions);
  } catch (err) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------------------
// Assign teacher to lab batch
// --------------------------------------------------
router.post('/assign', async (req, res) => {
  try {
    const { subjectId, divisionId, batchNumber, teacherId } = req.body;

    if (!subjectId || !divisionId || !batchNumber || !teacherId) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const existingAssignment = await LabAssignment.findOne({
      subjectId,
      divisionId,
      batchNumber: Number(batchNumber)
    });

    if (existingAssignment) {
      existingAssignment.teacherId = teacherId;
      await existingAssignment.save();

      return res.json({
        message: 'Lab assignment updated successfully'
      });
    }

    const newAssignment = new LabAssignment({
      subjectId,
      divisionId,
      batchNumber: Number(batchNumber),
      teacherId,
      academicYear: subject.academicYear,
      hoursPerWeek: subject.hoursPerWeek
    });

    await newAssignment.save();

    res.status(201).json({
      message: 'Lab assignment created successfully'
    });

  } catch (err) {
    console.error('Error creating lab assignment:', err);
    res.status(400).json({ error: err.message });
  }
});
// --------------------------------------------------
// ✅ UPDATE batchCount for a division
// --------------------------------------------------
router.put('/division/:id/batch-count', async (req, res) => {
  try {
    const { id } = req.params;
    const { batchCount } = req.body;

    if (![3, 4].includes(batchCount)) {
      return res.status(400).json({ error: 'Invalid batch count' });
    }

    const division = await Division.findByIdAndUpdate(
      id,
      { batchCount },
      { new: true }
    );

    if (!division) {
      return res.status(404).json({ error: 'Division not found' });
    }

    res.json({
      message: 'Batch count updated successfully',
      batchCount: division.batchCount
    });
  } catch (err) {
    console.error('Error updating batch count:', err);
    res.status(500).json({ error: err.message });
  }
});


// --------------------------------------------------
// Combined teacher workload (lecture + lab)
// --------------------------------------------------
router.get('/teacher-workload', async (req, res) => {
  try {
    const teachers = await Teacher.find().select('name teacherId maxHours');

    const lectureAssignments = await require('../models/LectureAssignment')
      .find()
      .populate('subjectId', 'hoursPerWeek');

    const labAssignments = await LabAssignment.find()
      .populate('subjectId', 'hoursPerWeek');

    const workloadSummary = teachers.map(teacher => {
      const teacherLectures = lectureAssignments.filter(
        a => a.teacherId.toString() === teacher._id.toString()
      );

      const teacherLabs = labAssignments.filter(
        a => a.teacherId.toString() === teacher._id.toString()
      );

      const lectureHours = teacherLectures.reduce(
        (sum, a) => sum + (a.hoursPerWeek || 0), 0
      );

      const labHours = teacherLabs.reduce(
        (sum, a) => sum + (a.hoursPerWeek || 0), 0
      );

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
