import React, { useState, useEffect } from 'react';
import axios from 'axios';

const YearWiseBookingModal = ({ isOpen, onClose, onBookingCreated, academicYear }) => {
  const [formData, setFormData] = useState({
    activityName: '',
    selectedSlots: [],
    selectedDays: ['All days']
  });
  const [timeSlots, setTimeSlots] = useState([]);
  const [existingBookings, setExistingBookings] = useState([]);
  const [globallyBookedSlots, setGloballyBookedSlots] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTimeSlots();
      fetchExistingBookings();
      fetchGlobalBookings();
    }
  }, [isOpen, academicYear]);

  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/resources/timeslots');
      setTimeSlots(response.data.timeSlots || []);
    } catch (err) {
      console.error('Error fetching time slots:', err);
      setError('Failed to fetch time slots');
    }
  };

  const fetchExistingBookings = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/restrictions/year-wise/${academicYear}`);
      setExistingBookings(Object.keys(response.data.bookings || {}));
    } catch (err) {
      console.error('Error fetching existing bookings:', err);
    }
  };

  // FIXED: Proper global booking detection
  const fetchGlobalBookings = async () => {
    try {
      console.log('🔍 Fetching global bookings to block slots...');
      
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
      
      setGloballyBookedSlots(bookedSlots);
      console.log('✅ Globally booked slots detected:', Array.from(bookedSlots));
      
    } catch (err) {
      console.error('Error fetching global bookings:', err);
      setGloballyBookedSlots(new Set());
    }
  };

  const handleSlotToggle = (slotNumber) => {
    // FIXED: Check if slot is globally booked
    if (globallyBookedSlots.has(slotNumber)) {
      const bookedSlot = timeSlots.find(s => s.slotNumber === slotNumber);
      const activityName = bookedSlot?.bookedBy || 'unknown activity';
      setError(`❌ Slot ${slotNumber} is globally booked for "${activityName}" and cannot be used for year-specific bookings.`);
      return;
    }

    setError(''); // Clear error
    setFormData(prev => ({
      ...prev,
      selectedSlots: prev.selectedSlots.includes(slotNumber)
        ? prev.selectedSlots.filter(s => s !== slotNumber)
        : [...prev.selectedSlots, slotNumber]
    }));
  };

  const handleDayToggle = (day) => {
    if (day === 'All days') {
      setFormData(prev => ({
        ...prev,
        selectedDays: prev.selectedDays.includes('All days') 
          ? [] 
          : ['All days']
      }));
    } else {
      setFormData(prev => {
        let newDays = prev.selectedDays.filter(d => d !== 'All days');
        if (newDays.includes(day)) {
          newDays = newDays.filter(d => d !== day);
        } else {
          newDays = [...newDays, day];
        }
        return { ...prev, selectedDays: newDays };
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.activityName.trim()) {
      setError('Activity name is required');
      return;
    }

    if (formData.selectedSlots.length === 0) {
      setError('Please select at least one time slot');
      return;
    }

    if (formData.selectedDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    // FIXED: Final check for globally booked slots
    const conflictingSlots = formData.selectedSlots.filter(slot => 
      globallyBookedSlots.has(slot)
    );
    
    if (conflictingSlots.length > 0) {
      setError(`❌ Cannot book slots ${conflictingSlots.join(', ')} - they are globally booked.`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const bookingData = {
        type: 'time',
        restrictionName: formData.activityName,
        scope: 'year-specific',
        affectedYears: [academicYear],
        timeSlots: formData.selectedSlots,
        days: formData.selectedDays,
        priority: 2
      };

      console.log('📝 Creating year-specific booking:', bookingData);

      const response = await axios.post('http://localhost:5000/api/restrictions', bookingData);
      console.log('✅ Booking created successfully:', response.data);
      
      onBookingCreated();
      onClose();
      
      // Reset form
      setFormData({
        activityName: '',
        selectedSlots: [],
        selectedDays: ['All days']
      });

    } catch (err) {
      console.error('❌ Error creating booking:', err);
      if (err.response?.data?.conflictMessage) {
        setError(err.response.data.conflictMessage);
      } else {
        setError(err.response?.data?.error || 'Failed to create booking');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
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
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          🎓 Year-wise Time Booking
        </h3>
        
        {error && (
          <div style={{
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            border: '1px solid #f44336',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Academic Year */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#f5f5f5'
              }}
            />
          </div>

          {/* Activity Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Activity Name
            </label>
            <input
              type="text"
              value={formData.activityName}
              onChange={(e) => setFormData(prev => ({ ...prev, activityName: e.target.value }))}
              placeholder="e.g., Open Elective, Guest Lecture, Lab Session"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px'
              }}
            />
          </div>

          {/* Existing Bookings */}
          {existingBookings.length > 0 && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#e3f2fd',
              borderRadius: '6px',
              border: '1px solid #2196f3'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>
                📋 Existing {academicYear} Bookings:
              </h4>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {existingBookings.join(', ')}
              </div>
            </div>
          )}

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
              {timeSlots.map(slot => {
                const isGloballyBooked = globallyBookedSlots.has(slot.slotNumber);
                const isSelected = formData.selectedSlots.includes(slot.slotNumber);
                
                return (
                  <div
                    key={slot.slotNumber}
                    onClick={() => !isGloballyBooked && handleSlotToggle(slot.slotNumber)}
                    style={{
                      padding: '12px 8px',
                      border: `2px solid ${
                        isGloballyBooked ? '#f44336' : 
                        isSelected ? '#2196f3' : '#ddd'
                      }`,
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: isGloballyBooked ? 'not-allowed' : 'pointer',
                      backgroundColor: isGloballyBooked ? '#ffebee' : 
                                     isSelected ? '#e3f2fd' : 'white',
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
                          🔒 Global Booking
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

          {/* Days */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>
              Days
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.selectedDays.includes('All days')}
                  onChange={() => handleDayToggle('All days')}
                  style={{ marginRight: '8px' }}
                />
                All days
              </label>
              {days.map(day => (
                <label key={day} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.selectedDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                    disabled={formData.selectedDays.includes('All days')}
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
              onClick={onClose}
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
              disabled={loading || formData.selectedSlots.some(slot => globallyBookedSlots.has(slot))}
              style={{
                padding: '10px 20px',
                backgroundColor: loading || formData.selectedSlots.some(slot => globallyBookedSlots.has(slot)) ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || formData.selectedSlots.some(slot => globallyBookedSlots.has(slot)) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '🔄 Creating...' : '✅ Book for ' + academicYear}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default YearWiseBookingModal;
