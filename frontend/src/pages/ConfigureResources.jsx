import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ConfigureResources = () => {
  const [resources, setResources] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('CR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [conflictDialog, setConflictDialog] = useState(null);

  // Time Slot Configuration State
  const [timeConfig, setTimeConfig] = useState({
    collegeStartTime: '08:00 AM',
    collegeEndTime: '03:00 PM',
    workingDaysPerWeek: 5,
    timeSlotsPerDay: 8,
    periodDurationMinutes: 60
  });
  const [timeSlots, setTimeSlots] = useState([]);
  const [fixedBookings, setFixedBookings] = useState([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);

  // Advanced Modal State
  const [advancedTimeSlots, setAdvancedTimeSlots] = useState([]);
  const [newBooking, setNewBooking] = useState({
    slotNumber: '',
    days: [],
    slotName: '',
    timingMode: 'duration',
    durationMinutes: 15,
    customDurationMinutes: '',
    exactStartTime: '',
    exactEndTime: ''
  });
  const [tempFixedBookings, setTempFixedBookings] = useState([]);

  // Duration preset options
  const durationPresets = [5, 10, 15, 20, 30, 45, 60];

  // Time format validation
  const validateTimeFormat = useCallback((time) => {
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;
    return timeRegex.test(time);
  }, []);

  // Fetch functions
  const fetchResources = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/resources/rooms');
      setResources(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to fetch resources: ' + err.message);
      setLoading(false);
    }
  }, []);

  const fetchTimeConfiguration = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/resources/timeslots');
      if (response.data) {
        setTimeConfig({
          collegeStartTime: response.data.collegeStartTime || '08:00 AM',
          collegeEndTime: response.data.collegeEndTime || '03:00 PM',
          workingDaysPerWeek: response.data.workingDaysPerWeek || 5,
          timeSlotsPerDay: response.data.timeSlotsPerDay || 8,
          periodDurationMinutes: response.data.periodDurationMinutes || 60
        });
        setTimeSlots(response.data.timeSlots || []);
        setFixedBookings(response.data.fixedBookings || []);
      }
    } catch (err) {
      console.error('Error fetching time configuration:', err);
    }
  }, []);

  useEffect(() => {
    fetchResources();
    fetchTimeConfiguration();
  }, [fetchResources, fetchTimeConfiguration]);

  // Clear messages after timeout
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Room management functions
  const addResource = async () => {
    if (!newRoomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    try {
      setError('');
      const res = await axios.post('http://localhost:5000/api/resources/rooms', {
        roomName: newRoomName.trim(),
        type: newRoomType
      });
      
      setSuccessMessage(res.data.message);
      setNewRoomName('');
      setNewRoomType('CR');
      fetchResources();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to add resource';
      setError(errorMsg);
    }
  };

  const removeResource = async (id, roomName) => {
    if (!window.confirm(`Are you sure you want to remove "${roomName}"?`)) {
      return;
    }

    try {
      const res = await axios.delete(`http://localhost:5000/api/resources/rooms/${id}`);
      setSuccessMessage(res.data.message);
      fetchResources();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to remove resource';
      setError(errorMsg);
    }
  };

  // Time slot generation
  const generateTimeSlots = async () => {
    try {
      setError('');
      const response = await axios.post('http://localhost:5000/api/resources/timeslots/generate', timeConfig);
      setTimeSlots(response.data.config.timeSlots);
      setSuccessMessage(response.data.message);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to generate time slots';
      setError(errorMsg);
    }
  };

  const handleTimeConfigChange = useCallback((field, value) => {
    setTimeConfig(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Advanced Modal Functions
  const openAdvancedModal = () => {
    setAdvancedTimeSlots([...timeSlots]);
    setTempFixedBookings([...fixedBookings]);
    setShowAdvancedModal(true);
  };

  const closeAdvancedModal = () => {
    setShowAdvancedModal(false);
    setNewBooking({ 
      slotNumber: '', 
      days: [], 
      slotName: '', 
      timingMode: 'duration',
      durationMinutes: 15,
      customDurationMinutes: '',
      exactStartTime: '',
      exactEndTime: ''
    });
    setConflictDialog(null);
  };

  const updateAdvancedTimeSlot = (index, field, value) => {
    const updatedSlots = [...advancedTimeSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      [field]: value
    };
    setAdvancedTimeSlots(updatedSlots);
  };

  // FIXED: Enhanced booking function with proper scope management
  const addFixedBooking = async () => {
    // Validation
    if (!newBooking.slotNumber || !newBooking.slotName || newBooking.days.length === 0) {
      setError('Please fill all booking fields');
      return;
    }

    // Create booking data object at function scope
    const bookingData = {
      slotNumber: parseInt(newBooking.slotNumber),
      days: newBooking.days,
      slotName: newBooking.slotName,
      timingMode: newBooking.timingMode
    };

    // Add timing-specific data based on mode
    if (newBooking.timingMode === 'duration') {
      const finalDuration = newBooking.customDurationMinutes ? 
        parseInt(newBooking.customDurationMinutes) : 
        newBooking.durationMinutes;
      
      if (finalDuration < 5 || finalDuration > 300) {
        setError('Duration must be between 5 and 300 minutes');
        return;
      }
      
      bookingData.durationMinutes = finalDuration;
    } else {
      // Exact time mode validation
      if (!validateTimeFormat(newBooking.exactStartTime)) {
        setError('Start time must be in format "12:00 PM"');
        return;
      }
      
      if (!validateTimeFormat(newBooking.exactEndTime)) {
        setError('End time must be in format "12:00 PM"');
        return;
      }
      
      bookingData.exactStartTime = newBooking.exactStartTime;
      bookingData.exactEndTime = newBooking.exactEndTime;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/resources/timeslots/booking-enhanced', bookingData);
      
      // Update temp bookings
      const updatedBookings = tempFixedBookings.filter(b => b.slotNumber !== bookingData.slotNumber);
      setTempFixedBookings([...updatedBookings, response.data.booking]);
      
      // Reset form
      setNewBooking({ 
        slotNumber: '', 
        days: [], 
        slotName: '', 
        timingMode: 'duration',
        durationMinutes: 15,
        customDurationMinutes: '',
        exactStartTime: '',
        exactEndTime: ''
      });
      
      setError('');
      setSuccessMessage('✅ Booking added successfully!');

    } catch (err) {
      if (err.response?.status === 409) {
        // Conflict detected - bookingData is available in function scope
        setConflictDialog({
          conflicts: err.response.data.conflictingBookings,
          pendingBooking: bookingData
        });
      } else {
        const errorMsg = err.response?.data?.error || 'Failed to add booking';
        setError(errorMsg);
      }
    }
  };

  // Conflict resolution
  const handleConflictResolution = async (action) => {
    if (action === 'replace' && conflictDialog) {
      try {
        const response = await axios.post('http://localhost:5000/api/resources/timeslots/booking-enhanced', {
          ...conflictDialog.pendingBooking,
          replaceConflicting: true
        });
        
        const updatedBookings = tempFixedBookings.filter(b => 
          b.slotNumber !== conflictDialog.pendingBooking.slotNumber
        );
        setTempFixedBookings([...updatedBookings, response.data.booking]);
        
        setConflictDialog(null);
        setSuccessMessage(`✅ Booking added! Replaced ${response.data.conflictsReplaced || 0} conflicting booking(s).`);
        
      } catch (err) {
        setError('❌ Failed to resolve conflict');
      }
    } else {
      setConflictDialog(null);
    }
  };

  const removeFixedBooking = (slotNumber) => {
    setTempFixedBookings(tempFixedBookings.filter(b => b.slotNumber !== slotNumber));
  };

  const saveAdvancedConfiguration = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/resources/timeslots', {
        ...timeConfig,
        timeSlots: advancedTimeSlots,
        fixedBookings: tempFixedBookings
      });
      
      setTimeSlots([...advancedTimeSlots]);
      setFixedBookings([...tempFixedBookings]);
      setSuccessMessage(response.data.message + (response.data.recalculated ? ' 🔄 (Slots dynamically adjusted!)' : ''));
      closeAdvancedModal();
      
      // Refresh configuration
      setTimeout(() => {
        fetchTimeConfiguration();
      }, 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save configuration';
      setError(errorMsg);
    }
  };

  // Day selection handler
  const handleDaySelection = (day) => {
    setNewBooking(prev => {
      if (day === 'All days') {
        return {
          ...prev,
          days: prev.days.includes('All days') ? [] : ['All days']
        };
      } else {
        const newDays = prev.days.includes('All days') 
          ? [day] 
          : prev.days.includes(day)
            ? prev.days.filter(d => d !== day)
            : [...prev.days, day];
        return { ...prev, days: newDays };
      }
    });
  };

  // Display helpers
  const getDaysDisplay = (days) => {
    if (days.includes('All days')) return 'All Days';
    return days.join(', ');
  };

  const getBookingTimeDisplay = (booking) => {
    if (booking.timingMode === 'exact') {
      return `${booking.exactStartTime} - ${booking.exactEndTime}`;
    }
    return `${booking.calculatedDurationMinutes || booking.durationMinutes} min`;
  };

  const getSlotDisplayTime = (slot) => {
    if (slot.adjustedStartTime && slot.adjustedEndTime) {
      return `${slot.adjustedStartTime} - ${slot.adjustedEndTime}`;
    }
    return `${slot.startTime || ''} - ${slot.endTime || ''}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Configure Resources</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#6c757d' }}>🔄 Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🏫 Configure Resources</h1>
      
      {/* Enhanced Messages */}
      {error && (
        <div style={{ 
          color: '#d32f2f', 
          backgroundColor: '#ffebee', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f44336',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div style={{ 
          color: '#2e7d32', 
          backgroundColor: '#e8f5e8', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #4caf50',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '30px', marginBottom: '30px', flexWrap: 'wrap' }}>
        
        {/* Room Management Section */}
        <div style={{ 
          flex: 1, 
          minWidth: '400px',
          backgroundColor: '#f8f9fa', 
          padding: '25px', 
          borderRadius: '12px',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
            🏫 <span>Room Management</span>
          </h2>
          
          {/* Add New Room */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '25px', 
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '25px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#495057' }}>➕ Add New Room</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. CL203, LAB101"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Type
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="CR">CR (Classroom)</option>
                  <option value="LAB">LAB (Laboratory)</option>
                </select>
              </div>
              <button
                onClick={addResource}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                ➕ Add Room
              </button>
            </div>
          </div>

          {/* Resources Table */}
          <div>
            <h3 style={{ marginBottom: '20px', color: '#495057' }}>
              📋 Current Resources ({resources.length})
            </h3>
            {resources.length > 0 ? (
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  backgroundColor: 'white'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Room Name</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Capacity</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource, index) => (
                      <tr key={resource._id} style={{ 
                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                        borderBottom: '1px solid #dee2e6',
                        transition: 'background-color 0.2s'
                      }}>
                        <td style={{ padding: '16px', fontWeight: '600', color: '#495057' }}>
                          {resource.roomName}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: resource.type === 'CR' ? '#d4edda' : '#cce5ff',
                            color: resource.type === 'CR' ? '#155724' : '#004085'
                          }}>
                            {resource.type}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center', color: '#6c757d' }}>
                          {resource.capacity || 60}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => removeResource(resource._id, resource.roomName)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                          >
                            🗑️ Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '2px dashed #dee2e6'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
                <p style={{ color: '#6c757d', fontSize: '18px', margin: '0 0 8px 0' }}>No rooms added yet</p>
                <p style={{ color: '#6c757d', fontSize: '14px', margin: '0' }}>Add classrooms and laboratories above to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Time Slot Configuration Section */}
        <div style={{ 
          flex: 1, 
          minWidth: '400px',
          backgroundColor: '#f8f9fa', 
          padding: '25px', 
          borderRadius: '12px',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
            ⏰ <span>Time Slot Configuration</span>
          </h2>
          
          <div style={{ 
            backgroundColor: 'white', 
            padding: '25px', 
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '25px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#495057' }}>🎯 College Timing</h3>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Start Time
                </label>
                <input
                  type="text"
                  value={timeConfig.collegeStartTime}
                  onChange={(e) => handleTimeConfigChange('collegeStartTime', e.target.value)}
                  placeholder="08:00 AM"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  End Time
                </label>
                <input
                  type="text"
                  value={timeConfig.collegeEndTime}
                  onChange={(e) => handleTimeConfigChange('collegeEndTime', e.target.value)}
                  placeholder="03:00 PM"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Slots per Day
                </label>
                <input
                  type="number"
                  value={timeConfig.timeSlotsPerDay}
                  onChange={(e) => handleTimeConfigChange('timeSlotsPerDay', parseInt(e.target.value) || 8)}
                  min="1"
                  max="12"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Period Duration (min)
                </label>
                <input
                  type="number"
                  value={timeConfig.periodDurationMinutes}
                  onChange={(e) => handleTimeConfigChange('periodDurationMinutes', parseInt(e.target.value) || 60)}
                  min="30"
                  max="120"
                  step="15"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={generateTimeSlots}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
              >
                🔄 Generate Time Slots
              </button>

              <button
                onClick={openAdvancedModal}
                style={{
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a2d91'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6f42c1'}
              >
                ⚙️ Configure Advanced Time Slots
              </button>

              {timeSlots.length > 0 && (
                <button
                  onClick={() => setShowTimeSlots(!showTimeSlots)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                >
                  {showTimeSlots ? '🔼 Hide' : '🔽 Show'} Generated Time Slots ({timeSlots.length})
                </button>
              )}
            </div>
          </div>

          {/* Generated Time Slots Display */}
          {showTimeSlots && timeSlots.length > 0 && (
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{ marginBottom: '16px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 Generated Time Slots ({timeSlots.length})
              </h4>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '6px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Slot</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Time</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot) => (
                      <tr key={slot.slotNumber} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#495057' }}>
                          Slot {slot.slotNumber}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6c757d' }}>
                          {getSlotDisplayTime(slot)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {slot.isAdjusted ? (
                            <span style={{ 
                              backgroundColor: '#fff3cd', 
                              color: '#856404',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              ADJUSTED
                            </span>
                          ) : (
                            <span style={{ 
                              color: '#28a745', 
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ENHANCED FIXED BOOKINGS DISPLAY */}
              {fixedBookings.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '12px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📌 Fixed Bookings ({fixedBookings.length})
                  </h4>
                  <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                    {fixedBookings.map((booking, index) => (
                      <div key={index} style={{ 
                        marginBottom: index < fixedBookings.length - 1 ? '12px' : '0',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontWeight: '600', color: '#495057' }}>
                          Slot {booking.slotNumber}:
                        </span>
                        <span style={{ color: '#007bff', fontWeight: '600' }}>
                          {booking.slotName}
                        </span>
                        <span style={{ 
                          backgroundColor: booking.timingMode === 'exact' ? '#e3f2fd' : '#f3e5f5',
                          color: booking.timingMode === 'exact' ? '#1976d2' : '#7b1fa2',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {getBookingTimeDisplay(booking)}
                        </span>
                        {booking.timingMode === 'exact' && (
                          <span style={{ 
                            backgroundColor: '#e8f5e8',
                            color: '#2e7d32',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            EXACT TIME
                          </span>
                        )}
                        <span style={{ color: '#6c757d', fontSize: '12px' }}>
                          • {getDaysDisplay(booking.days)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ENHANCED ADVANCED TIME SLOTS MODAL */}
      {showAdvancedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e9ecef'
            }}>
              <h2 style={{ margin: 0, color: '#495057', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚙️ Configure Advanced Time Slots
              </h2>
              <button
                onClick={closeAdvancedModal}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#dc3545'}
                onMouseLeave={(e) => e.target.style.color = '#6c757d'}
              >
                ✕
              </button>
            </div>

            {/* College Timing Section */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '16px', color: '#495057' }}>🎯 College Timing</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    College Start Time
                  </label>
                  <input
                    type="text"
                    value={timeConfig.collegeStartTime}
                    onChange={(e) => handleTimeConfigChange('collegeStartTime', e.target.value)}
                    style={{ 
                      padding: '10px 14px', 
                      border: '2px solid #e9ecef', 
                      borderRadius: '6px', 
                      width: '100%',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    End Time
                  </label>
                  <input
                    type="text"
                    value={timeConfig.collegeEndTime}
                    onChange={(e) => handleTimeConfigChange('collegeEndTime', e.target.value)}
                    style={{ 
                      padding: '10px 14px', 
                      border: '2px solid #e9ecef', 
                      borderRadius: '6px', 
                      width: '100%',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Time Slots Configuration Table */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '16px', color: '#495057' }}>📅 Time Slots Configuration</h3>
              <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#495057' }}>
                        Slots
                      </th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#495057' }}>
                        Start Time
                      </th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#495057' }}>
                        End Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {advancedTimeSlots.map((slot, index) => (
                      <tr key={slot.slotNumber} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '600', color: '#495057' }}>
                          Slot {slot.slotNumber}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={slot.adjustedStartTime || slot.startTime}
                            onChange={(e) => updateAdvancedTimeSlot(index, 'startTime', e.target.value)}
                            style={{ 
                              padding: '8px 12px', 
                              border: '2px solid #e9ecef', 
                              borderRadius: '4px', 
                              width: '100%',
                              fontSize: '14px'
                            }}
                          >
                            <option value={slot.adjustedStartTime || slot.startTime}>
                              {slot.adjustedStartTime || slot.startTime}
                            </option>
                            <option value="08:00 AM">08:00 AM</option>
                            <option value="09:00 AM">09:00 AM</option>
                            <option value="10:00 AM">10:00 AM</option>
                            <option value="11:00 AM">11:00 AM</option>
                            <option value="12:00 PM">12:00 PM</option>
                            <option value="01:00 PM">01:00 PM</option>
                            <option value="02:00 PM">02:00 PM</option>
                            <option value="03:00 PM">03:00 PM</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={slot.adjustedEndTime || slot.endTime}
                            onChange={(e) => updateAdvancedTimeSlot(index, 'endTime', e.target.value)}
                            style={{ 
                              padding: '8px 12px', 
                              border: '2px solid #e9ecef', 
                              borderRadius: '4px', 
                              width: '100%',
                              fontSize: '14px'
                            }}
                          >
                            <option value={slot.adjustedEndTime || slot.endTime}>
                              {slot.adjustedEndTime || slot.endTime}
                            </option>
                            <option value="09:00 AM">09:00 AM</option>
                            <option value="10:00 AM">10:00 AM</option>
                            <option value="11:00 AM">11:00 AM</option>
                            <option value="12:00 PM">12:00 PM</option>
                            <option value="01:00 PM">01:00 PM</option>
                            <option value="02:00 PM">02:00 PM</option>
                            <option value="03:00 PM">03:00 PM</option>
                            <option value="04:00 PM">04:00 PM</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ENHANCED BOOK FIXED SLOTS SECTION */}
            <div style={{ 
              marginBottom: '32px', 
              padding: '24px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '10px',
              border: '1px solid #e9ecef'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📌 Book Fixed Slots
              </h3>
              
              {/* Enhanced Timing Mode Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#495057' }}>
                  🎯 Timing Mode
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '24px',
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500'
                  }}>
                    <input
                      type="radio"
                      name="timingMode"
                      value="duration"
                      checked={newBooking.timingMode === 'duration'}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, timingMode: e.target.value }))}
                      style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                    />
                    ⏱️ Duration Mode
                  </label>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500'
                  }}>
                    <input
                      type="radio"
                      name="timingMode"
                      value="exact"
                      checked={newBooking.timingMode === 'exact'}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, timingMode: e.target.value }))}
                      style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                    />
                    🎯 Exact Time Mode
                  </label>
                </div>
              </div>

              {/* Booking Form Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: '20px', 
                marginBottom: '24px' 
              }}>
                
                {/* Book Slot Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    📋 Book Slot
                  </label>
                  <select
                    value={newBooking.slotNumber}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, slotNumber: e.target.value }))}
                    style={{ 
                      padding: '10px 14px', 
                      border: '2px solid #e9ecef', 
                      borderRadius: '6px', 
                      width: '100%',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Select Slot</option>
                    {advancedTimeSlots.map(slot => (
                      <option key={slot.slotNumber} value={slot.slotNumber}>
                        Slot {slot.slotNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ENHANCED TIMING FIELDS */}
                {newBooking.timingMode === 'duration' ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                      ⏱️ Duration
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={newBooking.customDurationMinutes ? '' : newBooking.durationMinutes}
                        onChange={(e) => {
                          setNewBooking(prev => ({ 
                            ...prev, 
                            durationMinutes: parseInt(e.target.value),
                            customDurationMinutes: ''
                          }));
                        }}
                        style={{ 
                          padding: '10px 14px', 
                          border: '2px solid #e9ecef', 
                          borderRadius: '6px', 
                          flex: 1,
                          fontSize: '14px'
                        }}
                      >
                        {durationPresets.map(duration => (
                          <option key={duration} value={duration}>{duration} min</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={newBooking.customDurationMinutes}
                        onChange={(e) => setNewBooking(prev => ({ 
                          ...prev, 
                          customDurationMinutes: e.target.value 
                        }))}
                        placeholder="Custom"
                        min="5"
                        max="300"
                        style={{ 
                          padding: '10px 14px', 
                          border: '2px solid #e9ecef', 
                          borderRadius: '6px', 
                          width: '90px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <small style={{ color: '#6c757d', marginTop: '4px', display: 'block' }}>
                      Select preset or enter custom minutes
                    </small>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                        🕐 Start Time
                      </label>
                      <input
                        type="text"
                        value={newBooking.exactStartTime}
                        onChange={(e) => setNewBooking(prev => ({ ...prev, exactStartTime: e.target.value }))}
                        placeholder="12:00 PM"
                        style={{ 
                          padding: '10px 14px', 
                          border: '2px solid #e9ecef', 
                          borderRadius: '6px', 
                          width: '100%',
                          fontSize: '14px'
                        }}
                      />
                      <small style={{ color: '#6c757d', marginTop: '4px', display: 'block' }}>
                        Format: "12:00 PM"
                      </small>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                        🕐 End Time
                      </label>
                      <input
                        type="text"
                        value={newBooking.exactEndTime}
                        onChange={(e) => setNewBooking(prev => ({ ...prev, exactEndTime: e.target.value }))}
                        placeholder="12:45 PM"
                        style={{ 
                          padding: '10px 14px', 
                          border: '2px solid #e9ecef', 
                          borderRadius: '6px', 
                          width: '100%',
                          fontSize: '14px'
                        }}
                      />
                      <small style={{ color: '#6c757d', marginTop: '4px', display: 'block' }}>
                        Format: "12:45 PM"
                      </small>
                    </div>
                  </>
                )}
                
                {/* Slot Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    🏷️ Slot Name
                  </label>
                  <input
                    type="text"
                    value={newBooking.slotName}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, slotName: e.target.value }))}
                    placeholder="e.g., Big Recess, Break"
                    style={{ 
                      padding: '10px 14px', 
                      border: '2px solid #e9ecef', 
                      borderRadius: '6px', 
                      width: '100%',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#495057' }}>
                  📅 Select Days
                </label>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '2px solid #e9ecef'
                }}>
                  {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <label key={day} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      padding: '8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      backgroundColor: newBooking.days.includes(day) ? '#e3f2fd' : 'transparent'
                    }}>
                      <input
                        type="checkbox"
                        checked={newBooking.days.includes(day)}
                        onChange={() => handleDaySelection(day)}
                        style={{ marginRight: '8px', transform: 'scale(1.1)' }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              {/* Add Booking Button */}
              <button
                onClick={addFixedBooking}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
              >
                📌 Book Fixed Slot
              </button>

              {/* Current Fixed Bookings Display */}
              {tempFixedBookings.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '16px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Current Bookings ({tempFixedBookings.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tempFixedBookings.map((booking, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        backgroundColor: 'white',
                        padding: '16px 20px',
                        borderRadius: '8px',
                        border: '2px solid #e9ecef',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
                            Slot {booking.slotNumber}: {booking.slotName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                            <span style={{ 
                              backgroundColor: booking.timingMode === 'exact' ? '#e3f2fd' : '#f3e5f5',
                              color: booking.timingMode === 'exact' ? '#1976d2' : '#7b1fa2',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontWeight: '600'
                            }}>
                              {getBookingTimeDisplay(booking)}
                            </span>
                            {booking.timingMode === 'exact' && (
                              <span style={{ 
                                backgroundColor: '#e8f5e8',
                                color: '#2e7d32',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                EXACT
                              </span>
                            )}
                            <span style={{ color: '#6c757d' }}>
                              • {getDaysDisplay(booking.days)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFixedBooking(booking.slotNumber)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              gap: '16px',
              paddingTop: '16px',
              borderTop: '2px solid #e9ecef'
            }}>
              <button
                onClick={closeAdvancedModal}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                ❌ Cancel
              </button>
              <button
                onClick={saveAdvancedConfiguration}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                💾 Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED CONFLICT RESOLUTION DIALOG */}
      {conflictDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ color: '#dc3545', marginBottom: '8px' }}>Time Slot Conflict Detected</h3>
              <p style={{ color: '#6c757d', margin: '0' }}>
                Your booking conflicts with existing reservations
              </p>
            </div>
            
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '24px',
              border: '2px solid #e9ecef'
            }}>
              <h4 style={{ marginBottom: '16px', color: '#495057' }}>Conflicting Bookings:</h4>
              {conflictDialog.conflicts.map((conflict, index) => (
                <div key={index} style={{ 
                  marginBottom: index < conflictDialog.conflicts.length - 1 ? '12px' : '0',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ fontWeight: '600', color: '#495057', marginBottom: '4px' }}>
                    "{conflict.slotName}"
                  </div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                    {conflict.time} • {conflict.days.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ color: '#495057', fontWeight: '500' }}>What would you like to do?</p>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => handleConflictResolution('cancel')}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                🛡️ Keep Existing & Cancel
              </button>
              <button
                onClick={() => handleConflictResolution('replace')}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                🔄 Replace & Book New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Configuration Button */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button
          onClick={() => {
            setSuccessMessage('✅ Resource configuration completed successfully!');
          }}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '20px 50px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#218838';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#28a745';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
          }}
        >
          💾 Save All Configuration
        </button>
      </div>
    </div>
  );
};

export default ConfigureResources;
