import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimetableRestrictions = () => {
  const [activeTab, setActiveTab] = useState('time');
  const [restrictions, setRestrictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New restriction forms
  const [newTimeRestriction, setNewTimeRestriction] = useState({
    type: 'time-based',
    name: '',
    timeSlots: [],
    days: ['All days'],
    priority: 3,
    scope: 'global'
  });

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

  // Load restrictions on component mount
  useEffect(() => {
    fetchRestrictions();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

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

  const addTimeRestriction = async () => {
    try {
      if (!newTimeRestriction.name.trim()) {
        setError('Restriction name is required');
        return;
      }
      if (newTimeRestriction.timeSlots.length === 0) {
        setError('Please select at least one time slot');
        return;
      }

      await axios.post('http://localhost:5000/api/restrictions', newTimeRestriction);
      setMessage('Time-based restriction added successfully');
      setNewTimeRestriction({
        type: 'time-based',
        name: '',
        timeSlots: [],
        days: ['All days'],
        priority: 3,
        scope: 'global'
      });
      fetchRestrictions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add restriction');
    }
  };

  const addTeacherRestriction = async () => {
    try {
      if (!newTeacherRestriction.teacherName.trim()) {
        setError('Teacher name is required');
        return;
      }
      if (newTeacherRestriction.unavailableSlots.length === 0) {
        setError('Please select at least one unavailable slot');
        return;
      }

      await axios.post('http://localhost:5000/api/restrictions', newTeacherRestriction);
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

      await axios.post('http://localhost:5000/api/restrictions', newSubjectRestriction);
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
      } catch (err) {
        setError('Failed to remove restriction');
      }
    }
  };

  const handleTimeSlotToggle = (slotNumber, restrictionType) => {
    if (restrictionType === 'time') {
      setNewTimeRestriction(prev => ({
        ...prev,
        timeSlots: prev.timeSlots.includes(slotNumber)
          ? prev.timeSlots.filter(s => s !== slotNumber)
          : [...prev.timeSlots, slotNumber]
      }));
    } else if (restrictionType === 'teacher') {
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
    if (restrictionType === 'time') {
      setNewTimeRestriction(prev => ({
        ...prev,
        days: prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
      }));
    } else if (restrictionType === 'teacher') {
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
          ✅ {message}
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

      {/* TIME-BASED RESTRICTIONS */}
      {activeTab === 'time' && (
        <div>
          <h2 style={{ marginBottom: '24px' }}>⏰ Time-based Restrictions</h2>
          <p style={{ color: '#6c757d', marginBottom: '24px' }}>
            Block specific time slots for breaks, assemblies, or other fixed activities.
          </p>
          
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Add Time-based Restriction</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Restriction Name</label>
                <input
                  type="text"
                  value={newTimeRestriction.name}
                  onChange={(e) => setNewTimeRestriction(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Morning Recess, Lunch Break"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Priority (1-5)</label>
                <select
                  value={newTimeRestriction.priority}
                  onChange={(e) => setNewTimeRestriction(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value={1}>1 - Lowest</option>
                  <option value={2}>2 - Low</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4 - High</option>
                  <option value={5}>5 - Highest</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Time Slots to Block</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(slot => (
                  <label key={slot} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: newTimeRestriction.timeSlots.includes(slot) ? '#e3f2fd' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={newTimeRestriction.timeSlots.includes(slot)}
                      onChange={() => handleTimeSlotToggle(slot, 'time')}
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
                {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <label key={day} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: newTimeRestriction.days.includes(day) ? '#e3f2fd' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={newTimeRestriction.days.includes(day)}
                      onChange={() => handleDayToggle(day, 'time')}
                      style={{ marginRight: '5px' }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={addTimeRestriction}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              🚫 Add Time Restriction
            </button>
          </div>
        </div>
      )}

      {/* TEACHER-BASED RESTRICTIONS */}
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
                {['All days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
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

      {/* SUBJECT-BASED RESTRICTIONS */}
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
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
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

      {/* VIEW ALL RESTRICTIONS */}
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
                        {restriction.type === 'time-based' ? '⏰' : 
                         restriction.type === 'teacher-based' ? '👨‍🏫' : '📚'} 
                        {restriction.name || restriction.teacherName || restriction.subjectName}
                      </h4>
                      <div style={{ color: '#6c757d', fontSize: '14px' }}>
                        <div><strong>Type:</strong> {restriction.type.replace('-', ' ').toUpperCase()}</div>
                        <div><strong>Priority:</strong> {restriction.priority}/5</div>
                        {restriction.days && (
                          <div><strong>Days:</strong> {restriction.days.join(', ')}</div>
                        )}
                        {restriction.timeSlots && (
                          <div><strong>Time Slots:</strong> {restriction.timeSlots.join(', ')}</div>
                        )}
                        {restriction.unavailableSlots && (
                          <div><strong>Unavailable Slots:</strong> {restriction.unavailableSlots.join(', ')}</div>
                        )}
                        {restriction.reason && (
                          <div><strong>Reason:</strong> {restriction.reason}</div>
                        )}
                        {restriction.roomType && restriction.roomType !== 'any' && (
                          <div><strong>Room Type:</strong> {restriction.roomType}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRestriction(
                        restriction._id, 
                        restriction.name || restriction.teacherName || restriction.subjectName
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
    </div>
  );
};

export default TimetableRestrictions;
