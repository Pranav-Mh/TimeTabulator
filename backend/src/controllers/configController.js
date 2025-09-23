const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');

// Get time configuration
const getTimeConfiguration = async (req, res) => {
  try {
    let config = await TimeSlotConfiguration.findOne({});
    
    if (!config) {
      // Create default configuration
      config = new TimeSlotConfiguration({
        collegeStartTime: '08:00',
        collegeEndTime: '15:00',
        workingDaysPerWeek: 5,
        timeSlotsPerDay: 6,
        periodDurationMinutes: 60,
        timeSlots: [],
        isConfigured: false
      });
      await config.save();
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching time configuration:', error);
    res.status(500).json({ error: 'Failed to fetch time configuration' });
  }
};

// Save time configuration
const saveTimeConfiguration = async (req, res) => {
  try {
    const {
      collegeStartTime,
      collegeEndTime,
      numberOfSlots,
      workingDaysPerWeek,
      periodDurationMinutes
    } = req.body;

    // Validate inputs
    if (!collegeStartTime || !collegeEndTime || !numberOfSlots) {
      return res.status(400).json({ error: 'College start time, end time, and number of slots are required' });
    }

    // Generate time slots
    const timeSlots = generateTimeSlots(collegeStartTime, collegeEndTime, numberOfSlots);

    let config = await TimeSlotConfiguration.findOne({});
    
    if (config) {
      // Update existing configuration
      config.collegeStartTime = collegeStartTime;
      config.collegeEndTime = collegeEndTime;
      config.timeSlotsPerDay = numberOfSlots;
      config.workingDaysPerWeek = workingDaysPerWeek || 5;
      config.periodDurationMinutes = periodDurationMinutes || 60;
      config.timeSlots = timeSlots;
      config.isConfigured = true;
    } else {
      // Create new configuration
      config = new TimeSlotConfiguration({
        collegeStartTime,
        collegeEndTime,
        timeSlotsPerDay: numberOfSlots,
        workingDaysPerWeek: workingDaysPerWeek || 5,
        periodDurationMinutes: periodDurationMinutes || 60,
        timeSlots,
        isConfigured: true
      });
    }

    await config.save();

    console.log(`✅ Time configuration saved: ${numberOfSlots} slots from ${collegeStartTime} to ${collegeEndTime}`);
    res.json(config);

  } catch (error) {
    console.error('Error saving time configuration:', error);
    res.status(500).json({ error: 'Failed to save time configuration' });
  }
};

// Generate time slots helper function
const generateTimeSlots = (startTime, endTime, numberOfSlots) => {
  const slots = [];
  
  // Convert time strings to minutes
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const totalMinutes = endMinutes - startMinutes;
  const slotDuration = Math.floor(totalMinutes / numberOfSlots);

  for (let i = 0; i < numberOfSlots; i++) {
    const slotStartMinutes = startMinutes + (i * slotDuration);
    const slotEndMinutes = startMinutes + ((i + 1) * slotDuration);
    
    const slotStartTime = minutesToTimeString(slotStartMinutes);
    const slotEndTime = minutesToTimeString(slotEndMinutes);
    
    slots.push({
      slotNumber: i + 1,
      originalStartTime: slotStartTime,
      originalEndTime: slotEndTime,
      adjustedStartTime: slotStartTime,
      adjustedEndTime: slotEndTime,
      isAdjusted: false,
      isBooked: false,
      bookedBy: null,
      bookingScope: null,
      bookingAffectedYears: []
    });
  }

  return slots;
};

// Helper function to convert minutes to time string
const minutesToTimeString = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Existing functions (keep from original file)
const getWorkingDaysPeriods = async (req, res) => {
  try {
    const config = await TimeSlotConfiguration.findOne({});
    if (!config) {
      return res.json({
        workingDaysPerWeek: 5,
        timeSlotsPerDay: 6,
        periodDurationMinutes: 60
      });
    }
    
    res.json({
      workingDaysPerWeek: config.workingDaysPerWeek,
      timeSlotsPerDay: config.timeSlotsPerDay,
      periodDurationMinutes: config.periodDurationMinutes
    });
  } catch (error) {
    console.error('Error fetching working days and periods:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
};

const saveWorkingDaysPeriods = async (req, res) => {
  try {
    const { workingDaysPerWeek, timeSlotsPerDay, periodDurationMinutes } = req.body;

    let config = await TimeSlotConfiguration.findOne({});
    
    if (config) {
      config.workingDaysPerWeek = workingDaysPerWeek;
      config.timeSlotsPerDay = timeSlotsPerDay;
      config.periodDurationMinutes = periodDurationMinutes;
    } else {
      config = new TimeSlotConfiguration({
        workingDaysPerWeek,
        timeSlotsPerDay,
        periodDurationMinutes
      });
    }

    await config.save();
    res.json(config);
  } catch (error) {
    console.error('Error saving working days and periods:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
};

const getTimeSlots = async (req, res) => {
  try {
    const config = await TimeSlotConfiguration.findOne({});
    res.json(config?.timeSlots || []);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
};

const addTimeSlot = async (req, res) => {
  try {
    const { start, end, type } = req.body;

    let config = await TimeSlotConfiguration.findOne({});
    if (!config) {
      config = new TimeSlotConfiguration({});
    }

    const newSlot = {
      slotNumber: (config.timeSlots?.length || 0) + 1,
      originalStartTime: start,
      originalEndTime: end,
      adjustedStartTime: start,
      adjustedEndTime: end,
      type: type || 'period',
      isAdjusted: false,
      isBooked: false
    };

    config.timeSlots = config.timeSlots || [];
    config.timeSlots.push(newSlot);
    await config.save();

    res.json(newSlot);
  } catch (error) {
    console.error('Error adding time slot:', error);
    res.status(500).json({ error: 'Failed to add time slot' });
  }
};

const deleteTimeSlot = async (req, res) => {
  try {
    const { index } = req.params;
    const slotIndex = parseInt(index);

    let config = await TimeSlotConfiguration.findOne({});
    if (!config || !config.timeSlots || slotIndex >= config.timeSlots.length) {
      return res.status(404).json({ error: 'Time slot not found' });
    }

    config.timeSlots.splice(slotIndex, 1);
    // Reindex slot numbers
    config.timeSlots = config.timeSlots.map((slot, idx) => ({
      ...slot,
      slotNumber: idx + 1
    }));

    await config.save();
    res.json({ message: 'Time slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.status(500).json({ error: 'Failed to delete time slot' });
  }
};

module.exports = {
  getTimeConfiguration,
  saveTimeConfiguration,
  getWorkingDaysPeriods,
  saveWorkingDaysPeriods,
  getTimeSlots,
  addTimeSlot,
  deleteTimeSlot
};
