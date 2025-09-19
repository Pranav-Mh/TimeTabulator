const express = require('express');
const router = express.Router();

let teachers = [];
let nextId = 1;

// Get all teachers
router.get('/', (req, res) => {
  res.json(teachers);
});

// Add new teacher
router.post('/', (req, res) => {
  const { name, maxWorkload } = req.body;
  if (!name || !maxWorkload) {
    return res.status(400).json({ error: "Missing name or maxWorkload" });
  }
  const newTeacher = { _id: nextId++, name, maxWorkload: Number(maxWorkload) };
  teachers.push(newTeacher);
  res.status(201).json(newTeacher);
});

// Update a teacher
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const teacher = teachers.find(t => t._id === id);
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });
  const { name, maxWorkload } = req.body;
  if (name) teacher.name = name;
  if (maxWorkload) teacher.maxWorkload = Number(maxWorkload);
  res.json(teacher);
});

// Delete a teacher
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = teachers.findIndex(t => t._id === id);
  if (index === -1) return res.status(404).json({ error: "Teacher not found" });
  teachers.splice(index, 1);
  res.status(204).send();
});

module.exports = router;
