const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes. Must be called before all route definitions.
app.use(cors());

app.use(express.json());

// Route imports
const teacherRoutes = require('./routes/teachers');
const labAssignmentsRoutes = require('./routes/labAssignments');
const configRoutes = require('./routes/config');
const resourcesRoutes = require('./routes/resources');
const syllabusRoutes = require('./routes/syllabus');

// Route usage
app.use('/api/teachers', teacherRoutes);
app.use('/api', labAssignmentsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/syllabus', syllabusRoutes);

module.exports = app;
