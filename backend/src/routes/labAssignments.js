const express = require("express");
const router = express.Router();
const labAssignmentsController = require("../controllers/labAssignmentsController");

router.get("/years", labAssignmentsController.getYears);
router.get("/divisions", labAssignmentsController.getDivisions);
router.get("/teachers", labAssignmentsController.getTeachers);
router.get("/lab-subjects", labAssignmentsController.getLabSubjects);
router.get("/teacher-workload/:teacherId", labAssignmentsController.getTeacherWorkload);
router.post("/lab-assignments", labAssignmentsController.saveLabAssignments);

module.exports = router;
