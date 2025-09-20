const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Resource = require('../models/Resource');

// Smart Timetable Generation Algorithm
const generateSmartTimetable = async (subjects, teachers, resources) => {
  const timetableEntries = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['9:00-10:00', '10:00-11:00', '11:30-12:30', '12:30-1:30', '2:30-3:30', '3:30-4:30'];
  
  // Separate classrooms and labs
  const classrooms = resources.filter(r => r.type === 'CR');
  const labs = resources.filter(r => r.type === 'LAB');
  
  // Track teacher availability
  const teacherSchedule = {};
  teachers.forEach(teacher => {
    teacherSchedule[teacher.name] = {};
    days.forEach(day => {
      teacherSchedule[teacher.name][day] = new Set();
    });
  });
  
  // Process subjects
  for (const subject of subjects) {
    if (subject.labHours > 0) {
      // LAB SUBJECT - Schedule different batches on different days
      await scheduleLabSubject(subject, timetableEntries, teacherSchedule, labs, days, timeSlots);
    } else {
      // THEORY SUBJECT - Schedule entire division together
      await scheduleTheorySubject(subject, timetableEntries, teacherSchedule, classrooms, days, timeSlots);
    }
  }
  
  return timetableEntries;
};

// Schedule Lab Subjects (Different days for same teacher)
const scheduleLabSubject = async (subject, timetableEntries, teacherSchedule, labs, days, timeSlots) => {
  const batches = ['A1', 'A2', 'A3'];
  const sessionsNeeded = Math.ceil(subject.labHours / 2); // 2-hour lab sessions
  
  // Get assigned teachers for this subject's batches
  const batchTeachers = {
    A1: subject.batchTeachers?.A1 || subject.teacher,
    A2: subject.batchTeachers?.A2 || subject.teacher,
    A3: subject.batchTeachers?.A3 || subject.teacher
  };
  
  // Group batches by teacher (same teacher = different days)
  const teacherGroups = {};
  batches.forEach(batch => {
    const teacher = batchTeachers[batch];
    if (!teacherGroups[teacher]) {
      teacherGroups[teacher] = [];
    }
    teacherGroups[teacher].push(batch);
  });
  
  // Schedule each teacher's batches on different days
  for (const [teacher, teacherBatches] of Object.entries(teacherGroups)) {
    let dayIndex = 0;
    
    for (const batch of teacherBatches) {
      for (let session = 0; session < sessionsNeeded; session++) {
        // Find available day and time for this teacher
        let scheduled = false;
        let attempts = 0;
        
        while (!scheduled && attempts < 15) {
          const day = days[dayIndex % days.length];
          const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          
          // Check if teacher is available
          if (!teacherSchedule[teacher][day].has(timeSlot)) {
            // Find available lab
            const availableLab = labs.find(lab => 
              !timetableEntries.some(entry => 
                entry.day === day && 
                entry.timeSlot === timeSlot && 
                entry.room === lab.roomName
              )
            );
            
            if (availableLab) {
              // Schedule the lab session
              timetableEntries.push({
                day,
                timeSlot,
                subject: `${subject.name} Lab`,
                teacher,
                room: availableLab.roomName,
                roomType: 'LAB',
                batch,
                isLabSession: true,
                duration: 2
              });
              
              // Mark teacher as busy
              teacherSchedule[teacher][day].add(timeSlot);
              scheduled = true;
            }
          }
          
          attempts++;
          dayIndex++;
        }
      }
      
      dayIndex++; // Ensure different batches of same teacher get different days
    }
  }
};

// Schedule Theory Subjects (Entire division together)
const scheduleTheorySubject = async (subject, timetableEntries, teacherSchedule, classrooms, days, timeSlots) => {
  const sessionsNeeded = subject.lectureHours;
  
  for (let session = 0; session < sessionsNeeded; session++) {
    let scheduled = false;
    let attempts = 0;
    
    while (!scheduled && attempts < 20) {
      const day = days[Math.floor(Math.random() * days.length)];
      const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      
      // Check if teacher is available
      if (!teacherSchedule[subject.teacher][day].has(timeSlot)) {
        // Find available classroom
        const availableClassroom = classrooms.find(classroom => 
          !timetableEntries.some(entry => 
            entry.day === day && 
            entry.timeSlot === timeSlot && 
            entry.room === classroom.roomName
          )
        );
        
        if (availableClassroom) {
          // Schedule the theory session
          timetableEntries.push({
            day,
            timeSlot,
            subject: subject.name,
            teacher: subject.teacher,
            room: availableClassroom.roomName,
            roomType: 'CR',
            batch: 'ALL',
            isLabSession: false,
            duration: 1
          });
          
          // Mark teacher as busy
          teacherSchedule[subject.teacher][day].add(timeSlot);
          scheduled = true;
        }
      }
      
      attempts++;
    }
  }
};

// Generate timetable for specific year and division
router.post('/generate', async (req, res) => {
  try {
    const { year, division, subjects, teachers } = req.body;
    
    if (!year || !division || !subjects || !teachers) {
      return res.status(400).json({ error: 'Missing required fields: year, division, subjects, teachers' });
    }
    
    // Get available resources
    const resources = await Resource.find({ isActive: true });
    
    if (resources.length === 0) {
      return res.status(400).json({ error: 'No rooms configured. Please add classrooms and labs first.' });
    }
    
    // Generate timetable entries
    const entries = await generateSmartTimetable(subjects, teachers, resources);
    
    // Create separate timetables for each batch
    const batches = ['ALL', 'A1', 'A2', 'A3'];
    const generatedTimetables = [];
    
    for (const batch of batches) {
      const batchEntries = entries.filter(entry => 
        entry.batch === batch || entry.batch === 'ALL'
      );
      
      if (batchEntries.length > 0) {
        const timetable = new Timetable({
          year,
          division,
          batch,
          entries: batchEntries
        });
        
        await timetable.save();
        generatedTimetables.push(timetable);
      }
    }
    
    res.json({
      message: `Timetable generated successfully for ${year}-${division}`,
      timetables: generatedTimetables,
      totalEntries: entries.length,
      batchCount: generatedTimetables.length
    });
    
  } catch (err) {
    console.error('❌ Error generating timetable:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get timetable for specific year, division, and batch
router.get('/:year/:division/:batch?', async (req, res) => {
  try {
    const { year, division, batch = 'ALL' } = req.params;
    
    const timetable = await Timetable.findOne({
      year: year.toUpperCase(),
      division: division.toUpperCase(),
      batch: batch.toUpperCase(),
      isActive: true
    }).sort({ generatedAt: -1 });
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    res.json(timetable);
    
  } catch (err) {
    console.error('❌ Error fetching timetable:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all timetables
router.get('/', async (req, res) => {
  try {
    const timetables = await Timetable.find({ isActive: true })
      .sort({ year: 1, division: 1, batch: 1, generatedAt: -1 });
    
    res.json(timetables);
    
  } catch (err) {
    console.error('❌ Error fetching timetables:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete timetable
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const timetable = await Timetable.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    res.json({ message: 'Timetable deleted successfully' });
    
  } catch (err) {
    console.error('❌ Error deleting timetable:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
