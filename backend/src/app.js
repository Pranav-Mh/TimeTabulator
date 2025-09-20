const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes. Must be called before all route definitions.
app.use(cors());

app.use(express.json());

// Route imports
const teacherRoutes = require('./routes/teachers');
const syllabusRoutes = require('./routes/syllabus');
const lectureRoutes = require('./routes/lectures');
const labRoutes = require('./routes/labs');
const configRoutes = require('./routes/config');
const resourcesRoutes = require('./routes/resources');
const navigationRoutes = require('./routes/navigation'); // ✅ NEW

// Route usage
app.use('/api/teachers', teacherRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/config', configRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/navigation', navigationRoutes); // ✅ NEW

module.exports = app;
