const express = require('express');
const router = express.Router();
const TimetableRestriction = require('../models/TimetableRestriction');

// Get all restrictions
router.get('/', async (req, res) => {
  try {
    const restrictions = await TimetableRestriction.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 });
    
    // Group by type for better organization
    const grouped = {
      time: restrictions.filter(r => r.type === 'time'),
      teacher: restrictions.filter(r => r.type === 'teacher'),
      subject: restrictions.filter(r => r.type === 'subject')
    };
    
    res.json({
      restrictions,
      grouped,
      counts: {
        total: restrictions.length,
        time: grouped.time.length,
        teacher: grouped.teacher.length,
        subject: grouped.subject.length
      }
    });
  } catch (err) {
    console.error('❌ Error fetching restrictions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add new restriction
router.post('/', async (req, res) => {
  try {
    console.log('🔥 Creating restriction:', req.body);
    
    // Basic validation
    if (!req.body.restrictionName || !req.body.type) {
      return res.status(400).json({ error: 'Restriction name and type are required' });
    }
    
    // Type-specific validation
    if (req.body.type === 'time') {
      if (!req.body.startTime || !req.body.endTime || !req.body.days || req.body.days.length === 0) {
        return res.status(400).json({ error: 'Time restrictions require start time, end time, and days' });
      }
    }
    
    if (req.body.type === 'teacher') {
      if (!req.body.teacherName) {
        return res.status(400).json({ error: 'Teacher restrictions require teacher name' });
      }
    }
    
    if (req.body.type === 'subject') {
      if (!req.body.subjectName) {
        return res.status(400).json({ error: 'Subject restrictions require subject name' });
      }
    }
    
    // Year-specific validation
    if (req.body.scope === 'year-specific') {
      if (!req.body.affectedYears || req.body.affectedYears.length === 0) {
        return res.status(400).json({ error: 'Year-specific restrictions must specify affected years' });
      }
    }
    
    const restriction = new TimetableRestriction(req.body);
    await restriction.save();
    
    console.log('✅ Restriction created:', restriction._id);
    
    res.status(201).json({ 
      restriction,
      message: `${restriction.type.charAt(0).toUpperCase() + restriction.type.slice(1)} restriction "${restriction.restrictionName}" created successfully`
    });
  } catch (err) {
    console.error('❌ Error creating restriction:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update restriction
router.put('/:id', async (req, res) => {
  try {
    const restriction = await TimetableRestriction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!restriction) {
      return res.status(404).json({ error: 'Restriction not found' });
    }
    
    res.json({ 
      restriction,
      message: `Restriction "${restriction.restrictionName}" updated successfully`
    });
  } catch (err) {
    console.error('❌ Error updating restriction:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete restriction
router.delete('/:id', async (req, res) => {
  try {
    const restriction = await TimetableRestriction.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!restriction) {
      return res.status(404).json({ error: 'Restriction not found' });
    }
    
    res.json({ 
      message: `Restriction "${restriction.restrictionName}" removed successfully`
    });
  } catch (err) {
    console.error('❌ Error removing restriction:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get restrictions for specific year and day (for timetable generation)
router.get('/for-timetable/:year/:day', async (req, res) => {
  try {
    const { year, day } = req.params;
    
    const restrictions = await TimetableRestriction.find({
      isActive: true,
      $or: [
        { scope: 'global' },
        { 
          scope: 'year-specific',
          affectedYears: year
        }
      ]
    });
    
    const applicable = {
      timeBlocks: [],
      unavailableTeachers: [],
      subjectConstraints: []
    };
    
    restrictions.forEach(restriction => {
      switch (restriction.type) {
        case 'time':
          if (restriction.days.includes('All days') || restriction.days.includes(day)) {
            applicable.timeBlocks.push({
              name: restriction.restrictionName,
              startTime: restriction.startTime,
              endTime: restriction.endTime,
              priority: restriction.priority
            });
          }
          break;
          
        case 'teacher':
          applicable.unavailableTeachers.push({
            teacherName: restriction.teacherName,
            unavailableSlots: restriction.unavailableSlots.filter(slot => slot.day === day),
            priority: restriction.priority
          });
          break;
          
        case 'subject':
          if (restriction.blockedDays && restriction.blockedDays.includes(day)) {
            applicable.subjectConstraints.push({
              subjectName: restriction.subjectName,
              type: 'blocked_day',
              priority: restriction.priority
            });
          }
          break;
      }
    });
    
    res.json({
      year,
      day,
      restrictions: applicable,
      message: `Found ${restrictions.length} applicable restrictions for ${year} on ${day}`
    });
    
  } catch (err) {
    console.error('❌ Error getting timetable restrictions:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
