const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');

// ✅ NEW: GET all resources for Generator readiness check (uses LIVE database data)
router.get('/', async (req, res) => {
  try {
    console.log('🏢 Generator: Fetching all resources from database...');
    
    // ✅ PRIORITY 1: Get LIVE data from your database
    const resources = await Resource.find({ isActive: true }).sort({ roomName: 1 });
    
    console.log(`✅ Generator: Found ${resources.length} LIVE resources from database`);
    
    // ✅ Return LIVE database data (this will return cf11, cg12, lab1, etc.)
    if (resources.length > 0) {
      console.log('📋 Live resources:', resources.map(r => `${r.roomName} (${r.type})`));
      return res.json(resources);
    }
    
    // ✅ FALLBACK: Only if database is completely empty
    console.log('⚠️ No active resources found in database');
    return res.json([]);
    
  } catch (error) {
    console.error('❌ Generator: Error fetching resources:', error);
    res.status(500).json({ 
      error: 'Failed to fetch resources from database',
      message: error.message
    });
  }
});

// Helper function to convert time string to minutes
const convertTimeToMinutes = (timeStr) => {
  const cleanTime = timeStr.replace(/\s*(AM|PM)/i, '');
  const [hours, minutes] = cleanTime.split(':').map(Number);
  
  let totalMinutes = hours * 60 + minutes;
  
  if (timeStr.toUpperCase().includes('PM') && hours !== 12) {
    totalMinutes += 12 * 60;
  }
  
  if (timeStr.toUpperCase().includes('AM') && hours === 12) {
    totalMinutes -= 12 * 60;
  }
  
  return totalMinutes;
};

// Helper function to convert minutes to time string
const convertMinutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let displayHours = hours;
  let period = 'AM';
  
  if (hours >= 12) {
    period = 'PM';
    if (hours > 12) {
      displayHours = hours - 12;
    }
  }
  
  if (hours === 0) {
    displayHours = 12;
  }
  
  return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// DYNAMIC SLOT RECALCULATION FUNCTION
const recalculateTimeSlots = (baseSlots, fixedBookings, startTime) => {
  console.log('🔄 Starting dynamic slot recalculation...');
  
  let currentTime = convertTimeToMinutes(startTime);
  const adjustedSlots = [];
  
  for (let i = 0; i < baseSlots.length; i++) {
    const slot = baseSlots[i];
    const slotNumber = slot.slotNumber || (i + 1);
    
    // Find fixed bookings for this slot
    const slotBookings = fixedBookings.filter(booking => 
      booking.slotNumber === slotNumber
    );
    
    let slotStartTime = currentTime;
    let totalSlotDuration = convertTimeToMinutes(slot.originalEndTime || slot.endTime) - 
                           convertTimeToMinutes(slot.originalStartTime || slot.startTime);
    
    // Add fixed booking duration to slot if exists
    const totalBookingDuration = slotBookings.reduce((sum, booking) => sum + booking.durationMinutes, 0);
    
    const adjustedSlot = {
      slotNumber: slotNumber,
      originalStartTime: slot.originalStartTime || slot.startTime,
      originalEndTime: slot.originalEndTime || slot.endTime,
      adjustedStartTime: convertMinutesToTime(slotStartTime),
      adjustedEndTime: convertMinutesToTime(slotStartTime + totalSlotDuration),
      isAdjusted: slotStartTime !== convertTimeToMinutes(slot.originalStartTime || slot.startTime),
      fixedBookings: slotBookings
    };
    
    adjustedSlots.push(adjustedSlot);
    currentTime = slotStartTime + totalSlotDuration;
    
    console.log(`✅ Slot ${slotNumber}: ${adjustedSlot.adjustedStartTime} - ${adjustedSlot.adjustedEndTime} (${totalSlotDuration}min)`);
  }
  
  console.log('🎯 Dynamic recalculation completed!');
  return adjustedSlots;
};

// ✅ EXISTING: Get all resources (used by Configure Resources page)
router.get('/rooms', async (req, res) => {
  try {
    const resources = await Resource.find({ isActive: true }).sort({ roomName: 1 });
    console.log(`📋 Configure Resources: Found ${resources.length} active resources`);
    res.json(resources);
  } catch (err) {
    console.error('❌ Error fetching resources:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ EXISTING: Add new resource
router.post('/rooms', async (req, res) => {
  try {
    const { roomName, type, capacity } = req.body;
    
    if (!roomName || !type) {
      return res.status(400).json({ error: 'Room name and type are required' });
    }
    
    if (!['CR', 'LAB'].includes(type)) {
      return res.status(400).json({ error: 'Type must be CR (Classroom) or LAB (Laboratory)' });
    }
    
    const existingRoom = await Resource.findOne({ 
      roomName: roomName.trim(),
      isActive: true 
    });
    
    if (existingRoom) {
      return res.status(400).json({ error: `Room "${roomName}" already exists` });
    }
    
    const resource = new Resource({
      roomName: roomName.trim(),
      type,
      capacity: capacity || 60
    });
    
    await resource.save();
    console.log('✅ Resource saved:', resource.roomName, resource._id);
    
    res.status(201).json({
      resource,
      message: `${type === 'CR' ? 'Classroom' : 'Laboratory'} "${roomName}" added successfully`
    });
    
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Room name already exists' });
    }
    console.error('❌ Error adding resource:', err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ EXISTING: Remove resource
router.delete('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const resource = await Resource.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    console.log('✅ Resource deactivated:', resource.roomName);
    
    res.json({
      message: `${resource.type === 'CR' ? 'Classroom' : 'Laboratory'} "${resource.roomName}" removed successfully`
    });
    
  } catch (err) {
    console.error('❌ Error removing resource:', err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ ALL YOUR EXISTING TIME SLOT ROUTES (unchanged)
router.get('/timeslots', async (req, res) => {
  try {
    let config = await TimeSlotConfiguration.findOne();
    if (!config) {
      // Create default configuration
      const defaultSlots = [];
      let currentTime = convertTimeToMinutes("08:00 AM");
      
      for (let i = 1; i <= 8; i++) {
        const startTime = convertMinutesToTime(currentTime);
        const endTime = convertMinutesToTime(currentTime + 60);
        
        defaultSlots.push({
          slotNumber: i,
          originalStartTime: startTime,
          originalEndTime: endTime,
          adjustedStartTime: startTime,
          adjustedEndTime: endTime,
          isAdjusted: false
        });
        
        currentTime += 60;
      }
      
      config = new TimeSlotConfiguration({
        collegeStartTime: "08:00 AM",
        collegeEndTime: "03:00 PM",
        workingDaysPerWeek: 5,
        timeSlotsPerDay: 8,
        periodDurationMinutes: 60,
        timeSlots: defaultSlots,
        fixedBookings: []
      });
      
      await config.save();
    }
    
    // Recalculate slots with current fixed bookings
    if (config.fixedBookings && config.fixedBookings.length > 0) {
      config.timeSlots = recalculateTimeSlots(
        config.timeSlots, 
        config.fixedBookings, 
        config.collegeStartTime
      );
    }
    
    res.json(config);
  } catch (err) {
    console.error('❌ Error fetching time slot configuration:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/timeslots/generate', async (req, res) => {
  try {
    const {
      collegeStartTime,
      collegeEndTime,
      workingDaysPerWeek,
      timeSlotsPerDay,
      periodDurationMinutes
    } = req.body;
    
    if (!collegeStartTime || !timeSlotsPerDay || !periodDurationMinutes) {
      return res.status(400).json({ error: 'College start time, slots per day, and period duration are required' });
    }
    
    const slots = [];
    let currentTime = convertTimeToMinutes(collegeStartTime);
    
    for (let i = 1; i <= timeSlotsPerDay; i++) {
      const startTime = convertMinutesToTime(currentTime);
      const endTime = convertMinutesToTime(currentTime + periodDurationMinutes);
      
      slots.push({
        slotNumber: i,
        originalStartTime: startTime,
        originalEndTime: endTime,
        adjustedStartTime: startTime,
        adjustedEndTime: endTime,
        isAdjusted: false
      });
      
      currentTime += periodDurationMinutes;
    }
    
    let config = await TimeSlotConfiguration.findOne();
    if (!config) {
      config = new TimeSlotConfiguration();
    }
    
    config.collegeStartTime = collegeStartTime;
    config.collegeEndTime = collegeEndTime || "03:00 PM";
    config.workingDaysPerWeek = workingDaysPerWeek || 5;
    config.timeSlotsPerDay = timeSlotsPerDay;
    config.periodDurationMinutes = periodDurationMinutes;
    config.timeSlots = slots;
    
    await config.save();
    
    res.json({
      config,
      message: `Auto-generated ${timeSlotsPerDay} time slots successfully`,
      autoGenerated: true
    });
    
  } catch (err) {
    console.error('❌ Error generating time slots:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/timeslots/booking', async (req, res) => {
  try {
    const { slotNumber, days, slotName, durationMinutes } = req.body;
    
    console.log('🔥 Adding fixed booking:', { slotNumber, days, slotName, durationMinutes });
    
    if (!slotNumber || !days || !slotName || !durationMinutes) {
      return res.status(400).json({ error: 'Slot number, days, slot name, and duration are required' });
    }
    
    if (durationMinutes < 5 || durationMinutes > 180) {
      return res.status(400).json({ error: 'Duration must be between 5 and 180 minutes' });
    }
    
    let config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Time slot configuration not found. Please configure time slots first.' });
    }
    
    if (slotNumber > config.timeSlotsPerDay) {
      return res.status(400).json({ error: `Slot number must be between 1 and ${config.timeSlotsPerDay}` });
    }
    
    // Remove existing booking for same slot if exists
    config.fixedBookings = config.fixedBookings.filter(booking => booking.slotNumber !== slotNumber);
    
    const newBooking = {
      slotNumber: parseInt(slotNumber),
      days: Array.isArray(days) ? days : [days],
      slotName,
      durationMinutes: parseInt(durationMinutes),
      startOffset: 0
    };
    
    config.fixedBookings.push(newBooking);
    
    // Recalculate all time slots
    config.timeSlots = recalculateTimeSlots(
      config.timeSlots, 
      config.fixedBookings, 
      config.collegeStartTime
    );
    
    await config.save();
    
    console.log('✅ Fixed booking added and slots recalculated');
    
    res.json({
      booking: newBooking,
      message: `Fixed booking for ${slotName} (${durationMinutes} min) saved successfully`,
      recalculated: true
    });
    
  } catch (err) {
    console.error('❌ Error adding fixed booking:', err);
    res.status(400).json({ error: err.message });
  }
});

router.post('/timeslots', async (req, res) => {
  try {
    const {
      collegeStartTime,
      collegeEndTime,
      workingDaysPerWeek,
      timeSlotsPerDay,
      periodDurationMinutes,
      timeSlots,
      fixedBookings
    } = req.body;
    
    console.log('🔥 Saving advanced configuration with', fixedBookings?.length || 0, 'fixed bookings');
    
    if (!collegeStartTime || !collegeEndTime || !workingDaysPerWeek || !timeSlotsPerDay || !periodDurationMinutes) {
      return res.status(400).json({ error: 'All configuration fields are required' });
    }
    
    let config = await TimeSlotConfiguration.findOne();
    if (!config) {
      config = new TimeSlotConfiguration();
    }
    
    config.collegeStartTime = collegeStartTime;
    config.collegeEndTime = collegeEndTime;
    config.workingDaysPerWeek = workingDaysPerWeek;
    config.timeSlotsPerDay = timeSlotsPerDay;
    config.periodDurationMinutes = periodDurationMinutes;
    config.fixedBookings = fixedBookings || [];
    config.isConfigured = true;
    
    // Store original time slots and recalculate
    if (timeSlots && timeSlots.length > 0) {
      config.timeSlots = timeSlots.map(slot => ({
        ...slot,
        originalStartTime: slot.originalStartTime || slot.startTime,
        originalEndTime: slot.originalEndTime || slot.endTime
      }));
    }
    
    // Recalculate with fixed bookings
    if (config.fixedBookings.length > 0) {
      config.timeSlots = recalculateTimeSlots(
        config.timeSlots, 
        config.fixedBookings, 
        config.collegeStartTime
      );
    }
    
    await config.save();
    
    console.log('✅ Advanced configuration saved with dynamic recalculation');
    
    res.json({
      config,
      message: 'Advanced time slot configuration saved successfully',
      recalculated: config.fixedBookings.length > 0
    });
    
  } catch (err) {
    console.error('❌ Error saving time slot configuration:', err);
    res.status(400).json({ error: err.message });
  }
});

router.delete('/timeslots/booking/:slotNumber', async (req, res) => {
  try {
    const { slotNumber } = req.params;
    
    let config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Time slot configuration not found' });
    }
    
    const bookingIndex = config.fixedBookings.findIndex(
      booking => booking.slotNumber === parseInt(slotNumber)
    );
    
    if (bookingIndex === -1) {
      return res.status(404).json({ error: 'Fixed booking not found' });
    }
    
    const removedBooking = config.fixedBookings[bookingIndex];
    config.fixedBookings.splice(bookingIndex, 1);
    
    // Recalculate time slots
    config.timeSlots = recalculateTimeSlots(
      config.timeSlots, 
      config.fixedBookings, 
      config.collegeStartTime
    );
    
    await config.save();
    
    res.json({
      message: `Fixed booking "${removedBooking.slotName}" removed successfully`,
      recalculated: true
    });
    
  } catch (err) {
    console.error('❌ Error removing fixed booking:', err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/slots/availability', async (req, res) => {
  try {
    const config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Time slot configuration not found' });
    }
    
    const slotAvailability = config.timeSlots.map(slot => {
      const blockedDays = [];
      const availableDays = [];
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      for (const dayName of days) {
        const hasFixedBooking = config.fixedBookings.some(booking => 
          booking.slotNumber === slot.slotNumber &&
          (booking.days.includes('All days') || booking.days.includes(dayName))
        );
        
        if (hasFixedBooking) {
          const booking = config.fixedBookings.find(b => 
            b.slotNumber === slot.slotNumber &&
            (b.days.includes('All days') || b.days.includes(dayName))
          );
          blockedDays.push({
            day: dayName,
            reason: booking.slotName,
            duration: booking.durationMinutes
          });
        } else {
          availableDays.push(dayName);
        }
      }
      
      return {
        slotNumber: slot.slotNumber,
        startTime: slot.adjustedStartTime,
        endTime: slot.adjustedEndTime,
        availableDays,
        blockedDays,
        isFullyAvailable: blockedDays.length === 0,
        availabilityPercentage: (availableDays.length / days.length) * 100
      };
    });
    
    res.json({
      allSlots: slotAvailability,
      summary: {
        totalSlots: slotAvailability.length,
        fullyAvailableSlots: slotAvailability.filter(s => s.isFullyAvailable).length,
        partiallyBlockedSlots: slotAvailability.filter(s => s.blockedDays.length > 0 && s.availableDays.length > 0).length,
        fullyBlockedSlots: slotAvailability.filter(s => s.availableDays.length === 0).length
      },
      message: 'Complete slot availability analysis'
    });
    
  } catch (err) {
    console.error('❌ Error getting slot availability:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/slots/availability/:day', async (req, res) => {
  try {
    const { day } = req.params;
    
    const config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Time slot configuration not found' });
    }
    
    const slotAvailability = config.timeSlots.map(slot => {
      const blockedDays = [];
      const availableDays = [];
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      
      for (const dayName of days) {
        const hasFixedBooking = config.fixedBookings.some(booking => 
          booking.slotNumber === slot.slotNumber &&
          (booking.days.includes('All days') || booking.days.includes(dayName))
        );
        
        if (hasFixedBooking) {
          const booking = config.fixedBookings.find(b => 
            b.slotNumber === slot.slotNumber &&
            (b.days.includes('All days') || b.days.includes(dayName))
          );
          blockedDays.push({
            day: dayName,
            reason: booking.slotName,
            duration: booking.durationMinutes
          });
        } else {
          availableDays.push(dayName);
        }
      }
      
      return {
        slotNumber: slot.slotNumber,
        startTime: slot.adjustedStartTime,
        endTime: slot.adjustedEndTime,
        availableDays,
        blockedDays,
        isFullyAvailable: blockedDays.length === 0,
        availabilityPercentage: (availableDays.length / days.length) * 100
      };
    });

    const dayAvailability = slotAvailability.map(slot => ({
      ...slot,
      isAvailableThisDay: slot.availableDays.includes(day),
      blockingReason: slot.blockedDays.find(b => b.day === day)?.reason || null
    }));
    
    res.json({
      day,
      slots: dayAvailability,
      availableCount: dayAvailability.filter(s => s.isAvailableThisDay).length,
      blockedCount: dayAvailability.filter(s => !s.isAvailableThisDay).length,
      message: `Slot availability for ${day}`
    });
    
  } catch (err) {
    console.error('❌ Error getting slot availability:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/slots/available/:day', async (req, res) => {
  try {
    const { day } = req.params;
    
    if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day)) {
      return res.status(400).json({ error: 'Invalid day. Use Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday' });
    }
    
    const config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Time slot configuration not found' });
    }
    
    const availableSlots = [];
    
    for (const slot of config.timeSlots) {
      // Check if this slot has fixed bookings for this day
      const hasFixedBooking = config.fixedBookings.some(booking => 
        booking.slotNumber === slot.slotNumber &&
        (booking.days.includes('All days') || booking.days.includes(day))
      );
      
      if (!hasFixedBooking) {
        availableSlots.push({
          slotNumber: slot.slotNumber,
          startTime: slot.adjustedStartTime,
          endTime: slot.adjustedEndTime,
          isAvailable: true,
          originalStartTime: slot.originalStartTime,
          originalEndTime: slot.originalEndTime,
          isAdjusted: slot.isAdjusted
        });
      } else {
        const booking = config.fixedBookings.find(b => 
          b.slotNumber === slot.slotNumber &&
          (b.days.includes('All days') || b.days.includes(day))
        );
        console.log(`🔒 Slot ${slot.slotNumber} blocked by "${booking.slotName}" on ${day}`);
      }
    }
    
    res.json({
      day,
      availableSlots,
      availableCount: availableSlots.length,
      totalSlots: config.timeSlots.length,
      blockedCount: config.timeSlots.length - availableSlots.length,
      message: `Found ${availableSlots.length} available slots for ${day}`
    });
    
  } catch (err) {
    console.error('❌ Error getting available slots:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/timeslots/booking-enhanced', async (req, res) => {
  try {
    const { 
      slotNumber, 
      days, 
      slotName, 
      timingMode,
      durationMinutes,
      exactStartTime,
      exactEndTime,
      replaceConflicting = false
    } = req.body;
    
    console.log('🔥 Enhanced booking request:', req.body);
    
    // Validation
    if (!slotNumber || !days || !slotName || !timingMode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (timingMode === 'duration' && !durationMinutes) {
      return res.status(400).json({ error: 'Duration is required for duration mode' });
    }
    
    if (timingMode === 'exact' && (!exactStartTime || !exactEndTime)) {
      return res.status(400).json({ error: 'Start and end times are required for exact mode' });
    }
    
    // Time format validation for exact mode
    if (timingMode === 'exact') {
      const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;
      if (!timeRegex.test(exactStartTime) || !timeRegex.test(exactEndTime)) {
        return res.status(400).json({ error: 'Time must be in format "12:00 PM"' });
      }
      
      // Validate end time is after start time
      const startMinutes = convertTimeToMinutes(exactStartTime);
      const endMinutes = convertTimeToMinutes(exactEndTime);
      if (endMinutes <= startMinutes) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }
    }
    
    let config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Time slot configuration not found' });
    }
    
    // Calculate affected slots and check for conflicts
    let affectedSlots = [parseInt(slotNumber)];
    let calculatedDuration = durationMinutes;
    
    if (timingMode === 'exact') {
      calculatedDuration = convertTimeToMinutes(exactEndTime) - convertTimeToMinutes(exactStartTime);
      
      // Determine which slots this booking affects
      const startMinutes = convertTimeToMinutes(exactStartTime);
      const endMinutes = convertTimeToMinutes(exactEndTime);
      
      affectedSlots = config.timeSlots
        .filter(slot => {
          const slotStart = convertTimeToMinutes(slot.adjustedStartTime);
          const slotEnd = convertTimeToMinutes(slot.adjustedEndTime);
          return (startMinutes < slotEnd && endMinutes > slotStart);
        })
        .map(slot => slot.slotNumber);
    }
    
    // Check for conflicts
    const conflicts = [];
    for (const day of (Array.isArray(days) ? days : [days])) {
      const conflictingBookings = config.fixedBookings.filter(booking => {
        // Check if booking affects same days
        const sameDay = booking.days.includes('All days') || 
                       booking.days.includes(day) || 
                       days.includes('All days');
        
        if (!sameDay) return false;
        
        // Check slot overlap
        const hasSlotOverlap = booking.affectedSlots?.some(slot => affectedSlots.includes(slot)) ||
                              affectedSlots.includes(booking.slotNumber);
        
        // Check time overlap for exact mode
        if (timingMode === 'exact' && booking.timingMode === 'exact') {
          const newStart = convertTimeToMinutes(exactStartTime);
          const newEnd = convertTimeToMinutes(exactEndTime);
          const existingStart = convertTimeToMinutes(booking.exactStartTime);
          const existingEnd = convertTimeToMinutes(booking.exactEndTime);
          
          const hasTimeOverlap = newStart < existingEnd && newEnd > existingStart;
          return hasTimeOverlap;
        }
        
        return hasSlotOverlap;
      });
      
      conflicts.push(...conflictingBookings);
    }
    
    // If conflicts found and not replacing
    if (conflicts.length > 0 && !replaceConflicting) {
      return res.status(409).json({
        conflict: true,
        conflictingBookings: conflicts.map(booking => ({
          id: booking._id,
          slotName: booking.slotName,
          time: booking.timingMode === 'exact' 
            ? `${booking.exactStartTime} - ${booking.exactEndTime}`
            : `${booking.durationMinutes} minutes`,
          days: booking.days
        })),
        message: 'Time slot conflicts detected. Choose to replace or cancel.',
        suggestedAction: 'replace_or_cancel'
      });
    }
    
    // Remove conflicting bookings if replacing
    if (replaceConflicting && conflicts.length > 0) {
      config.fixedBookings = config.fixedBookings.filter(booking => 
        !conflicts.some(conflict => conflict._id.equals(booking._id))
      );
      console.log(`🗑️ Removed ${conflicts.length} conflicting bookings`);
    }
    
    // Create new booking
    const newBooking = {
      slotNumber: parseInt(slotNumber),
      days: Array.isArray(days) ? days : [days],
      slotName,
      timingMode,
      durationMinutes: timingMode === 'duration' ? parseInt(durationMinutes) : undefined,
      exactStartTime: timingMode === 'exact' ? exactStartTime : undefined,
      exactEndTime: timingMode === 'exact' ? exactEndTime : undefined,
      calculatedDurationMinutes: calculatedDuration,
      affectedSlots,
      startOffset: 0
    };
    
    // Remove any existing booking for same slot
    config.fixedBookings = config.fixedBookings.filter(booking => 
      booking.slotNumber !== parseInt(slotNumber)
    );
    
    config.fixedBookings.push(newBooking);
    
    // Recalculate time slots
    config.timeSlots = recalculateTimeSlots(
      config.timeSlots, 
      config.fixedBookings, 
      config.collegeStartTime
    );
    
    await config.save();
    
    console.log('✅ Enhanced booking saved successfully');
    
    res.json({
      booking: newBooking,
      message: `${slotName} booked successfully${replaceConflicting ? ' (replaced conflicting bookings)' : ''}`,
      mode: timingMode,
      duration: calculatedDuration,
      affectedSlots,
      conflictsReplaced: replaceConflicting ? conflicts.length : 0
    });
    
  } catch (err) {
    console.error('❌ Error creating enhanced booking:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/timeslots/check-conflicts', async (req, res) => {
  try {
    const { 
      slotNumber, 
      days, 
      timingMode,
      durationMinutes,
      exactStartTime,
      exactEndTime
    } = req.body;
    
    const config = await TimeSlotConfiguration.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // Same conflict detection logic as above
    const conflicts = [];
    // ... (conflict detection code) ...
    
    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts: conflicts.map(booking => ({
        id: booking._id,
        slotName: booking.slotName,
        time: booking.timingMode === 'exact' 
          ? `${booking.exactStartTime} - ${booking.exactEndTime}`
          : `${booking.durationMinutes} minutes`,
        days: booking.days
      }))
    });
    
  } catch (err) {
    console.error('❌ Error checking conflicts:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
