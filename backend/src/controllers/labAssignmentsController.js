const db = require("../db/connection"); // Changed to use your connection.js

// Returns distinct years from labs
exports.getYears = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DISTINCT year FROM labs");
    res.json(rows.map(r => r.year));
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Returns distinct divisions from labs
exports.getDivisions = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DISTINCT division FROM labs");
    res.json(rows.map(r => r.division));
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Returns list of teachers
exports.getTeachers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name FROM teachers");
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Returns lab subjects filtered by division
exports.getLabSubjects = async (req, res) => {
  try {
    const division = req.query.division;
    const [rows] = await db.query(
      "SELECT id, name FROM lab_subjects WHERE division = ?",
      [division]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Returns workload of a teacher by summing assigned lab hours
exports.getTeacherWorkload = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const [rows] = await db.query(
      "SELECT IFNULL(SUM(hours), 0) as hours FROM lab_assignments WHERE teacher_id = ?",
      [teacherId]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Saves lab assignments in batch
exports.saveLabAssignments = async (req, res) => {
  try {
    const assignments = req.body; // array of { batch, teacherId, hours, division, year }

    if (!assignments.length) {
      return res.status(400).send("No assignments provided.");
    }

    const sql = "INSERT INTO lab_assignments (batch, teacher_id, hours, division, year) VALUES ?";

    const values = assignments.map(a => [a.batch, a.teacherId, a.hours, a.division, a.year]);

    await db.query(sql, [values]);

    res.json({ message: "Assignments saved" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
