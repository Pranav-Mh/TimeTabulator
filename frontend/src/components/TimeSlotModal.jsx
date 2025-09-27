import React, { useState, useEffect } from 'react';
import axios from 'axios';


const TimeSlotModal = ({ isOpen, onClose, timeSlotsPerDay, periodDuration, onSave }) => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [fixedBookings, setFixedBookings] = useState([]);
  const [collegeStartTime, setCollegeStartTime] = useState('08:00 AM');
  const [collegeEndTime, setCollegeEndTime] = useState('03:00 PM');


  // Fixed booking form
  const [selectedSlot, setSelectedSlot] = useState('');
  // Since global booking applies to all days only, selectedDays always encompasses all days.
  const [selectedDays, setSelectedDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
  const [slotName, setSlotName] = useState('');


  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');


  useEffect(() => {
    if (isOpen) {
      loadExistingTimeSlots();
      // Ensure selectedDays is always all days for global booking
      setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    }
  }, [isOpen]);


  const loadExistingTimeSlots = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/resources/timeslots');
      if (res.data.timeSlots && res.data.timeSlots.length > 0) {
        setTimeSlots(res.data.timeSlots);
        setCollegeStartTime(res.data.collegeStartTime);
        setCollegeEndTime(res.data.collegeEndTime);
        setFixedBookings(res.data.fixedBookings || []);
      } else {
        initializeTimeSlots();
      }
    } catch (err) {
      console.error('Error loading time slots:', err);
      initializeTimeSlots();
    }
  };


  const initializeTimeSlots = () => {
    const slots = [];
    for (let i = 1; i <= timeSlotsPerDay; i++) {
      slots.push({
        slotNumber: i,
        startTime: '',
        endTime: ''
      });
    }
    setTimeSlots(slots);
  };


  const updateTimeSlot = (index, field, value) => {
    const updatedSlots = [...timeSlots];
    updatedSlots[index][field] = value;
    setTimeSlots(updatedSlots);
  };


  const addFixedBooking = () => {
    if (!selectedSlot || !slotName) {
      setErrorMessage('Please fill all fields for fixed booking');
      return;
    }


    // Always include all days for global booking
    const booking = {
      slotNumber: parseInt(selectedSlot),
      days: [...selectedDays],
      slotName: slotName.trim()
    };


    const existingBooking = fixedBookings.find(
      b => b.slotNumber === booking.slotNumber
    );


    if (existingBooking) {
      const updatedBookings = fixedBookings.map(b =>
        b.slotNumber === booking.slotNumber ? booking : b
      );
      setFixedBookings(updatedBookings);
    } else {
      setFixedBookings([...fixedBookings, booking]);
    }


    setSelectedSlot('');
    setSlotName('');
    setErrorMessage('');
    setSuccessMessage(`Fixed booking for "${booking.slotName}" added successfully`);
    setTimeout(() => setSuccessMessage(''), 2000);
  };


  const removeFixedBooking = (slotNumber) => {
    setFixedBookings(fixedBookings.filter(b => b.slotNumber !== slotNumber));
  };


  const saveConfiguration = async () => {
    try {
      setErrorMessage('');


      for (const slot of timeSlots) {
        if (!slot.startTime || !slot.endTime) {
          setErrorMessage('Please fill all time slots');
          return;
        }
      }


      const res = await axios.post('http://localhost:5000/api/resources/timeslots', {
        collegeStartTime,
        collegeEndTime,
        workingDaysPerWeek: 5,
        timeSlotsPerDay,
        periodDurationMinutes: periodDuration,
        timeSlots,
        fixedBookings
      });


      setSuccessMessage('Time slot configuration saved successfully!');
      setTimeout(() => {
        onSave(res.data);
        onClose();
      }, 1500);


    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save configuration';
      setErrorMessage(errorMsg);
    }
  };


  if (!isOpen) return null;


  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
        width: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Configure Time Slots</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
            ×
          </button>
        </div>


        {/* Auto-Generated Notice */}
        {timeSlots.length > 0 && (
          <div style={{
            backgroundColor: '#cce5ff',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '15px',
            border: '1px solid #007bff'
          }}>
            <div style={{ color: '#004085', fontSize: '14px' }}>
              🤖 <strong>Auto-Generated Slots</strong> - Edit times as needed or add fixed bookings for recess/lunch
            </div>
          </div>
        )}


        {/* Error/Success Messages */}
        {errorMessage && (
          <div style={{ color: 'red', backgroundColor: '#ffe6e6', padding: '8px', borderRadius: '4px', marginBottom: '15px' }}>
            ⚠️ {errorMessage}
          </div>
        )}


        {successMessage && (
          <div style={{ color: 'green', backgroundColor: '#e6ffe6', padding: '8px', borderRadius: '4px', marginBottom: '15px' }}>
            ✅ {successMessage}
          </div>
        )}


        {/* College Start/End Time */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              College Start Time
            </label>
            <input
              type="time"
              value={collegeStartTime.replace(' AM', '').replace(' PM', '')}
              onChange={(e) => setCollegeStartTime(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              End Time
            </label>
            <input
              type="time"
              value={collegeEndTime.replace(' AM', '').replace(' PM', '')}
              onChange={(e) => setCollegeEndTime(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>


        {/* Time Slots Table */}
        <div style={{ marginBottom: '25px' }}>
          <h3>Slots</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Slots</th>
                <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>Start Time</th>
                <th style={{ border: '1px solid #dee2e6', padding: '10px' }}>End Time</th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #dee2e6', padding: '10px', textAlign: 'center' }}>
                    Slot {slot.slotNumber}
                  </td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #dee2e6', padding: '8px' }}>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                      style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Fixed Bookings Section */}
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h3>Book Fixed Slots</h3>


          <div style={{ display: 'flex', gap: '15px', alignItems: 'end', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Book Slot</label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value="">Select Slot</option>
                {timeSlots.map((slot) => (
                  <option key={slot.slotNumber} value={slot.slotNumber}>
                    Slot {slot.slotNumber}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>No. of Days</label>
              <input
                type="text"
                readOnly
                value="All days"
                style={{
                  width: '110px',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#e9ecef',
                  color: '#6c757d',
                  textAlign: 'center',
                  cursor: 'not-allowed'
                }}
              />
            </div>


            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Rename Slot</label>
              <input
                type="text"
                value={slotName}
                onChange={(e) => setSlotName(e.target.value)}
                placeholder="Recess"
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>


            <button
              onClick={addFixedBooking}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Book
            </button>
          </div>


          {/* Days Section - ONLY show All days, no other days */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="checkbox"
                checked={true}
                disabled
                readOnly
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>All days</span>
            </label>
          </div>
          <div style={{
            color: '#856404',
            backgroundColor: '#fff3cd',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            Selecting particular days is currently locked. Global booking applies to all days.
          </div>


          {/* Fixed Bookings List */}
          {fixedBookings.length > 0 && (
            <div>
              <h4>Current Fixed Bookings:</h4>
              {fixedBookings.map((booking, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'white',
                  padding: '8px 12px',
                  marginBottom: '5px',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6'
                }}>
                  <span>
                    <strong>Slot {booking.slotNumber}:</strong> {booking.slotName}
                    <small style={{ color: '#6c757d' }}> ({booking.days.join(', ')})</small>
                  </span>
                  <button
                    onClick={() => removeFixedBooking(booking.slotNumber)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveConfiguration}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};


export default TimeSlotModal;