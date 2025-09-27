import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimetableRestrictions = () => {
  // Tab and data states
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

  // NEW: Booking display states
  const [existingYearBookings, setExistingYearBookings] = useState([]);
  const [existingGlobalBookings, setExistingGlobalBookings] = useState([]);
  const [yearBookingsLoading, setYearBookingsLoading] = useState(false);
  const [globalBookingsLoading, setGlobalBookingsLoading] = useState(false);

  // ✅ COMPLETELY FIXED: Year-wise booking modal state with global slot blocking
  const [yearWiseModal, setYearWiseModal] = useState({
    isOpen: false,
    academicYear: '2nd Year',
    formData: {
      activityName: '',
      selectedSlots: [],
      selectedDays: [] // ✅ FIXED: Start with empty array, not ['All days']
    },
    timeSlots: [],
    globallyBookedSlots: new Set(),
    loading: false,
    error: ''
  });

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

  // Effects
  useEffect(() => {
    fetchRestrictions();
    fetchTimeConfiguration();
  }, []);

  // NEW: Fetch global bookings when global modal opens
  useEffect(() => {
    if (showGlobalModal) {
      fetchGlobalBookings();
    }
  }, [showGlobalModal]);

  // ✅ FIXED: Fetch year bookings when year-wise modal opens
  useEffect(() => {
    if (yearWiseModal.isOpen && yearWiseModal.academicYear) {
      fetchYearWiseBookings(yearWiseModal.academicYear);
    }
  }, [yearWiseModal.isOpen, yearWiseModal.academicYear]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // NEW: Manual sync function for debugging
  const manualSyncSlots = async () => {
    try {
      console.log('Triggering manual sync...');
      await axios.post('http://localhost:5000/api/restrictions/sync-slots');
      setMessage('Slot table synced successfully!');
      // Refresh time configuration after sync
      setTimeout(async () => {
        await fetchTimeConfiguration();
      }, 1000);
    } catch (err) {
      console.error('Sync error:', err);
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

  // NEW: Fetch global bookings in list format
  const fetchGlobalBookings = async () => {
    try {
      setGlobalBookingsLoading(true);
      console.log('Fetching global bookings...');
      const response = await axios.get('http://localhost:5000/api/restrictions/global-bookings');
      console.log('Global bookings:', response.data);
      setExistingGlobalBookings(response.data.bookings || []);
    } catch (err) {
      console.error('Error fetching global bookings:', err);
      setExistingGlobalBookings([]);
    } finally {
      setGlobalBookingsLoading(false);
    }
  };

  // ✅ COMPLETELY FIXED: Fetch year-wise bookings for specific year
  const fetchYearWiseBookings = async (year) => {
    try {
      setYearBookingsLoading(true);
      console.log('🔍 Fetching year-wise bookings for', year);
      
      const response = await axios.get(`http://localhost:5000/api/restrictions/year-wise/${encodeURIComponent(year)}`);
      console.log('✅ Year-wise bookings response for', year, ':', response.data);
      
      // ✅ FIXED: Set as array of individual bookings (like global bookings)
      setExistingYearBookings(response.data.bookings || []);
      
    } catch (err) {
      console.error('❌ Error fetching year-wise bookings:', err);
      setExistingYearBookings([]);
    } finally {
      setYearBookingsLoading(false);
    }
  };

  // ✅ FIXED: Fetch globally booked slots for year-wise modal
  const fetchGloballyBookedSlots = async () => {
    try {
      console.log('🔍 Fetching globally booked slots...');
      
      // Get from TimeSlotConfiguration (synced with global restrictions)
      const timeSlotsResponse = await axios.get('http://localhost:5000/api/resources/timeslots');
      const bookedSlots = new Set();
      
      if (timeSlotsResponse.data?.timeSlots) {
        timeSlotsResponse.data.timeSlots.forEach(slot => {
          if (slot.isBooked && slot.bookingScope === 'global') {
            bookedSlots.add(slot.slotNumber);
            console.log(`🔒 Slot ${slot.slotNumber} is globally booked for: ${slot.bookedBy}`);
          }
        });
      }
      
      setYearWiseModal(prev => ({
        ...prev,
        globallyBookedSlots: bookedSlots,
        timeSlots: timeSlotsResponse.data?.timeSlots || []
      }));
      
      console.log('✅ Globally booked slots detected:', Array.from(bookedSlots));
      
    } catch (err) {
      console.error('❌ Error fetching globally booked slots:', err);
      setYearWiseModal(prev => ({
        ...prev,
        error: 'Failed to fetch time slot information'
      }));
    }
  };

  // ✅ FIXED: Open year-wise modal with global blocking
  const openYearWiseModal = async (academicYear) => {
    setYearWiseModal(prev => ({
      ...prev,
      isOpen: true,
      academicYear: academicYear,
      loading: true,
      error: '',
      formData: {
        activityName: '',
        selectedSlots: [],
        selectedDays: [] // ✅ FIXED: Reset to empty array
      }
    }));
    
    // Fetch required data
    await Promise.all([
      fetchGloballyBookedSlots(),
      fetchYearWiseBookings(academicYear)
    ]);
    
    setYearWiseModal(prev => ({
      ...prev,
      loading: false
    }));
  };

  // NEW: Delete specific booking function
  const deleteSpecificBooking = async (bookingData) => {
    const { id, activityName, day, slot, scope, year } = bookingData;
    
    const confirmMessage = `Delete "${activityName}" booking for ${day}, Slot ${slot}${year ? ` (${year})` : ''}? This cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
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

      setMessage(`Booking "${activityName}" for ${day}, Slot ${slot} deleted successfully`);

      // Close modal and refresh main page
      if (scope === 'global') {
        setShowGlobalModal(false);
        await fetchGlobalBookings();
      } else {
        setYearWiseModal(prev => ({ ...prev, isOpen: false }));
        await fetchYearWiseBookings(year || yearWiseModal.academicYear);
      }

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
      console.log('Fetching time configuration...');
      const response = await axios.get('http://localhost:5000/api/config/time-configuration');
      
      if (response.data) {
        console.log('Raw response from backend:', response.data);
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
      console.error('Error fetching time configuration:', err);
      setError('Failed to fetch time configuration');
    }
  };

  // Time conversion utilities
  const timeToMinutes = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return 0;
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
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) return '00:00';
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
  // Auto-generate slots
  const autoGenerateSlots = () => {
    if (!timeConfig.collegeStartTime || !timeConfig.collegeEndTime || !timeConfig.numberOfSlots) {
      setError('Please fill in college start time, end time, and number of slots');
      return;
    }

    const startMinutes = timeToMinutes(timeConfig.collegeStartTime);
    const endMinutes = timeToMinutes(timeConfig.collegeEndTime);
    const totalMinutes = endMinutes - startMinutes;
    const slotDuration = Math.floor(totalMinutes / timeConfig.numberOfSlots);

    if (slotDuration <= 0) {
      setError('Invalid time configuration. End time must be after start time.');
      return;
    }

    const generatedSlots = [];
    for (let i = 0; i < timeConfig.numberOfSlots; i++) {
      const slotStart = startMinutes + (i * slotDuration);
      const slotEnd = slotStart + slotDuration;
      generatedSlots.push({
        slotNumber: i + 1,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        originalStartTime: minutesToTime(slotStart),
        originalEndTime: minutesToTime(slotEnd),
        isBooked: false,
        bookedBy: null,
        bookingScope: null,
        bookingAffectedYears: []
      });
    }

    setTimeSlots(generatedSlots);
    setIsManualMode(false);
    setMessage('Time slots generated automatically!');
  };

  // Save time configuration
  const saveTimeConfiguration = async () => {
    if (timeSlots.length === 0) {
      setError('Please generate or configure time slots first');
      return;
    }

    // Validate slots
    for (let slot of timeSlots) {
      if (!slot.startTime || !slot.endTime) {
        setError(`Slot ${slot.slotNumber} has missing time information`);
        return;
      }
      if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime)) {
        setError(`Slot ${slot.slotNumber} has invalid time range`);
        return;
      }
    }

    try {
      setLoading(true);
      const configData = {
        collegeStartTime: timeConfig.collegeStartTime,
        collegeEndTime: timeConfig.collegeEndTime,
        numberOfSlots: timeSlots.length,
        timeSlots: timeSlots,
        isManualMode: isManualMode
      };

      console.log('Saving configuration:', configData);
      const response = await axios.post('http://localhost:5000/api/config/time-configuration', configData);
      
      setMessage('Time configuration saved successfully!');
      setTimeConfig(prev => ({ ...prev, isConfigured: true }));
      
      setTimeout(() => {
        fetchTimeConfiguration();
      }, 1000);
      
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save time configuration');
    } finally {
      setLoading(false);
    }
  };

  // ✅ COMPLETELY FIXED: Year-wise slot toggle with global blocking
  const handleYearWiseSlotToggle = (slotNumber) => {
    // Check if slot is globally booked
    if (yearWiseModal.globallyBookedSlots.has(slotNumber)) {
      const bookedSlot = yearWiseModal.timeSlots.find(s => s.slotNumber === slotNumber);
      const activityName = bookedSlot?.bookedBy || 'unknown activity';
      
      setYearWiseModal(prev => ({
        ...prev,
        error: `❌ Slot ${slotNumber} is globally booked for "${activityName}" and cannot be used for year-specific bookings.`
      }));
      return;
    }

    // Clear error and toggle slot
    setYearWiseModal(prev => ({
      ...prev,
      error: '',
      formData: {
        ...prev.formData,
        selectedSlots: prev.formData.selectedSlots.includes(slotNumber)
          ? prev.formData.selectedSlots.filter(s => s !== slotNumber)
          : [...prev.formData.selectedSlots, slotNumber]
      }
    }));
  };

  // ✅ COMPLETELY FIXED: Year-wise day toggle (no "All days" restriction)
  const handleYearWiseDayToggle = (day) => {
    setYearWiseModal(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        selectedDays: prev.formData.selectedDays.includes(day)
          ? prev.formData.selectedDays.filter(d => d !== day)
          : [...prev.formData.selectedDays, day]
      }
    }));
  };

  // ✅ COMPLETELY FIXED: Year-wise booking submission with proper day handling
  const handleYearWiseSubmit = async (e) => {
    e.preventDefault();
    
    const { activityName, selectedSlots, selectedDays } = yearWiseModal.formData;
    
    if (!activityName.trim()) {
      setYearWiseModal(prev => ({ ...prev, error: 'Activity name is required' }));
      return;
    }

    if (selectedSlots.length === 0) {
      setYearWiseModal(prev => ({ ...prev, error: 'Please select at least one time slot' }));
      return;
    }

    if (selectedDays.length === 0) {
      setYearWiseModal(prev => ({ ...prev, error: 'Please select at least one day' }));
      return;
    }

    // Final check for globally booked slots
    const conflictingSlots = selectedSlots.filter(slot => 
      yearWiseModal.globallyBookedSlots.has(slot)
    );
    
    if (conflictingSlots.length > 0) {
      setYearWiseModal(prev => ({
        ...prev,
        error: `❌ Cannot book slots ${conflictingSlots.join(', ')} - they are globally booked.`
      }));
      return;
    }

    try {
      setYearWiseModal(prev => ({ ...prev, loading: true, error: '' }));

      const bookingData = {
        type: 'time',
        restrictionName: activityName,
        scope: 'year-specific',
        affectedYears: [yearWiseModal.academicYear],
        timeSlots: selectedSlots,
        days: selectedDays, // ✅ FIXED: Use actual selected days
        priority: 2
      };

      console.log('📝 Creating year-specific booking:', bookingData);

      await axios.post('http://localhost:5000/api/restrictions', bookingData);
      
      setMessage(`Year-specific booking "${activityName}" created successfully for ${yearWiseModal.academicYear}!`);
      
      // Success - close modal and refresh
      setYearWiseModal({
        isOpen: false,
        academicYear: '2nd Year',
        formData: {
          activityName: '',
          selectedSlots: [],
          selectedDays: []
        },
        timeSlots: [],
        globallyBookedSlots: new Set(),
        loading: false,
        error: ''
      });
      
      // Refresh the restrictions list
      setTimeout(async () => {
        await Promise.all([
          fetchRestrictions(),
          fetchTimeConfiguration()
        ]);
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error creating year-specific booking:', err);
      setYearWiseModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.conflictMessage || err.response?.data?.error || 'Failed to create booking'
      }));
    }
  };

  // Booking form handlers
  const handleSlotToggle = (slotNumber, bookingType) => {
    if (bookingType === 'global') {
      setGlobalBooking(prev => ({
        ...prev,
        slotNumbers: prev.slotNumbers.includes(slotNumber)
          ? prev.slotNumbers.filter(s => s !== slotNumber)
          : [...prev.slotNumbers, slotNumber]
      }));
    } else if (bookingType === 'year') {
      setYearBooking(prev => ({
        ...prev,
        slotNumbers: prev.slotNumbers.includes(slotNumber)
          ? prev.slotNumbers.filter(s => s !== slotNumber)
          : [...prev.slotNumbers, slotNumber]
      }));
    }
  };

  const handleDayToggle = (day, bookingType) => {
    const setBooking = bookingType === 'global' ? setGlobalBooking : setYearBooking;
    
    setBooking(prev => {
      if (day === 'All days') {
        return {
          ...prev,
          days: prev.days.includes('All days') ? [] : ['All days']
        };
      } else {
        let newDays = prev.days.filter(d => d !== 'All days');
        if (newDays.includes(day)) {
          newDays = newDays.filter(d => d !== day);
        } else {
          newDays = [...newDays, day];
        }
        return { ...prev, days: newDays };
      }
    });
  };

  // Check for conflicts before submission
  const checkConflicts = async (bookingData) => {
    try {
      const { timeSlots: slots, days, scope, affectedYears } = bookingData;
      const params = new URLSearchParams({
        timeSlots: JSON.stringify(slots),
        days: JSON.stringify(days),
        scope: scope,
        affectedYears: JSON.stringify(affectedYears || [])
      });

      const response = await axios.get(`http://localhost:5000/api/restrictions/conflicts?${params}`);
      return response.data;
    } catch (err) {
      console.error('Error checking conflicts:', err);
      return { hasConflicts: false, conflicts: [] };
    }
  };

  // Submit booking
  const submitBooking = async (bookingData, isOverride = false) => {
    try {
      setLoading(true);
      setError('');

      const submissionData = {
        ...bookingData,
        overrideConflicts: isOverride
      };

      const endpoint = isOverride 
        ? 'http://localhost:5000/api/restrictions/override'
        : 'http://localhost:5000/api/restrictions';

      const response = await axios.post(endpoint, submissionData);
      
      setMessage(`${bookingData.scope === 'global' ? 'Global' : 'Year-specific'} booking created successfully!`);
      
      // Close modals and reset forms
      setShowGlobalModal(false);
      setShowYearModal(false);
      setYearWiseModal(prev => ({ ...prev, isOpen: false }));
      setShowConflictModal(false);
      
      setGlobalBooking(prev => ({
        ...prev,
        slotNumbers: [],
        days: ['All days'],
        activityName: ''
      }));
      setYearBooking(prev => ({
        ...prev,
        slotNumbers: [],
        days: ['All days'],
        activityName: ''
      }));

      // Refresh data
      setTimeout(async () => {
        await Promise.all([
          fetchRestrictions(),
          fetchTimeConfiguration()
        ]);
      }, 1000);

    } catch (err) {
      console.error('Submission error:', err);
      if (err.response?.status === 409) {
        // Conflict detected
        setConflictData({
          message: err.response.data.conflictMessage,
          conflicts: err.response.data.conflicts
        });
        setPendingBooking(bookingData);
        setShowConflictModal(true);
      } else {
        setError(err.response?.data?.error || 'Failed to create booking');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle global booking submission
  const handleGlobalSubmit = async (e) => {
    e.preventDefault();
    
    if (!globalBooking.activityName.trim()) {
      setError('Activity name is required');
      return;
    }
    if (globalBooking.slotNumbers.length === 0) {
      setError('Please select at least one time slot');
      return;
    }
    if (globalBooking.days.length === 0) {
      setError('Please select at least one day');
      return;
    }

    const bookingData = {
      type: 'time',
      restrictionName: globalBooking.activityName,
      scope: 'global',
      affectedYears: [],
      timeSlots: globalBooking.slotNumbers,
      days: globalBooking.days,
      duration: globalBooking.duration,
      priority: globalBooking.priority
    };

    console.log('Global booking data:', bookingData);
    await submitBooking(bookingData);
  };

  // Handle year-wise booking submission (old method)
  const handleYearSubmit = async (e) => {
    e.preventDefault();
    
    if (!yearBooking.activityName.trim()) {
      setError('Activity name is required');
      return;
    }
    if (yearBooking.slotNumbers.length === 0) {
      setError('Please select at least one time slot');
      return;
    }
    if (yearBooking.days.length === 0) {
      setError('Please select at least one day');
      return;
    }

    const bookingData = {
      type: 'time',
      restrictionName: yearBooking.activityName,
      scope: 'year-specific',
      affectedYears: [yearBooking.year],
      timeSlots: yearBooking.slotNumbers,
      days: yearBooking.days,
      duration: yearBooking.duration,
      priority: yearBooking.priority
    };

    console.log('Year-wise booking data:', bookingData);
    await submitBooking(bookingData);
  };

  // Other restriction handlers
  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    
    if (!newTeacherRestriction.teacherName.trim()) {
      setError('Teacher name is required');
      return;
    }
    if (newTeacherRestriction.unavailableSlots.length === 0) {
      setError('Please select at least one unavailable slot');
      return;
    }

    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/restrictions', {
        type: 'teacher',
        ...newTeacherRestriction
      });

      setMessage('Teacher restriction added successfully!');
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
      setError(err.response?.data?.error || 'Failed to add teacher restriction');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    
    if (!newSubjectRestriction.subjectName.trim()) {
      setError('Subject name is required');
      return;
    }

    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/restrictions', {
        type: 'subject',
        ...newSubjectRestriction
      });

      setMessage('Subject restriction added successfully!');
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
      setError(err.response?.data?.error || 'Failed to add subject restriction');
    } finally {
      setLoading(false);
    }
  };

  // Delete restriction
  const handleDelete = async (restrictionId) => {
    if (!window.confirm('Are you sure you want to delete this restriction?')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/restrictions/${restrictionId}`);
      setMessage('Restriction deleted successfully!');
      
      // Refresh data
      setTimeout(async () => {
        await Promise.all([
          fetchRestrictions(),
          fetchTimeConfiguration()
        ]);
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete restriction');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ color: '#333', fontSize: '28px', marginBottom: '8px' }}>
          🚫 Timetable Restrictions
        </h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Configure time-based, teacher-based, and subject-based restrictions for intelligent timetable generation
        </p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div style={{
          color: 'green',
          backgroundColor: '#e8f5e8',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          ✅ {message}
        </div>
      )}

      {error && (
        <div style={{
          color: 'red',
          backgroundColor: '#ffe6e6',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f44336'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {[
            { key: 'time', label: '🚫 Time-based', color: '#dc3545' },
            { key: 'teacher', label: '👨‍🏫 Teacher-based', color: '#fd7e14' },
            { key: 'subject', label: '📚 Subject-based', color: '#6f42c1' },
            { key: 'view', label: '👁️ View All', color: '#17a2b8' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === tab.key ? tab.color : 'white',
                color: activeTab === tab.key ? 'white' : tab.color,
                border: `2px solid ${tab.color}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time-based Restrictions Tab */}
      {activeTab === 'time' && (
        <div>
          {/* Step 1: College Working Hours */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
            <h3 style={{ color: '#d63031', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏫 Step 1: Set College Working Hours
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  College Start Time
                </label>
                <input
                  type="time"
                  value={timeConfig.collegeStartTime}
                  onChange={(e) => setTimeConfig(prev => ({ ...prev, collegeStartTime: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '2px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  College End Time
                </label>
                <input
                  type="time"
                  value={timeConfig.collegeEndTime}
                  onChange={(e) => setTimeConfig(prev => ({ ...prev, collegeEndTime: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '2px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Number of Slots
                </label>
                <input
                  type="number"
                  min="4"
                  max="12"
                  value={timeConfig.numberOfSlots}
                  onChange={(e) => setTimeConfig(prev => ({ ...prev, numberOfSlots: parseInt(e.target.value) || 6 }))}
                  style={{ width: '100%', padding: '8px 12px', border: '2px solid #ddd', borderRadius: '6px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={autoGenerateSlots}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                📅 Auto Generate Slots
              </button>
              
              <button
                onClick={() => setIsManualMode(!isManualMode)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#fd7e14',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✏️ Manual Edit Slots
              </button>
              
              <button
                onClick={saveTimeConfiguration}
                disabled={loading || timeSlots.length === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: timeSlots.length > 0 ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: timeSlots.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                💾 Save Configuration
              </button>
              
              <button
                onClick={manualSyncSlots}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔄 Sync Slots (Debug)
              </button>
            </div>
          </div>

          {/* Manual Time Slots Configuration */}
          {timeSlots.length > 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <h3 style={{ color: '#333', marginBottom: '16px' }}>
                📋 Manual Time Slots Configuration
              </h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'center' }}>Slot</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'center' }}>Start Time</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'center' }}>End Time</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'center' }}>Duration</th>
                      <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot, index) => (
                      <tr key={slot.slotNumber}>
                        <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center', fontWeight: '600' }}>
                          Slot {slot.slotNumber}
                        </td>
                        <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                          {isManualMode ? (
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => {
                                const newSlots = [...timeSlots];
                                newSlots[index] = { ...newSlots[index], startTime: e.target.value };
                                setTimeSlots(newSlots);
                              }}
                              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          ) : (
                            slot.startTime
                          )}
                        </td>
                        <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                          {isManualMode ? (
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => {
                                const newSlots = [...timeSlots];
                                newSlots[index] = { ...newSlots[index], endTime: e.target.value };
                                setTimeSlots(newSlots);
                              }}
                              style={{ width: '100%', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          ) : (
                            slot.endTime
                          )}
                        </td>
                        <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                          {(() => {
                            const start = timeToMinutes(slot.startTime);
                            const end = timeToMinutes(slot.endTime);
                            const duration = end - start;
                            return duration > 0 ? `${duration}m` : '0h 15m';
                          })()}
                        </td>
                        <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>
                          {slot.isBooked ? (
                            <span style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              ❌ Booked<br/>
                              <span style={{ fontSize: '10px' }}>{slot.bookedBy}</span>
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              ✅ Available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Choose Booking Type */}
          {timeConfig.isConfigured && timeSlots.length > 0 && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#d63031', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚙️ Step 2: Choose Booking Type
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Global Based Booking */}
                <div
                  onClick={() => setShowGlobalModal(true)}
                  style={{
                    padding: '24px',
                    border: '2px solid #ffc107',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#fff9c4',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌐</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>Global Based Booking</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6c5014' }}>
                    Block time slots for all departments and years (e.g., Assembly, Lunch Break)
                  </p>
                </div>

                {/* Year-wise Booking */}
                <div
                  onClick={() => openYearWiseModal('2nd Year')}
                  style={{
                    padding: '24px',
                    border: '2px solid #17a2b8',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#d1ecf1',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>Year-wise Booking</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#0c5460' }}>
                    Block time slots for specific academic years (e.g., 2nd Year Seminar)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other tabs remain the same as your original code */}
      {activeTab === 'teacher' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#fd7e14', marginBottom: '20px' }}>👨‍🏫 Teacher-based Restrictions</h3>
          <form onSubmit={handleTeacherSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Teacher Name</label>
              <input
                type="text"
                value={newTeacherRestriction.teacherName}
                onChange={(e) => setNewTeacherRestriction(prev => ({ ...prev, teacherName: e.target.value }))}
                placeholder="Enter teacher name"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Unavailable Slots</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {timeSlots.map(slot => (
                  <label key={slot.slotNumber} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={newTeacherRestriction.unavailableSlots.includes(slot.slotNumber)}
                      onChange={(e) => {
                        const slotNumber = slot.slotNumber;
                        setNewTeacherRestriction(prev => ({
                          ...prev,
                          unavailableSlots: e.target.checked
                            ? [...prev.unavailableSlots, slotNumber]
                            : prev.unavailableSlots.filter(s => s !== slotNumber)
                        }));
                      }}
                      style={{ marginRight: '6px' }}
                    />
                    Slot {slot.slotNumber}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Reason</label>
              <textarea
                value={newTeacherRestriction.reason}
                onChange={(e) => setNewTeacherRestriction(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Optional reason for unavailability"
                rows="3"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#fd7e14',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {loading ? 'Adding...' : 'Add Teacher Restriction'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'subject' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#6f42c1', marginBottom: '20px' }}>📚 Subject-based Restrictions</h3>
          <form onSubmit={handleSubjectSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Subject Name</label>
              <input
                type="text"
                value={newSubjectRestriction.subjectName}
                onChange={(e) => setNewSubjectRestriction(prev => ({ ...prev, subjectName: e.target.value }))}
                placeholder="Enter subject name"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Allowed Time Slots</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {timeSlots.map(slot => (
                  <label key={slot.slotNumber} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={newSubjectRestriction.allowedTimeSlots.includes(slot.slotNumber)}
                      onChange={(e) => {
                        const slotNumber = slot.slotNumber;
                        setNewSubjectRestriction(prev => ({
                          ...prev,
                          allowedTimeSlots: e.target.checked
                            ? [...prev.allowedTimeSlots, slotNumber]
                            : prev.allowedTimeSlots.filter(s => s !== slotNumber)
                        }));
                      }}
                      style={{ marginRight: '6px' }}
                    />
                    Slot {slot.slotNumber}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {loading ? 'Adding...' : 'Add Subject Restriction'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'view' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#17a2b8', marginBottom: '20px' }}>👁️ All Restrictions</h3>
          {loading ? (
            <p>Loading restrictions...</p>
          ) : restrictions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
              No restrictions configured yet. Add some restrictions using the tabs above.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Type</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Name</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'left' }}>Details</th>
                    <th style={{ border: '1px solid #dee2e6', padding: '12px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restrictions.map((restriction) => (
                    <tr key={restriction._id}>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                        <span style={{
                          backgroundColor: restriction.scope === 'global' ? '#ffc107' : restriction.type === 'teacher' ? '#fd7e14' : '#6f42c1',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {restriction.scope === 'global' ? '🌐 GLOBAL' : 
                           restriction.scope === 'year-specific' ? '🎓 YEAR' :
                           restriction.type === 'teacher' ? '👨‍🏫 TEACHER' : '📚 SUBJECT'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px', fontWeight: '600' }}>
                        {restriction.restrictionName || restriction.teacherName || restriction.subjectName}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px', fontSize: '12px' }}>
                        {restriction.type === 'time' && (
                          <>
                            <div>Slots: {restriction.timeSlots?.join(', ')}</div>
                            <div>Days: {restriction.days?.join(', ')}</div>
                            {restriction.affectedYears && restriction.affectedYears.length > 0 && (
                              <div>Years: {restriction.affectedYears.join(', ')}</div>
                            )}
                          </>
                        )}
                        {restriction.type === 'teacher' && (
                          <>
                            <div>Unavailable: Slots {restriction.unavailableSlots?.join(', ')}</div>
                            {restriction.reason && <div>Reason: {restriction.reason}</div>}
                          </>
                        )}
                        {restriction.type === 'subject' && (
                          <>
                            <div>Allowed: Slots {restriction.allowedTimeSlots?.join(', ')}</div>
                            <div>Room: {restriction.roomType}</div>
                          </>
                        )}
                      </td>
                      <td style={{ border: '1px solid #dee2e6', padding: '8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(restriction._id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#856404' }}>🌐 Global Time Booking</h3>
            
            {/* Existing Global Bookings */}
            {existingGlobalBookings.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>📋 Existing Global Bookings:</h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {existingGlobalBookings.map((booking, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '12px',
                      borderBottom: index < existingGlobalBookings.length - 1 ? '1px solid #e0e0e0' : 'none'
                    }}>
                      <span>{booking.displayText}</span>
                      <button
                        onClick={() => deleteSpecificBooking({
                          id: booking.id,
                          activityName: booking.activityName,
                          day: booking.day,
                          slot: booking.slot,
                          scope: 'global'
                        })}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleGlobalSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Activity Name
                </label>
                <input
                  type="text"
                  value={globalBooking.activityName}
                  onChange={(e) => setGlobalBooking(prev => ({ ...prev, activityName: e.target.value }))}
                  placeholder="e.g., Morning Assembly, Lunch Break, Short Recess"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
                  Select Time Slots
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {timeSlots.map(slot => (
                    <div
                      key={slot.slotNumber}
                      onClick={() => handleSlotToggle(slot.slotNumber, 'global')}
                      style={{
                        padding: '10px 8px',
                        border: `2px solid ${globalBooking.slotNumbers.includes(slot.slotNumber) ? '#ffc107' : '#ddd'}`,
                        borderRadius: '6px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: globalBooking.slotNumbers.includes(slot.slotNumber) ? '#fff3cd' : 'white'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>Slot {slot.slotNumber}</div>
                      <div style={{ fontSize: '10px', color: '#666' }}>
                        {slot.startTime}-{slot.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Days</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                      <input
                        type="checkbox"
                        checked={globalBooking.days.includes(day)}
                        onChange={() => handleDayToggle(day, 'global')}
                        disabled={day !== 'All days' && globalBooking.days.includes('All days')}
                        style={{ marginRight: '6px' }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowGlobalModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ffc107',
                    color: '#856404',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Creating...' : 'Book Globally'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ COMPLETELY FIXED: Year-wise Booking Modal with Global Blocking */}
      {yearWiseModal.isOpen && (
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
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#0c5460' }}>
              🎓 Year-wise Time Booking
            </h3>
            
            {yearWiseModal.error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: '#ffebee',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #f44336',
                fontSize: '14px'
              }}>
                {yearWiseModal.error}
              </div>
            )}

            {/* ✅ FIXED: Show existing year-wise bookings */}
            {existingYearBookings.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#d1ecf1', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>
                  📋 Existing {yearWiseModal.academicYear} Bookings:
                </h4>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {existingYearBookings.map((booking, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '12px',
                      borderBottom: index < existingYearBookings.length - 1 ? '1px solid #bbb' : 'none'
                    }}>
                      <span>{booking.displayText}</span>
                      <button
                        onClick={() => deleteSpecificBooking({
                          id: booking.id,
                          activityName: booking.activityName,
                          day: booking.day,
                          slot: booking.slot,
                          scope: 'year-specific',
                          year: booking.year
                        })}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleYearWiseSubmit}>
              {/* Academic Year */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Academic Year
                </label>
                <select 
                  value={yearWiseModal.academicYear}
                  onChange={(e) => {
                    setYearWiseModal(prev => ({ ...prev, academicYear: e.target.value }));
                    // Fetch bookings for new year
                    fetchYearWiseBookings(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px'
                  }}
                >
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              {/* Activity Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Activity Name
                </label>
                <input
                  type="text"
                  value={yearWiseModal.formData.activityName}
                  onChange={(e) => setYearWiseModal(prev => ({
                    ...prev,
                    formData: { ...prev.formData, activityName: e.target.value }
                  }))}
                  placeholder="e.g., Open Elective, Guest Lecture, Lab Session"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px'
                  }}
                />
              </div>

              {/* Time Slots */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
                  Select Time Slots
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                  gap: '12px' 
                }}>
                  {yearWiseModal.timeSlots.map(slot => {
                    const isGloballyBooked = yearWiseModal.globallyBookedSlots.has(slot.slotNumber);
                    const isSelected = yearWiseModal.formData.selectedSlots.includes(slot.slotNumber);
                    
                    return (
                      <div
                        key={slot.slotNumber}
                        onClick={() => !isGloballyBooked && handleYearWiseSlotToggle(slot.slotNumber)}
                        style={{
                          padding: '12px 8px',
                          border: `2px solid ${
                            isGloballyBooked ? '#f44336' : 
                            isSelected ? '#17a2b8' : '#ddd'
                          }`,
                          borderRadius: '8px',
                          textAlign: 'center',
                          cursor: isGloballyBooked ? 'not-allowed' : 'pointer',
                          backgroundColor: isGloballyBooked ? '#ffebee' : 
                                         isSelected ? '#d1ecf1' : 'white',
                          opacity: isGloballyBooked ? 0.6 : 1
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          Slot {slot.slotNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {slot.startTime}-{slot.endTime}
                        </div>
                        {isGloballyBooked && (
                          <>
                            <div style={{ fontSize: '10px', color: '#f44336', marginTop: '4px' }}>
                              🔒 BLOCKED
                            </div>
                            <div style={{ fontSize: '9px', color: '#f44336' }}>
                              {slot.bookedBy}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ✅ COMPLETELY FIXED: Days Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
                  Days
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={yearWiseModal.formData.selectedDays.includes(day)}
                        onChange={() => handleYearWiseDayToggle(day)}
                        style={{ marginRight: '8px' }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setYearWiseModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={yearWiseModal.loading || yearWiseModal.formData.selectedSlots.some(slot => yearWiseModal.globallyBookedSlots.has(slot))}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: yearWiseModal.loading || yearWiseModal.formData.selectedSlots.some(slot => yearWiseModal.globallyBookedSlots.has(slot)) ? '#ccc' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: yearWiseModal.loading || yearWiseModal.formData.selectedSlots.some(slot => yearWiseModal.globallyBookedSlots.has(slot)) ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {yearWiseModal.loading ? '🔄 Creating...' : '✅ Book for ' + yearWiseModal.academicYear}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {showConflictModal && conflictData && (
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
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '16px' }}>⚠️ Booking Conflict Detected</h3>
            
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{conflictData.message}</p>
              {conflictData.conflicts.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                  {conflictData.conflicts.map((conflict, index) => (
                    <li key={index}>
                      {conflict.restrictionName} (Slots: {conflict.slots.join(', ')}, Days: {conflict.days.join(', ')})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
              Do you want to override the existing bookings? This will replace conflicting restrictions.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                  setPendingBooking(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => submitBooking(pendingBooking, true)}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Overriding...' : 'Yes, Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableRestrictions;
