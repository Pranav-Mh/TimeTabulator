import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimetableRestrictions = () => {
  const [activeTab, setActiveTab] = useState('time');
  const [restrictions, setRestrictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Advanced Time Configuration State
  const [timeConfig, setTimeConfig] = useState({
    collegeStartTime: '',
    collegeEndTime: '',
    numberOfSlots: 6,
    isConfigured: false
  });
  
  const [timeSlots, setTimeSlots] = useState([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [slotValidationErrors, setSlotValidationErrors] = useState({});

  // Conflict modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);

  // ✅ NEW: Booking display states
  const [existingYearBookings, setExistingYearBookings] = useState({});
  const [existingGlobalBookings, setExistingGlobalBookings] = useState([]);
  const [yearBookingsLoading, setYearBookingsLoading] = useState(false);
  const [globalBookingsLoading, setGlobalBookingsLoading] = useState(false);

  // Booking States
  const [globalBooking, setGlobalBooking] = useState({
    slotNumbers: [],
    days: ['All days'],
    activityName: '',
    duration: 30,
    priority: 3
  });

  const [yearBooking, setYearBooking] = useState({
    year: '2nd Year',
    slotNumbers: [],
    days: ['All days'],
    activityName: '',
    duration: 30,
    priority: 3
  });

  // Existing restriction states
  const [newTeacherRestriction, setNewTeacherRestriction] = useState({
    type: 'teacher-based',
    teacherName: '',
    unavailableSlots: [],
    days: ['All days'],
    reason: '',
    priority: 3
  });

  const [newSubjectRestriction, setNewSubjectRestriction] = useState({
    type: 'subject-based',
    subjectName: '',
    restrictedDays: [],
    allowedTimeSlots: [],
    roomType: 'any',
    priority: 3
  });

  useEffect(() => {
    fetchRestrictions();
    fetchTimeConfiguration();
  }, []);

  // ✅ NEW: Fetch global bookings when global modal opens
  useEffect(() => {
    if (showGlobalModal) {
      fetchGlobalBookings();
    }
  }, [showGlobalModal]);

  // Fetch year bookings when year changes
  useEffect(() => {
    if (showYearModal && yearBooking.year) {
      fetchYearWiseBookings(yearBooking.year);
    }
  }, [yearBooking.year, showYearModal]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // ✅ NEW: Manual sync function for debugging
  const manualSyncSlots = async () => {
    try {
      console.log('🔄 Triggering manual sync...');
      await axios.post('http://localhost:5000/api/restrictions/sync-slots');
      setMessage('✅ Slot table synced successfully');
      
      // Refresh time configuration after sync
      setTimeout(async () => {
        await fetchTimeConfiguration();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Sync error:', err);
      setError('Failed to sync slot table');
    }
  };

  // Fetch existing data
  const fetchRestrictions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/restrictions');
      setRestrictions(response.data);
    } catch (err) {
      console.error('Error fetching restrictions:', err);
      setError('Failed to fetch restrictions');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch global bookings in list format
  const fetchGlobalBookings = async () => {
    try {
      setGlobalBookingsLoading(true);
      console.log('🔍 Fetching global bookings...');
      
      const response = await axios.get('http://localhost:5000/api/restrictions/global-bookings');
      
      console.log('✅ Global bookings:', response.data);
      setExistingGlobalBookings(response.data.bookings || []);
      
    } catch (err) {
      console.error('Error fetching global bookings:', err);
      setExistingGlobalBookings([]);
    } finally {
      setGlobalBookingsLoading(false);
    }
  };

  // Fetch year-wise bookings for specific year
  const fetchYearWiseBookings = async (year) => {
    try {
      setYearBookingsLoading(true);
      console.log(`🔍 Fetching bookings for: ${year}`);
      
      const response = await axios.get(`http://localhost:5000/api/restrictions/year-wise/${encodeURIComponent(year)}`);
      
      console.log(`✅ Year-wise bookings for ${year}:`, response.data);
      setExistingYearBookings(response.data.bookings || {});
      
    } catch (err) {
      console.error('Error fetching year-wise bookings:', err);
      setExistingYearBookings({});
    } finally {
      setYearBookingsLoading(false);
    }
  };

  // ✅ NEW: Delete specific booking function
  const deleteSpecificBooking = async (bookingData) => {
    const { id, activityName, day, slot, scope, year } = bookingData;
    
    const confirmMessage = `Delete '${activityName}' booking for ${day}, Slot ${slot}? This cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    try {
      console.log('🗑️ Deleting specific booking:', bookingData);

      await axios.post('http://localhost:5000/api/restrictions/delete-specific', {
        bookingId: id,
        day: day,
        slot: slot,
        activityName: activityName,
        scope: scope
      });

      setMessage(`✅ Booking '${activityName}' for ${day}, Slot ${slot} deleted successfully`);
      
      // ✅ Close modal and refresh main page
      if (scope === 'global') {
        setShowGlobalModal(false);
      } else {
        setShowYearModal(false);
      }

      // Reset form states
      setGlobalBooking({
        slotNumbers: [],
        days: ['All days'],
        activityName: '',
        duration: 30,
        priority: 3
      });

      setYearBooking({
        year: '2nd Year',
        slotNumbers: [],
        days: ['All days'],
        activityName: '',
        duration: 30,
        priority: 3
      });

      // Refresh main page data
      setTimeout(async () => {
        await Promise.all([
          fetchRestrictions(),
          fetchTimeConfiguration()
        ]);
      }, 1000);

    } catch (err) {
      console.error('❌ Delete error:', err);
      setError(err.response?.data?.error || 'Failed to delete booking');
    }
  };

  // Time configuration fetching
  const fetchTimeConfiguration = async () => {
    try {
      console.log('🔄 Fetching time configuration...');
      const response = await axios.get('http://localhost:5000/api/config/time-configuration');
      
      if (response.data) {
        console.log('📋 Raw response from backend:', response.data);
        
        setTimeConfig({
          collegeStartTime: response.data.collegeStartTime || '',
          collegeEndTime: response.data.collegeEndTime || '',
          numberOfSlots: response.data.numberOfSlots || 6,
          isConfigured: response.data.isConfigured || false
        });
        
        if (response.data.isConfigured && response.data.timeSlots && response.data.timeSlots.length > 0) {
          const slotsWithValidTimes = response.data.timeSlots.map((slot, index) => ({
            slotNumber: slot.slotNumber || (index + 1),
            startTime: slot.startTime || slot.originalStartTime || '00:00',
            endTime: slot.endTime || slot.originalEndTime || '00:00',
            originalStartTime: slot.originalStartTime || slot.startTime || '00:00',
            originalEndTime: slot.originalEndTime || slot.endTime || '00:00',
            isBooked: Boolean(slot.isBooked),
            bookedBy: slot.bookedBy || null,
            bookingScope: slot.bookingScope || null,
            bookingAffectedYears: slot.bookingAffectedYears || []
          }));
          
          setTimeSlots(slotsWithValidTimes);
          setIsManualMode(response.data.isManualMode || false);
        } else {
          setTimeSlots([]);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching time configuration:', err);
      setError('Failed to fetch time configuration');
    }
  };

  // Time conversion utilities
  const timeToMinutes = (timeString) => {
    if (!timeString || typeof timeString !== 'string') {
      return 0;
    }
    
    try {
      const parts = timeString.split(':');
      if (parts.length !== 2) return 0;
      
      const [hours, minutes] = parts.map(Number);
      if (isNaN(hours) || isNaN(minutes)) return 0;
      
      return hours * 60 + minutes;
    } catch (error) {
      return 0;
    }
  };

  const minutesToTime = (minutes) => {
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
      return '00:00';
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Get slot time range string
  const getSlotTimeRange = (slotNumber) => {
    const slot = timeSlots.find(s => s.slotNumber === slotNumber);
    if (slot) {
      return `${slot.startTime}-${slot.endTime}`;
    }
    return '';
  };

  // Validation functions
  const validateSlotTime = (slotIndex, field, value) => {
    if (!value || typeof value !== 'string') return;

    const errors = { ...slotValidationErrors };
    const slotKey = `slot${slotIndex}`;
    
    if (!errors[slotKey]) errors[slotKey] = {};
    delete errors[slotKey][field];

    if (!timeConfig.collegeStartTime || !timeConfig.collegeEndTime) return;

    const collegeStart = timeToMinutes(timeConfig.collegeStartTime);
    const collegeEnd = timeToMinutes(timeConfig.collegeEndTime);
    const valueMinutes = timeToMinutes(value);

    if (valueMinutes < collegeStart || valueMinutes > collegeEnd) {
      errors[slotKey][field] = `Time must be between ${timeConfig.collegeStartTime} - ${timeConfig.collegeEndTime}`;
    }

    if (field === 'startTime' && slotIndex > 0) {
      const prevSlot = timeSlots[slotIndex - 1];
      if (prevSlot && prevSlot.endTime) {
        const prevSlotEndTime = timeToMinutes(prevSlot.endTime);
        if (valueMinutes !== prevSlotEndTime) {
          errors[slotKey][field] = `Must start exactly at ${prevSlot.endTime} (when previous slot ends)`;
        }
      }
    }

    if (field === 'endTime') {
      const currentSlot = timeSlots[slotIndex];
      if (currentSlot && currentSlot.startTime) {
        const startTime = timeToMinutes(currentSlot.startTime);
        if (valueMinutes <= startTime) {
          errors[slotKey][field] = 'End time must be after start time';
        }
      }
    }

    if (field === 'endTime' && slotIndex < timeSlots.length - 1) {
      const updatedSlots = [...timeSlots];
      if (updatedSlots[slotIndex + 1]) {
        updatedSlots[slotIndex + 1].startTime = value;
        setTimeSlots(updatedSlots);
        
        const nextSlotKey = `slot${slotIndex + 1}`;
        if (errors[nextSlotKey] && errors[nextSlotKey]['startTime']) {
          delete errors[nextSlotKey]['startTime'];
        }
      }
    }

    setSlotValidationErrors(errors);
  };

  // Save time configuration
  const saveTimeConfiguration = async () => {
    try {
      if (!timeConfig.collegeStartTime || !timeConfig.collegeEndTime) {
        setError('Please set both college start and end times');
        return;
      }

      if (timeConfig.collegeStartTime >= timeConfig.collegeEndTime) {
        setError('College end time must be after start time');
        return;
      }

      if (isManualMode && timeSlots.length > 0) {
        const hasErrors = Object.keys(slotValidationErrors).some(slotKey => 
          Object.keys(slotValidationErrors[slotKey]).length > 0
        );
        
        if (hasErrors) {
          setError('Please fix all slot time validation errors before saving');
          return;
        }

        const lastSlot = timeSlots[timeSlots.length - 1];
        if (lastSlot && lastSlot.endTime) {
          const collegeEnd = timeToMinutes(timeConfig.collegeEndTime);
          const lastSlotEnd = timeToMinutes(lastSlot.endTime);
          
          if (lastSlotEnd > collegeEnd) {
            setError('Last slot must end before college end time');
            return;
          }
        }
      }

      const configData = {
        ...timeConfig,
        timeSlots: timeSlots,
        isManualMode: isManualMode
      };

      await axios.post('http://localhost:5000/api/config/time-configuration', configData);
      
      setTimeConfig(prev => ({ ...prev, isConfigured: true }));
      setMessage('✅ Time configuration saved successfully! Booking options are now available.');
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save time configuration');
    }
  };

  const generateTimeSlots = (manual = false) => {
    if (!timeConfig.collegeStartTime || !timeConfig.collegeEndTime || !timeConfig.numberOfSlots) {
      setError('Please fill in all time configuration fields');
      return;
    }

    setIsManualMode(manual);
    setSlotValidationErrors({});

    const startTime = timeToMinutes(timeConfig.collegeStartTime);
    const endTime = timeToMinutes(timeConfig.collegeEndTime);
    const totalMinutes = endTime - startTime;
    const slotDuration = Math.floor(totalMinutes / timeConfig.numberOfSlots);

    const slots = [];
    for (let i = 0; i < timeConfig.numberOfSlots; i++) {
      const slotStart = startTime + (i * slotDuration);
      const slotEnd = startTime + ((i + 1) * slotDuration);
      
      slots.push({
        slotNumber: i + 1,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        originalStartTime: minutesToTime(slotStart),
        originalEndTime: minutesToTime(slotEnd),
        isBooked: false,
        bookedBy: null
      });
    }

    setTimeSlots(slots);
  };

  const handleSlotTimeChange = (slotIndex, field, value) => {
    if (slotIndex < 0 || slotIndex >= timeSlots.length || !field || !value) return;

    const updatedSlots = [...timeSlots];
    if (!updatedSlots[slotIndex]) return;

    updatedSlots[slotIndex][field] = value;
    setTimeSlots(updatedSlots);
    
    validateSlotTime(slotIndex, field, value);
  };

  // Get slot display information
  const getSlotDisplayInfo = (slot) => {
    if (slot?.isBooked && slot?.bookedBy) {
      return {
        status: '🚫 Booked',
        statusColor: '#d32f2f',
        backgroundColor: '#ffcdd2',
        title: `Booked by: ${slot.bookedBy}`,
        description: slot.bookedBy
      };
    }
    return {
      status: '✅ Available',
      statusColor: '#2e7d32', 
      backgroundColor: '#c8e6c9',
      title: 'Available for booking',
      description: null
    };
  };

  // Global booking functions
  const handleGlobalBooking = async () => {
    try {
      if (!globalBooking.activityName.trim()) {
        setError('Activity name is required');
        return;
      }

      if (globalBooking.slotNumbers.length === 0) {
        setError('Please select at least one time slot');
        return;
      }

      const bookingData = {
        type: 'time',
        scope: 'global',
        restrictionName: globalBooking.activityName,
        timeSlots: globalBooking.slotNumbers,
        days: globalBooking.days,
        priority: globalBooking.priority,
        duration: globalBooking.duration
      };

      try {
        await axios.post('http://localhost:5000/api/restrictions', bookingData);
        
        setMessage('✅ Global time restriction added successfully!');
        setShowGlobalModal(false);
        
        setGlobalBooking({
          slotNumbers: [],
          days: ['All days'],
          activityName: '',
          duration: 30,
          priority: 3
        });
        
        setTimeout(async () => {
          await Promise.all([
            fetchRestrictions(),
            fetchTimeConfiguration()
          ]);
        }, 1000);

      } catch (conflictError) {
        if (conflictError.response?.status === 409) {
          const conflictResponse = conflictError.response.data;
          setConflictData(conflictResponse);
          setPendingBooking(bookingData);
          setShowConflictModal(true);
        } else {
          throw conflictError;
        }
      }

    } catch (err) {
      console.error('❌ Global booking error:', err);
      setError(err.response?.data?.error || 'Failed to add global restriction');
    }
  };

  // Year-wise booking function
  const handleYearBooking = async () => {
    try {
      if (!yearBooking.activityName.trim()) {
        setError('Activity name is required');
        return;
      }

      if (yearBooking.slotNumbers.length === 0) {
        setError('Please select at least one time slot');
        return;
      }

      // Check for conflicts with same year bookings and show override warning
      const conflictingSlots = [];
      yearBooking.slotNumbers.forEach(slotNum => {
        yearBooking.days.forEach(day => {
          Object.keys(existingYearBookings).forEach(activityName => {
            existingYearBookings[activityName].forEach(booking => {
              if (booking.slot === slotNum && booking.day === day) {
                conflictingSlots.push({
                  activity: activityName,
                  slot: slotNum,
                  day: day
                });
              }
            });
          });
        });
      });

      if (conflictingSlots.length > 0) {
        const conflictList = conflictingSlots.map(c => `${c.activity} on ${c.day}, Slot ${c.slot}`).join(', ');
        const confirmOverride = window.confirm(
          `⚠️ Slot Override Warning!\n\nThis will discard the following existing bookings for ${yearBooking.year}:\n\n• ${conflictList}\n\nDo you want to continue and override these bookings?`
        );
        
        if (!confirmOverride) {
          return;
        }
      }

      const bookingData = {
        type: 'time',
        scope: 'year-specific',
        affectedYears: [yearBooking.year],
        restrictionName: yearBooking.activityName,
        timeSlots: yearBooking.slotNumbers,
        days: yearBooking.days,
        priority: yearBooking.priority,
        duration: yearBooking.duration
      };

      try {
        await axios.post('http://localhost:5000/api/restrictions', bookingData);
        
        setMessage(`✅ Year-specific booking added for ${yearBooking.year} on ${yearBooking.days.join(', ')} at slots ${yearBooking.slotNumbers.join(', ')}`);
        setShowYearModal(false);
        
        setYearBooking({
          year: '2nd Year',
          slotNumbers: [],
          days: ['All days'],
          activityName: '',
          duration: 30,
          priority: 3
        });

        setTimeout(async () => {
          await fetchRestrictions();
          await fetchYearWiseBookings(yearBooking.year);
        }, 1000);

      } catch (conflictError) {
        if (conflictError.response?.status === 409) {
          const conflictData = conflictError.response.data;
          window.confirm(
            `⚠️ Global Conflict Detected!\n\n${conflictData.conflictMessage}\n\nGlobal bookings cannot be overridden by year-specific bookings.`
          );
        } else {
          throw conflictError;
        }
      }

    } catch (err) {
      console.error('❌ Year booking error:', err);
      setError(err.response?.data?.error || 'Failed to add year-specific restriction');
    }
  };

  // Conflict resolution
  const handleConflictResolution = async (shouldOverride) => {
    try {
      if (!shouldOverride) {
        setShowConflictModal(false);
        setConflictData(null);
        setPendingBooking(null);
        return;
      }

      await axios.post('http://localhost:5000/api/restrictions/override', {
        ...pendingBooking,
        overrideConflicts: true
      });

      setMessage('✅ Global restriction added successfully (previous bookings overridden)!');
      
      setShowConflictModal(false);
      setShowGlobalModal(false);
      
      setConflictData(null);
      setPendingBooking(null);
      setGlobalBooking({
        slotNumbers: [],
        days: ['All days'],
        activityName: '',
        duration: 30,
        priority: 3
      });

      setTimeout(async () => {
        await Promise.all([
          fetchRestrictions(),
          fetchTimeConfiguration()
        ]);
      }, 1000);

    } catch (overrideError) {
      console.error('❌ Override error:', overrideError);
      setError('Failed to override conflicts: ' + (overrideError.response?.data?.error || overrideError.message));
      setShowConflictModal(false);
    }
  };

  // Toggle functions for bookings
  const toggleSlotSelection = (slotNumber, bookingType) => {
    if (bookingType === 'global') {
      setGlobalBooking(prev => ({
        ...prev,
        slotNumbers: prev.slotNumbers.includes(slotNumber)
          ? prev.slotNumbers.filter(s => s !== slotNumber)
          : [...prev.slotNumbers, slotNumber]
      }));
    } else {
      setYearBooking(prev => ({
        ...prev,
        slotNumbers: prev.slotNumbers.includes(slotNumber)
          ? prev.slotNumbers.filter(s => s !== slotNumber)
          : [...prev.slotNumbers, slotNumber]
      }));
    }
  };

  const toggleDaySelection = (day, bookingType) => {
    if (bookingType === 'global') {
      setGlobalBooking(prev => ({
        ...prev,
        days: prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
      }));
    } else {
      setYearBooking(prev => ({
        ...prev,
        days: prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
      }));
    }
  };

  // Keep existing teacher/subject functions unchanged...
  const addTeacherRestriction = async () => {
    try {
      if (!newTeacherRestriction.teacherName.trim()) {
        setError('Teacher name is required');
        return;
      }

      await axios.post('http://localhost:5000/api/restrictions', {
        type: 'teacher',
        teacherName: newTeacherRestriction.teacherName,
        unavailableSlots: newTeacherRestriction.unavailableSlots,
        days: newTeacherRestriction.days,
        reason: newTeacherRestriction.reason,
        priority: newTeacherRestriction.priority
      });
      
      setMessage('Teacher-based restriction added successfully');
      setNewTeacherRestriction({
        type: 'teacher-based',
        teacherName: '',
        unavailableSlots: [],
        days: ['All days'],
        reason: '',
        priority: 3
      });
      fetchRestrictions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add restriction');
    }
  };

  const addSubjectRestriction = async () => {
    try {
      if (!newSubjectRestriction.subjectName.trim()) {
        setError('Subject name is required');
        return;
      }

      await axios.post('http://localhost:5000/api/restrictions', {
        type: 'subject',
        subjectName: newSubjectRestriction.subjectName,
        restrictedDays: newSubjectRestriction.restrictedDays,
        allowedTimeSlots: newSubjectRestriction.allowedTimeSlots,
        roomType: newSubjectRestriction.roomType,
        priority: newSubjectRestriction.priority
      });
      
      setMessage('Subject-based restriction added successfully');
      setNewSubjectRestriction({
        type: 'subject-based',
        subjectName: '',
        restrictedDays: [],
        allowedTimeSlots: [],
        roomType: 'any',
        priority: 3
      });
      fetchRestrictions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add restriction');
    }
  };

  const removeRestriction = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove the restriction "${name}"?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/restrictions/${id}`);
        setMessage('Restriction removed successfully');
        fetchRestrictions();
        
        setTimeout(async () => {
          await fetchTimeConfiguration();
        }, 500);
      } catch (err) {
        setError('Failed to remove restriction');
      }
    }
  };

  const handleTimeSlotToggle = (slotNumber, restrictionType) => {
    if (restrictionType === 'teacher') {
      setNewTeacherRestriction(prev => ({
        ...prev,
        unavailableSlots: prev.unavailableSlots.includes(slotNumber)
          ? prev.unavailableSlots.filter(s => s !== slotNumber)
          : [...prev.unavailableSlots, slotNumber]
      }));
    } else if (restrictionType === 'subject') {
      setNewSubjectRestriction(prev => ({
        ...prev,
        allowedTimeSlots: prev.allowedTimeSlots.includes(slotNumber)
          ? prev.allowedTimeSlots.filter(s => s !== slotNumber)
          : [...prev.allowedTimeSlots, slotNumber]
      }));
    }
  };

  const handleDayToggle = (day, restrictionType) => {
    if (restrictionType === 'teacher') {
      setNewTeacherRestriction(prev => ({
        ...prev,
        days: prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
      }));
    } else if (restrictionType === 'subject') {
      setNewSubjectRestriction(prev => ({
        ...prev,
        restrictedDays: prev.restrictedDays.includes(day)
          ? prev.restrictedDays.filter(d => d !== day)
          : [...prev.restrictedDays, day]
      }));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          🚫 Timetable Restrictions
        </h1>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Configure time-based, teacher-based, and subject-based restrictions for intelligent timetable generation
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          color: '#d32f2f', 
          backgroundColor: '#ffebee', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f44336'
        }}>
          ❌ {error}
        </div>
      )}

      {message && (
        <div style={{ 
          color: '#2e7d32', 
          backgroundColor: '#e8f5e8', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e9ecef', 
        marginBottom: '30px',
        gap: '8px'
      }}>
        {[
          { id: 'time', label: 'Time-based', icon: '⏰' },
          { id: 'teacher', label: 'Teacher-based', icon: '👨‍🏫' },
          { id: 'subject', label: 'Subject-based', icon: '📚' },
          { id: 'view', label: 'View All', icon: '📋' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#dc3545' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6c757d',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Time-based tab content */}
      {activeTab === 'time' && (
        <div>
          <h2 style={{ marginBottom: '24px' }}>⏰ Advanced Time-based Restrictions</h2>
          
          {/* Step 1: College Time Configuration */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '2px solid #e9ecef'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#495057' }}>
              🏫 Step 1: Set College Working Hours
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  College Start Time
                </label>
                <input
                  type="time"
                  value={timeConfig.collegeStartTime}
                  onChange={(e) => setTimeConfig(prev => ({ ...prev, collegeStartTime: e.target.value }))}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  College End Time
                </label>
                <input
                  type="time"
                  value={timeConfig.collegeEndTime}
                  onChange={(e) => setTimeConfig(prev => ({ ...prev, collegeEndTime: e.target.value }))}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Number of Slots
                </label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={timeConfig.numberOfSlots}
                  onChange={(e) => setTimeConfig(prev => ({ ...prev, numberOfSlots: parseInt(e.target.value) }))}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => generateTimeSlots(false)}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                🔄 Auto Generate Slots
              </button>
              
              <button
                onClick={() => generateTimeSlots(true)}
                style={{
                  backgroundColor: '#fd7e14',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✏️ Manual Edit Slots
              </button>
              
              <button
                onClick={saveTimeConfiguration}
                disabled={timeSlots.length === 0}
                style={{
                  backgroundColor: timeSlots.length > 0 ? '#28a745' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: timeSlots.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                💾 Save Configuration
              </button>

              {/* ✅ NEW: Manual Sync Button */}
              <button
                onClick={manualSyncSlots}
                style={{
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                🔄 Sync Slots (Debug)
              </button>
            </div>
          </div>

          {/* Time Slots Table */}
          {timeSlots.length > 0 && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '16px' }}>
                📅 {isManualMode ? 'Manual Time Slots Configuration' : 'Generated Time Slots'}
              </h3>
              
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        color: '#495057'
                      }}>Slot</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        color: '#495057'
                      }}>Start Time</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        color: '#495057'
                      }}>End Time</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        color: '#495057'
                      }}>Duration</th>
                      <th style={{
                        padding: '16px',
                        textAlign: 'center',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        color: '#495057'
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot, index) => {
                      const slotErrors = slotValidationErrors[`slot${index}`] || {};
                      const startTime = slot?.startTime || '00:00';
                      const endTime = slot?.endTime || '00:00';
                      const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
                      const displayInfo = getSlotDisplayInfo(slot);
                      
                      return (
                        <tr key={slot?.slotNumber || index} style={{
                          borderBottom: index < timeSlots.length - 1 ? '1px solid #dee2e6' : 'none',
                          backgroundColor: index % 2 === 0 ? '#fdfdfd' : 'white'
                        }}>
                          <td style={{
                            padding: '16px',
                            textAlign: 'center',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            Slot {slot?.slotNumber || index + 1}
                          </td>
                          
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {isManualMode ? (
                              <div>
                                <input
                                  type="time"
                                  value={startTime}
                                  onChange={(e) => handleSlotTimeChange(index, 'startTime', e.target.value)}
                                  disabled={index === 0}
                                  style={{
                                    padding: '8px',
                                    border: `1px solid ${slotErrors.startTime ? '#f44336' : '#ddd'}`,
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    width: '100px',
                                    backgroundColor: index === 0 ? '#f5f5f5' : 'white'
                                  }}
                                />
                                {slotErrors.startTime && (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#f44336', 
                                    marginTop: '4px',
                                    textAlign: 'left'
                                  }}>
                                    {slotErrors.startTime}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {startTime}
                              </span>
                            )}
                          </td>
                          
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            {isManualMode ? (
                              <div>
                                <input
                                  type="time"
                                  value={endTime}
                                  onChange={(e) => handleSlotTimeChange(index, 'endTime', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    border: `1px solid ${slotErrors.endTime ? '#f44336' : '#ddd'}`,
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    width: '100px'
                                  }}
                                />
                                {slotErrors.endTime && (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#f44336', 
                                    marginTop: '4px',
                                    textAlign: 'left'
                                  }}>
                                    {slotErrors.endTime}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                {endTime}
                              </span>
                            )}
                          </td>
                          
                          <td style={{
                            padding: '16px',
                            textAlign: 'center',
                            fontSize: '14px',
                            color: '#6c757d'
                          }}>
                            {duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '0m'}
                          </td>
                          
                          <td style={{
                            padding: '16px',
                            textAlign: 'center',
                            fontSize: '14px'
                          }}>
                            <div title={displayInfo.title}>
                              <span style={{ 
                                color: displayInfo.statusColor,
                                backgroundColor: displayInfo.backgroundColor,
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                display: 'block'
                              }}>
                                {displayInfo.status}
                              </span>
                              {displayInfo.description && (
                                <div style={{ 
                                  fontSize: '10px', 
                                  color: '#6c757d', 
                                  marginTop: '4px',
                                  fontStyle: 'italic'
                                }}>
                                  {displayInfo.description}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Booking Options */}
          {timeConfig.isConfigured && (
            <div style={{
              backgroundColor: '#f1f8ff',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px' }}>🎯 Step 2: Choose Booking Type</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #007bff',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setShowGlobalModal(true)}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌐</div>
                  <h4 style={{ marginBottom: '8px', color: '#007bff' }}>Global Based Booking</h4>
                  <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
                    Block time slots for all departments and years (e.g., Assembly, Lunch Break)
                  </p>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #28a745',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setShowYearModal(true)}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
                  <h4 style={{ marginBottom: '8px', color: '#28a745' }}>Year-wise Booking</h4>
                  <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
                    Block time slots for specific academic years (e.g., 2nd Year Seminar)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teacher-based Tab */}
      {activeTab === 'teacher' && (
        <div>
          <h2 style={{ marginBottom: '24px' }}>👨‍🏫 Teacher-based Restrictions</h2>
          <p style={{ color: '#6c757d', marginBottom: '24px' }}>
            Define teacher unavailability periods for meetings, other commitments, or personal schedules.
          </p>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Add Teacher-based Restriction</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Teacher Name</label>
                <input
                  type="text"
                  value={newTeacherRestriction.teacherName}
                  onChange={(e) => setNewTeacherRestriction(prev => ({ ...prev, teacherName: e.target.value }))}
                  placeholder="Enter teacher name"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Reason</label>
                <input
                  type="text"
                  value={newTeacherRestriction.reason}
                  onChange={(e) => setNewTeacherRestriction(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g., Meeting, Personal work"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Unavailable Time Slots</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(slot => (
                  <label key={slot} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: newTeacherRestriction.unavailableSlots.includes(slot) ? '#ffe3e3' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={newTeacherRestriction.unavailableSlots.includes(slot)}
                      onChange={() => handleTimeSlotToggle(slot, 'teacher')}
                      style={{ marginRight: '6px' }}
                    />
                    Slot {slot}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Days</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <label key={day} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: newTeacherRestriction.days.includes(day) ? '#ffe3e3' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={newTeacherRestriction.days.includes(day)}
                      onChange={() => handleDayToggle(day, 'teacher')}
                      style={{ marginRight: '5px' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={addTeacherRestriction}
              style={{
                backgroundColor: '#fd7e14',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              👨‍🏫 Add Teacher Restriction
            </button>
          </div>
        </div>
      )}

      {/* Subject-based Tab */}
      {activeTab === 'subject' && (
        <div>
          <h2 style={{ marginBottom: '24px' }}>📚 Subject-based Restrictions</h2>
          <p style={{ color: '#6c757d', marginBottom: '24px' }}>
            Configure subject-specific constraints like lab requirements, preferred time slots, or day restrictions.
          </p>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Add Subject-based Restriction</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Subject Name</label>
                <input
                  type="text"
                  value={newSubjectRestriction.subjectName}
                  onChange={(e) => setNewSubjectRestriction(prev => ({ ...prev, subjectName: e.target.value }))}
                  placeholder="e.g., Physics Lab, Mathematics"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Room Type Requirement</label>
                <select
                  value={newSubjectRestriction.roomType}
                  onChange={(e) => setNewSubjectRestriction(prev => ({ ...prev, roomType: e.target.value }))}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="any">Any Room</option>
                  <option value="CR">Classroom Only</option>
                  <option value="LAB">Laboratory Only</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Preferred Time Slots</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(slot => (
                  <label key={slot} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: newSubjectRestriction.allowedTimeSlots.includes(slot) ? '#e8f5e8' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={newSubjectRestriction.allowedTimeSlots.includes(slot)}
                      onChange={() => handleTimeSlotToggle(slot, 'subject')}
                      style={{ marginRight: '6px' }}
                    />
                    Slot {slot}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Restricted Days</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <label key={day} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: newSubjectRestriction.restrictedDays.includes(day) ? '#ffe8e8' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={newSubjectRestriction.restrictedDays.includes(day)}
                      onChange={() => handleDayToggle(day, 'subject')}
                      style={{ marginRight: '5px' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={addSubjectRestriction}
              style={{
                backgroundColor: '#20c997',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              📚 Add Subject Restriction
            </button>
          </div>
        </div>
      )}

      {/* View All Tab */}
      {activeTab === 'view' && (
        <div>
          <h2 style={{ marginBottom: '24px' }}>📋 All Restrictions</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              Loading restrictions...
            </div>
          ) : restrictions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              color: '#6c757d'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
              <p>No restrictions configured yet. Add some restrictions using the tabs above!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {restrictions.map((restriction, index) => (
                <div key={restriction._id || index} style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {restriction.type === 'time' ? '⏰' : 
                         restriction.type === 'teacher' ? '👨‍🏫' : '📚'} 
                        {restriction.restrictionName || restriction.teacherName || restriction.subjectName}
                      </h4>
                      <div style={{ color: '#6c757d', fontSize: '14px' }}>
                        <div><strong>Type:</strong> {restriction.type?.toUpperCase()}</div>
                        <div><strong>Scope:</strong> {restriction.scope || 'N/A'}</div>
                        <div><strong>Priority:</strong> {restriction.priority}/5</div>
                        {restriction.affectedYears && (
                          <div><strong>Years:</strong> {restriction.affectedYears.join(', ')}</div>
                        )}
                        {restriction.days && (
                          <div><strong>Days:</strong> {restriction.days.join(', ')}</div>
                        )}
                        {restriction.timeSlots && (
                          <div><strong>Time Slots:</strong> {restriction.timeSlots.join(', ')}</div>
                        )}
                        {restriction.reason && (
                          <div><strong>Reason:</strong> {restriction.reason}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRestriction(
                        restriction._id, 
                        restriction.restrictionName || restriction.teacherName || restriction.subjectName
                      )}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Remove restriction"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: '#f57c00',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              ⚠️ Booking Conflict Detected
            </h3>

            <div style={{ 
              backgroundColor: '#fff3e0', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #ffb74d'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e65100' }}>
                <strong>Conflict Details:</strong>
              </p>
              <p style={{ margin: '0', fontSize: '14px', color: '#e65100' }}>
                {conflictData.conflictMessage}
              </p>
            </div>

            <p style={{ marginBottom: '24px', color: '#666', fontSize: '14px' }}>
              Do you want to override the existing bookings and proceed with your new booking?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleConflictResolution(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ❌ Cancel
              </button>
              <button
                onClick={() => handleConflictResolution(true)}
                style={{
                  backgroundColor: '#f57c00',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✅ Override & Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Booking Modal */}
      {showGlobalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌐 Global Time Booking
            </h3>

            {/* Existing Global Bookings Display */}
            {existingGlobalBookings.length > 0 && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ 
                  marginBottom: '12px', 
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📅 Existing Global Bookings:
                </h4>
                
                {globalBookingsLoading ? (
                  <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading bookings...</div>
                ) : (
                  <div style={{ fontSize: '14px' }}>
                    {existingGlobalBookings.map((booking, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: index < existingGlobalBookings.length - 1 ? '1px solid #dee2e6' : 'none'
                      }}>
                        <span style={{ color: '#495057' }}>
                          • {booking.day}, Slot {booking.slot}: {booking.activityName} ({getSlotTimeRange(booking.slot)})
                        </span>
                        <button
                          onClick={() => deleteSpecificBooking({
                            id: booking.id,
                            activityName: booking.activityName,
                            day: booking.day,
                            slot: booking.slot,
                            scope: 'global'
                          })}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginLeft: '8px'
                          }}
                          title={`Delete ${booking.activityName} booking for ${booking.day}, Slot ${booking.slot}`}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                Activity Name
              </label>
              <input
                type="text"
                value={globalBooking.activityName}
                onChange={(e) => setGlobalBooking(prev => ({ ...prev, activityName: e.target.value }))}
                placeholder="e.g., Morning Assembly, Lunch Break, Short Recess"
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Select Time Slots
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {timeSlots.map(slot => {
                  const startTime = slot?.startTime || '00:00';
                  const endTime = slot?.endTime || '00:00';
                  
                  return (
                    <label key={slot?.slotNumber || 0} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px',
                      border: `2px solid ${globalBooking.slotNumbers.includes(slot?.slotNumber) ? '#007bff' : '#ddd'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: globalBooking.slotNumbers.includes(slot?.slotNumber) ? '#e3f2fd' : 'white'
                    }}>
                      <input
                        type="checkbox"
                        checked={globalBooking.slotNumbers.includes(slot?.slotNumber)}
                        onChange={() => toggleSlotSelection(slot?.slotNumber, 'global')}
                        style={{ marginBottom: '4px' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Slot {slot?.slotNumber}</span>
                      <span style={{ fontSize: '10px', color: '#6c757d' }}>
                        {startTime}-{endTime}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Days</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <label key={day} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    border: `1px solid ${globalBooking.days.includes(day) ? '#007bff' : '#ddd'}`,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    backgroundColor: globalBooking.days.includes(day) ? '#e3f2fd' : 'white',
                    fontSize: '14px'
                  }}>
                    <input
                      type="checkbox"
                      checked={globalBooking.days.includes(day)}
                      onChange={() => toggleDaySelection(day, 'global')}
                      style={{ marginRight: '6px' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGlobalModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGlobalBooking}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🌐 Book Globally
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year-wise Booking Modal */}
      {showYearModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎓 Year-wise Time Booking
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Academic Year
                </label>
                <select
                  value={yearBooking.year}
                  onChange={(e) => setYearBooking(prev => ({ ...prev, year: e.target.value }))}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Activity Name
                </label>
                <input
                  type="text"
                  value={yearBooking.activityName}
                  onChange={(e) => setYearBooking(prev => ({ ...prev, activityName: e.target.value }))}
                  placeholder="e.g., Open Elective, Guest Lecture, Lab Session"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Existing Year Bookings Display with Delete Buttons */}
            {Object.keys(existingYearBookings).length > 0 && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ 
                  marginBottom: '12px', 
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📅 Existing {yearBooking.year} Bookings:
                </h4>
                
                {yearBookingsLoading ? (
                  <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Loading bookings...</div>
                ) : (
                  <div style={{ fontSize: '14px' }}>
                    {Object.entries(existingYearBookings).map(([activityName, bookings]) => (
                      <div key={activityName} style={{ marginBottom: '12px' }}>
                        <strong style={{ color: '#495057' }}>• {activityName}:</strong>
                        <div style={{ marginLeft: '16px', color: '#6c757d' }}>
                          {bookings.map((booking, index) => (
                            <div key={index} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              padding: '4px 0'
                            }}>
                              <span>
                                - {booking.day} (Slot {booking.slot}: {getSlotTimeRange(booking.slot)})
                              </span>
                              <button
                                onClick={() => deleteSpecificBooking({
                                  id: booking.bookingId,
                                  activityName: activityName,
                                  day: booking.day,
                                  slot: booking.slot,
                                  scope: 'year-specific',
                                  year: yearBooking.year
                                })}
                                style={{
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  marginLeft: '8px'
                                }}
                                title={`Delete ${activityName} booking for ${booking.day}, Slot ${booking.slot}`}
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Select Time Slots
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                {timeSlots.map(slot => {
                  const startTime = slot?.startTime || '00:00';
                  const endTime = slot?.endTime || '00:00';
                  
                  return (
                    <label key={slot?.slotNumber || 0} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px',
                      border: `2px solid ${yearBooking.slotNumbers.includes(slot?.slotNumber) ? '#28a745' : '#ddd'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: yearBooking.slotNumbers.includes(slot?.slotNumber) ? '#e8f5e8' : 'white'
                    }}>
                      <input
                        type="checkbox"
                        checked={yearBooking.slotNumbers.includes(slot?.slotNumber)}
                        onChange={() => toggleSlotSelection(slot?.slotNumber, 'year')}
                        style={{ marginBottom: '4px' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Slot {slot?.slotNumber}</span>
                      <span style={{ fontSize: '10px', color: '#6c757d' }}>
                        {startTime}-{endTime}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Days</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <label key={day} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    border: `1px solid ${yearBooking.days.includes(day) ? '#28a745' : '#ddd'}`,
                    borderRadius: '20px',
                    cursor: 'pointer',
                    backgroundColor: yearBooking.days.includes(day) ? '#e8f5e8' : 'white',
                    fontSize: '14px'
                  }}>
                    <input
                      type="checkbox"
                      checked={yearBooking.days.includes(day)}
                      onChange={() => toggleDaySelection(day, 'year')}
                      style={{ marginRight: '6px' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowYearModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleYearBooking}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🎓 Book for {yearBooking.year}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableRestrictions;
