// Function to get available slots for timetable generation
const getAvailableSlots = async (day) => {
  try {
    const config = await TimeSlotConfiguration.findOne();
    if (!config) return [];
    
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
          isAvailable: true
        });
      } else {
        console.log(`🔒 Slot ${slot.slotNumber} blocked by fixed booking on ${day}`);
      }
    }
    
    return availableSlots;
  } catch (err) {
    console.error('Error getting available slots:', err);
    return [];
  }
};

// Enhanced timetable generation considering fixed bookings
router.post('/generate', async (req, res) => {
  try {
    const { semester, subjects, teachers } = req.body;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const generatedTimetable = {};
    
    for (const day of days) {
      // Get only available slots (excluding fixed bookings)
      const availableSlots = await getAvailableSlots(day);
      
      generatedTimetable[day] = [];
      
      // Schedule subjects only in available slots
      for (const slot of availableSlots) {
        // Your existing timetable generation logic here
        // Only assign subjects to available slots
        
        generatedTimetable[day].push({
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject: 'Mathematics', // Your logic
          teacher: 'Prof. Smith',  // Your logic
          room: 'CL101',          // Your logic
          isScheduled: true
        });
      }
    }
    
    res.json({
      timetable: generatedTimetable,
      message: 'Timetable generated successfully (respecting fixed bookings)'
    });
    
  } catch (err) {
    console.error('Error generating timetable:', err);
    res.status(500).json({ error: err.message });
  }
});
