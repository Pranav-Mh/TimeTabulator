import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimetableView = () => {
  const [timetable, setTimetable] = useState({});
  const [fixedBookings, setFixedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetableAndBookings();
  }, []);

  const fetchTimetableAndBookings = async () => {
    try {
      // Fetch timetable
      const timetableResponse = await axios.get('/api/timetable/current');
      setTimetable(timetableResponse.data);
      
      // Fetch fixed bookings
      const configResponse = await axios.get('/api/resources/timeslots');
      setFixedBookings(configResponse.data.fixedBookings || []);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching timetable:', err);
      setLoading(false);
    }
  };

  const isSlotBlocked = (slotNumber, day) => {
    return fixedBookings.some(booking => 
      booking.slotNumber === slotNumber &&
      (booking.days.includes('All days') || booking.days.includes(day))
    );
  };

  const getFixedBookingName = (slotNumber, day) => {
    const booking = fixedBookings.find(booking => 
      booking.slotNumber === slotNumber &&
      (booking.days.includes('All days') || booking.days.includes(day))
    );
    return booking ? booking.slotName : '';
  };

  if (loading) return <div>Loading timetable...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>📅 Weekly Timetable</h1>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
            <th style={{ padding: '15px', border: '1px solid #ddd' }}>Time</th>
            <th style={{ padding: '15px', border: '1px solid #ddd' }}>Monday</th>
            <th style={{ padding: '15px', border: '1px solid #ddd' }}>Tuesday</th>
            <th style={{ padding: '15px', border: '1px solid #ddd' }}>Wednesday</th>
            <th style={{ padding: '15px', border: '1px solid #ddd' }}>Thursday</th>
            <th style={{ padding: '15px', border: '1px solid #ddd' }}>Friday</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, index) => index + 1).map(slotNumber => (
            <tr key={slotNumber}>
              <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                Slot {slotNumber}
              </td>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                <td key={day} style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {isSlotBlocked(slotNumber, day) ? (
                    <div style={{
                      backgroundColor: '#ffe6e6',
                      color: '#d63384',
                      padding: '8px',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      🔒 {getFixedBookingName(slotNumber, day)}
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#e6ffe6',
                      color: '#155724',
                      padding: '8px',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      📚 Mathematics<br />
                      <small>Prof. Smith - CL101</small>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#e6ffe6' }}></div>
          <span>Regular Classes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', backgroundColor: '#ffe6e6' }}></div>
          <span>Fixed Bookings (No Classes)</span>
        </div>
      </div>
    </div>
  );
};

export default TimetableView;
