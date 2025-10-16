const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Route imports
const teacherRoutes = require('./routes/teachers');
const syllabusRoutes = require('./routes/syllabus');
const lectureRoutes = require('./routes/lectures');
const labRoutes = require('./routes/labs');
const configRoutes = require('./routes/config');
const resourcesRoutes = require('./routes/resources');
const navigationRoutes = require('./routes/navigation');
const restrictionsRoutes = require('./routes/restrictions');
const timetableRoutes = require('./routes/timetable');
const generatorRoutes = require('./routes/generator');
const labSchedulerRoutes = require('./routes/labScheduler');
const lectureSchedulerRoutes = require('./routes/lectureScheduler');

// Route usage
app.use('/api/teachers', teacherRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/config', configRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/restrictions', restrictionsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/generator', generatorRoutes); // ✅ This includes saved timetable routes
app.use('/api/lecture-schedule', lectureSchedulerRoutes);
app.use('/api/lab-scheduler', labSchedulerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      timetable_generator: 'active',
      lab_scheduler: 'active',
      saved_timetables: 'active'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TimeTabulator API Server',
    version: '2.0',
    features: [
      'Timetable Generation',
      'Lab Scheduling',
      'Teacher Management',
      'Resource Configuration',
      'Restriction Management',
      'Saved Timetables'
    ],
    endpoints: {
      teachers: '/api/teachers',
      syllabus: '/api/syllabus',
      lectures: '/api/lectures',
      labs: '/api/labs',
      config: '/api/config',
      resources: '/api/resources',
      navigation: '/api/navigation',
      restrictions: '/api/restrictions',
      timetable: '/api/timetable',
      generator: '/api/generator',
      'saved-timetables': '/api/generator/saved-timetables',
      'lab-scheduler': '/api/lab-scheduler'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
