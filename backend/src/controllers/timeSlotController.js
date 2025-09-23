const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');

// ✅ FIXED: Save time configuration while preserving manual edits
const saveTimeConfiguration = async (req, res) => {
  try {
    const {
      collegeStartTime,
      collegeEndTime,
      numberOfSlots,
      timeSlots,
      isManualMode
    } = req.body;

    console.log('🔄 Saving time configuration:', {
      collegeStartTime,
      collegeEndTime,
      numberOfSlots,
      isManualMode,
      slotsCount: timeSlots?.length
    });

    // Find existing configuration or create new one
    let config = await TimeSlotConfiguration.findOne({});
    
    if (!config) {
      // Create new configuration
      config = new TimeSlotConfiguration({
        collegeStartTime,
        collegeEndTime,
        numberOfSlots,
        timeSlots: timeSlots.map(slot => ({
          ...slot,
          originalStartTime: slot.startTime,
          originalEndTime: slot.endTime,
          isBooked: false,
          bookedBy: null
        })),
        isManualMode,
        isConfigured: true
      });
    } else {
      // ✅ FIXED: Update existing configuration while preserving booking status
      config.collegeStartTime = collegeStartTime;
      config.collegeEndTime = collegeEndTime;
      config.numberOfSlots = numberOfSlots;
      config.isManualMode = isManualMode;
      config.isConfigured = true;
      
      // ✅ CRITICAL: Preserve booking status while updating slot configurations
      if (timeSlots && timeSlots.length > 0) {
        config.timeSlots = timeSlots.map(newSlot => {
          // Find existing slot to preserve booking status
          const existingSlot = config.timeSlots.find(existing => 
            existing.slotNumber === newSlot.slotNumber
          );
          
          return {
            ...newSlot,
            originalStartTime: newSlot.startTime,
            originalEndTime: newSlot.endTime,
            // ✅ PRESERVE booking status from existing slot
            isBooked: existingSlot?.isBooked || false,
            bookedBy: existingSlot?.bookedBy || null,
            bookingScope: existingSlot?.bookingScope || null,
            bookingAffectedYears: existingSlot?.bookingAffectedYears || []
          };
        });
      }
    }

    await config.save();

    console.log('✅ Time configuration saved successfully:', {
      numberOfSlots: config.numberOfSlots,
      isManualMode: config.isManualMode,
      slotsWithBookings: config.timeSlots.filter(s => s.isBooked).length
    });

    res.json(config);
  } catch (error) {
    console.error('Error saving time configuration:', error);
    res.status(500).json({ error: 'Failed to save time configuration' });
  }
};

// Get time configuration
const getTimeConfiguration = async (req, res) => {
  try {
    const config = await TimeSlotConfiguration.findOne({});
    
    if (!config) {
      return res.json({
        collegeStartTime: '',
        collegeEndTime: '',
        numberOfSlots: 6,
        timeSlots: [],
        isManualMode: false,
        isConfigured: false
      });
    }

    console.log('📋 Retrieved time configuration:', {
      numberOfSlots: config.numberOfSlots,
      isConfigured: config.isConfigured,
      slotsWithBookings: config.timeSlots?.filter(s => s.isBooked).length || 0
    });

    res.json(config);
  } catch (error) {
    console.error('Error fetching time configuration:', error);
    res.status(500).json({ error: 'Failed to fetch time configuration' });
  }
};

module.exports = {
  saveTimeConfiguration,
  getTimeConfiguration
};
