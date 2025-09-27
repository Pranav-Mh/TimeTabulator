const TimetableRestriction = require('../models/TimetableRestriction');
const TimeSlotConfiguration = require('../models/TimeSlotConfiguration');

// ✅ FIXED: Drop problematic indexes helper
const fixIndexes = async () => {
  try {
    const collection = TimetableRestriction.collection;
    
    try {
      await collection.dropIndex({ timeSlots: 1, days: 1 });
      console.log('✅ Dropped problematic compound array index');
    } catch (err) {
      console.log('ℹ️ Compound array index not found or already dropped');
    }
    
    try {
      await collection.dropIndex('timeSlots_1_days_1');
      console.log('✅ Dropped problematic named index');
    } catch (err) {
      console.log('ℹ️ Named compound index not found or already dropped');
    }
    
    try {
      await collection.createIndex({ type: 1, isActive: 1 });
      await collection.createIndex({ scope: 1 });
      console.log('✅ Safe indexes created successfully');
    } catch (err) {
      console.log('ℹ️ Safe indexes already exist');
    }
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error.message);
  }
};

fixIndexes();

// Get all restrictions
const getRestrictions = async (req, res) => {
  try {
    const restrictions = await TimetableRestriction.find({ isActive: true })
      .populate('timeConfigurationId')
      .sort({ createdAt: -1 });
    
    res.json(restrictions);
  } catch (error) {
    console.error('Error fetching restrictions:', error);
    res.status(500).json({ error: 'Failed to fetch restrictions' });
  }
};

// ✅ FIXED: Sync slot table with actual global restrictions
const syncSlotTableWithRestrictions = async () => {
  try {
    console.log('🔄 Syncing slot table with restriction database...');
    
    const config = await TimeSlotConfiguration.findOne({});
    if (!config) {
      console.log('No time slot configuration found');
      return;
    }

    // Get all active global restrictions
    const globalRestrictions = await TimetableRestriction.find({
      type: 'time',
      scope: 'global',
      isActive: true
    });

    console.log(`Found ${globalRestrictions.length} active global restrictions`);

    // Create a map of slot -> activity bookings
    const slotBookings = {};
    
    globalRestrictions.forEach(restriction => {
      if (restriction.timeSlots && restriction.timeSlots.length > 0) {
        restriction.timeSlots.forEach(slotNum => {
          // For global restrictions, they apply to all days
          slotBookings[slotNum] = {
            bookedBy: restriction.restrictionName,
            bookingScope: 'global',
            bookingAffectedYears: restriction.affectedYears || []
          };
        });
      }
    });

    console.log('Slot bookings map:', slotBookings);

    // Update the slot configuration
    const updatedTimeSlots = config.timeSlots.map(slot => {
      const slotNumber = slot.slotNumber;
      
      if (slotBookings[slotNumber]) {
        // Slot should be booked
        return {
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          originalStartTime: slot.originalStartTime || slot.startTime,
          originalEndTime: slot.originalEndTime || slot.endTime,
          isBooked: true,
          bookedBy: slotBookings[slotNumber].bookedBy,
          bookingScope: slotBookings[slotNumber].bookingScope,
          bookingAffectedYears: slotBookings[slotNumber].bookingAffectedYears
        };
      } else {
        // Slot should be available
        return {
          slotNumber: slot.slotNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
          originalStartTime: slot.originalStartTime || slot.startTime,
          originalEndTime: slot.originalEndTime || slot.endTime,
          isBooked: false,
          bookedBy: null,
          bookingScope: null,
          bookingAffectedYears: []
        };
      }
    });

    config.timeSlots = updatedTimeSlots;
    await config.save();

    console.log('✅ Slot table synchronized with restrictions database');
    
    // Log final state
    const bookedSlots = updatedTimeSlots.filter(s => s.isBooked);
    console.log('Final booked slots:', bookedSlots.map(s => `Slot ${s.slotNumber}: ${s.bookedBy}`));
    
  } catch (error) {
    console.error('Error syncing slot table:', error);
  }
};

// ✅ NEW: Get global bookings with sync
const getGlobalBookings = async (req, res) => {
  try {
    console.log('🔍 Fetching global bookings...');

    // ✅ CRITICAL: Sync slot table first
    await syncSlotTableWithRestrictions();

    const globalBookings = await TimetableRestriction.find({
      type: 'time',
      scope: 'global',
      isActive: true
    }).sort({ createdAt: -1 });

    // Format as list: "Monday, Slot 1: Morning Assembly"  
    const bookingsList = [];
    
    globalBookings.forEach(booking => {
      const activityName = booking.restrictionName;
      
      // Create entry for each day-slot combination
      if (booking.days && booking.timeSlots) {
        booking.days.forEach(day => {
          booking.timeSlots.forEach(slot => {
            bookingsList.push({
              id: booking._id,
              activityName: activityName,
              day: day,
              slot: slot,
              displayText: `${day}, Slot ${slot}: ${activityName}`
            });
          });
        });
      }
    });

    console.log(`✅ Found ${bookingsList.length} global booking entries`);

    res.json({
      bookings: bookingsList,
      totalEntries: bookingsList.length
    });

  } catch (error) {
    console.error('Error fetching global bookings:', error);
    res.status(500).json({ error: 'Failed to fetch global bookings' });
  }
};

// ✅ COMPLETELY FIXED: Get year-wise bookings for specific year
const getYearWiseBookings = async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year) {
      return res.status(400).json({ error: 'Year parameter is required' });
    }

    console.log(`🔍 Fetching year-wise bookings for: ${year}`);

    // ✅ FIXED: Proper query for year-wise bookings
    const yearBookings = await TimetableRestriction.find({
      type: 'time',
      scope: 'year-specific',
      affectedYears: { $in: [year] }, // ✅ FIXED: Use the full year string like "3rd Year"
      isActive: true
    }).sort({ createdAt: -1 });

    console.log(`📋 Found ${yearBookings.length} year-wise restriction documents for ${year}`);
    console.log('Year-wise bookings found:', yearBookings.map(b => ({
      name: b.restrictionName,
      slots: b.timeSlots,
      days: b.days,
      affectedYears: b.affectedYears
    })));

    // ✅ FIXED: Format as individual day-slot entries like global bookings
    const bookingsList = [];
    
    yearBookings.forEach(booking => {
      const activityName = booking.restrictionName;
      
      // Create entry for each day-slot combination
      if (booking.days && booking.timeSlots) {
        booking.days.forEach(day => {
          booking.timeSlots.forEach(slot => {
            bookingsList.push({
              id: booking._id,
              activityName: activityName,
              day: day,
              slot: slot,
              year: year,
              displayText: `${day}, Slot ${slot}: ${activityName} (${year})`
            });
          });
        });
      }
    });

    console.log(`✅ Generated ${bookingsList.length} individual booking entries for ${year}:`, 
      bookingsList.map(b => b.displayText));

    res.json({
      year: year,
      bookings: bookingsList,
      totalEntries: bookingsList.length
    });

  } catch (error) {
    console.error('Error fetching year-wise bookings:', error);
    res.status(500).json({ error: 'Failed to fetch year-wise bookings' });
  }
};

// ✅ FIXED: Delete specific day-slot booking with proper sync
const deleteSpecificBooking = async (req, res) => {
  try {
    const { bookingId, day, slot, activityName, scope } = req.body;

    if (!bookingId || !day || !slot || !activityName || !scope) {
      return res.status(400).json({ 
        error: 'Missing required parameters: bookingId, day, slot, activityName, scope' 
      });
    }

    console.log(`🗑️ Deleting specific booking:`, { bookingId, day, slot, activityName, scope });

    // Find the restriction
    const restriction = await TimetableRestriction.findById(bookingId);
    if (!restriction) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // ✅ FIXED: For both global and year-wise bookings
    const totalCombinations = (restriction.days?.length || 0) * (restriction.timeSlots?.length || 0);
    
    if (totalCombinations === 1) {
      // Only one combination - delete entire restriction
      restriction.isActive = false;
      await restriction.save();
      console.log(`✅ Deleted entire restriction (only one day-slot combination)`);
    } else {
      // Multiple combinations - remove this specific day-slot
      if (restriction.days && restriction.days.length > 1 && restriction.days.includes(day)) {
        restriction.days = restriction.days.filter(d => d !== day);
      } else if (restriction.timeSlots && restriction.timeSlots.length > 1 && restriction.timeSlots.includes(slot)) {
        restriction.timeSlots = restriction.timeSlots.filter(s => s !== slot);
      } else {
        restriction.isActive = false;
      }
      await restriction.save();
      console.log(`✅ Updated restriction by removing ${day}, Slot ${slot}`);
    }

    // ✅ CRITICAL: For global bookings, sync slot table
    if (scope === 'global') {
      await syncSlotTableWithRestrictions();
    }

    res.json({ 
      message: `Booking '${activityName}' for ${day}, Slot ${slot} deleted successfully`,
      scope: scope
    });

  } catch (error) {
    console.error('Error deleting specific booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
};

// ✅ ENHANCED: Check for time slot conflicts - PREVENT year-wise booking on global slots
const checkTimeSlotConflicts = async (timeSlots, days, scope, affectedYears) => {
  try {
    let conflictQuery = {
      type: 'time',
      isActive: true,
      timeSlots: { $in: timeSlots },
      days: { $in: days }
    };

    // ✅ CRITICAL: For year-specific bookings, ALWAYS check against global bookings
    if (scope === 'year-specific') {
      conflictQuery.scope = 'global';
    } else {
      // For global bookings, check against all (global + year-specific)
      conflictQuery.$or = [
        { scope: 'global' },
        { scope: 'year-specific', affectedYears: { $in: affectedYears || [] } }
      ];
    }

    const conflicts = await TimetableRestriction.find(conflictQuery);

    const conflictSlots = [];
    const conflictDetails = [];

    conflicts.forEach(conflict => {
      const overlappingSlots = (conflict.timeSlots || []).filter(slot => timeSlots.includes(slot));
      const overlappingDays = (conflict.days || []).filter(day => days.includes(day) || conflict.days.includes('All days'));
      
      if (overlappingSlots.length > 0 && overlappingDays.length > 0) {
        conflictSlots.push(...overlappingSlots);
        conflictDetails.push({
          restrictionName: conflict.restrictionName,
          slots: overlappingSlots,
          days: overlappingDays,
          scope: conflict.scope
        });
      }
    });

    return {
      hasConflicts: conflictDetails.length > 0,
      conflicts: conflictDetails,
      conflictSlots: [...new Set(conflictSlots)]
    };

  } catch (error) {
    console.error('Error checking conflicts:', error);
    return { hasConflicts: false, conflicts: [], conflictSlots: [] };
  }
};

// ✅ COMPLETELY FIXED: Add new restriction with proper year-wise handling
const addRestriction = async (req, res) => {
  try {
    const {
      type,
      restrictionName,
      scope,
      affectedYears,
      timeSlots,
      days,
      duration,
      teacherName,
      unavailableSlots,
      reason,
      subjectName,
      restrictedDays,
      allowedTimeSlots,
      roomType,
      priority
    } = req.body;

    // Validate required fields based on type
    if (type === 'time' && (!restrictionName || !timeSlots || timeSlots.length === 0)) {
      return res.status(400).json({ error: 'Activity name and time slots are required for time-based restrictions' });
    }

    if (type === 'teacher' && (!teacherName || !unavailableSlots || unavailableSlots.length === 0)) {
      return res.status(400).json({ error: 'Teacher name and unavailable slots are required for teacher-based restrictions' });
    }

    if (type === 'subject' && !subjectName) {
      return res.status(400).json({ error: 'Subject name is required for subject-based restrictions' });
    }

    // ✅ CRITICAL: Enhanced conflict checking for year-specific bookings
    if (type === 'time') {
      // ✅ For year-specific bookings, STRICTLY check against Global bookings (always conflict)
      if (scope === 'year-specific') {
        const globalConflictCheck = await checkTimeSlotConflicts(timeSlots, days, 'year-specific', []);
        if (globalConflictCheck.hasConflicts) {
          return res.status(409).json({ 
            error: 'Slot conflicts detected with Global bookings',
            conflicts: globalConflictCheck.conflicts,
            conflictMessage: `Slots ${globalConflictCheck.conflictSlots.join(', ')} are already globally booked by: ${globalConflictCheck.conflicts.map(c => c.restrictionName).join(', ')}. Global bookings block all year-specific bookings.`
          });
        }
      } else {
        // For global bookings, check against year-specific as normal
        const yearConflictCheck = await checkTimeSlotConflicts(timeSlots, days, scope, affectedYears);
        if (yearConflictCheck.hasConflicts) {
          return res.status(409).json({ 
            error: 'Slot conflicts detected',
            conflicts: yearConflictCheck.conflicts,
            conflictMessage: `Slots ${yearConflictCheck.conflictSlots.join(', ')} are already booked by: ${yearConflictCheck.conflicts.map(c => c.restrictionName).join(', ')}. Do you want to override?`
          });
        }
      }
    }

    // ✅ COMPLETELY FIXED: Handle year-specific bookings properly - KEEP ORIGINAL YEAR NAMES
    if (type === 'time' && scope === 'year-specific') {
      console.log('🎓 Creating year-specific booking with ORIGINAL year names');
      console.log('Days received:', days);
      console.log('Slots received:', timeSlots);
      console.log('Affected years (ORIGINAL):', affectedYears);
      
      // ✅ FIXED: Create SINGLE restriction with ORIGINAL year names (don't convert to SE/TE)
      const newRestriction = new TimetableRestriction({
        type,
        restrictionName,
        scope,
        affectedYears: affectedYears || [], // ✅ KEEP AS ["3rd Year"] not ["TE"]
        timeSlots: timeSlots, // Keep all selected slots
        days: days, // Keep all selected days
        duration: duration || 30,
        priority: priority || 2
      });

      const savedRestriction = await newRestriction.save();
      
      console.log(`✅ Created year-specific restriction: ${restrictionName} for ${affectedYears[0]}`);
      console.log(`   - Days: ${days.join(', ')}`);
      console.log(`   - Slots: ${timeSlots.join(', ')}`);
      console.log(`   - Affected Years (STORED): ${savedRestriction.affectedYears.join(', ')}`);

      // Don't update TimeSlotConfiguration for year-specific bookings
      console.log(`✅ Year-specific restriction created (no slot table update)`);
      
      return res.status(201).json({
        message: `Year-specific restriction created successfully`,
        restriction: savedRestriction
      });
    }

    // ✅ FIXED: Handle global bookings (single entry, updates slot table)
    const newRestriction = new TimetableRestriction({
      type,
      restrictionName: restrictionName || teacherName || subjectName,
      scope: scope || 'global',
      affectedYears: affectedYears || [],
      timeSlots: timeSlots || [],
      days: days || [],
      duration: duration || 30,
      teacherName,
      unavailableSlots: unavailableSlots || [],
      reason,
      subjectName,
      restrictedDays: restrictedDays || [],
      allowedTimeSlots: allowedTimeSlots || [],
      roomType: roomType || 'any',
      priority: priority || 3
    });

    await newRestriction.save();

    // ✅ FIXED: For global bookings, sync the slot table
    if (type === 'time' && scope === 'global') {
      console.log('🌐 Global booking added - syncing slot table...');
      await syncSlotTableWithRestrictions();
    }

    console.log(`✅ New restriction added: ${newRestriction.restrictionName}`);
    res.status(201).json(newRestriction);

  } catch (error) {
    console.error('Error adding restriction:', error);
    res.status(500).json({ error: 'Failed to add restriction' });
  }
};

// Delete restriction
const deleteRestriction = async (req, res) => {
  try {
    const { id } = req.params;

    const restriction = await TimetableRestriction.findById(id);
    if (!restriction) {
      return res.status(404).json({ error: 'Restriction not found' });
    }

    // Soft delete
    restriction.isActive = false;
    await restriction.save();

    // ✅ FIXED: For global bookings, sync slot table
    if (restriction.type === 'time' && restriction.scope === 'global') {
      console.log('🌐 Global restriction deleted - syncing slot table...');
      await syncSlotTableWithRestrictions();
    }

    console.log(`✅ Restriction deleted: ${restriction.restrictionName}`);
    res.json({ message: 'Restriction deleted successfully' });

  } catch (error) {
    console.error('Error deleting restriction:', error);
    res.status(500).json({ error: 'Failed to delete restriction' });
  }
};

// Handle override conflicts
const overrideConflicts = async (req, res) => {
  try {
    const {
      type,
      restrictionName,
      scope,
      affectedYears,
      timeSlots,
      days,
      duration,
      priority,
      overrideConflicts: shouldOverride
    } = req.body;

    if (!shouldOverride) {
      return res.status(400).json({ error: 'Override confirmation required' });
    }

    // Mark conflicting restrictions as inactive
    await TimetableRestriction.updateMany({
      type: 'time',
      isActive: true,
      timeSlots: { $in: timeSlots },
      days: { $in: days }
    }, { isActive: false });

    // Create new restriction
    const newRestriction = new TimetableRestriction({
      type,
      restrictionName,
      scope: scope || 'global',
      affectedYears: affectedYears || [],
      timeSlots: timeSlots || [],
      days: days || [],
      duration: duration || 30,
      priority: priority || 3
    });

    await newRestriction.save();

    // ✅ FIXED: For global bookings, sync slot table
    if (type === 'time' && scope === 'global') {
      console.log('🌐 Global override completed - syncing slot table...');
      await syncSlotTableWithRestrictions();
    }

    console.log(`✅ Override successful for: ${restrictionName}`);
    res.status(201).json(newRestriction);

  } catch (error) {
    console.error('Error overriding conflicts:', error);
    res.status(500).json({ error: 'Failed to override conflicts' });
  }
};

// Get restriction conflicts
const getConflicts = async (req, res) => {
  try {
    const { timeSlots, days, scope, affectedYears } = req.query;

    const parsedTimeSlots = JSON.parse(timeSlots || '[]');
    const parsedDays = JSON.parse(days || '[]');
    const parsedAffectedYears = JSON.parse(affectedYears || '[]');

    const conflictCheck = await checkTimeSlotConflicts(parsedTimeSlots, parsedDays, scope, parsedAffectedYears);

    res.json(conflictCheck);
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
};

module.exports = {
  getRestrictions,
  addRestriction,
  deleteRestriction,
  getConflicts,
  overrideConflicts,
  getYearWiseBookings,
  getGlobalBookings,
  deleteSpecificBooking,
  syncSlotTableWithRestrictions // ✅ Export for manual sync
};
