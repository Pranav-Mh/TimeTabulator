import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TimetableRestrictions = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('time');
  
  const [newRestriction, setNewRestriction] = useState({
    restrictionName: '',
    type: 'time',
    scope: 'global',
    affectedYears: [],
    startTime: '',
    endTime: '',
    days: [],
    teacherName: '',
    unavailableSlots: [],
    subjectName: '',
    blockedDays: [],
    priority: 3,
    description: ''
  });

  // Fetch restrictions
  const fetchRestrictions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/restrictions');
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching restrictions:', err);
      setError('Failed to fetch restrictions');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestrictions();
  }, []);

  // Clear messages
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Reset form when switching tabs
  const switchTab = (type) => {
    setActiveTab(type);
    setNewRestriction(prev => ({
      ...prev,
      type,
      restrictionName: '',
      startTime: '',
      endTime: '',
      days: [],
      teacherName: '',
      unavailableSlots: [],
      subjectName: '',
      blockedDays: []
    }));
  };

  // Add restriction
  const addRestriction = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/restrictions', newRestriction);
      setSuccessMessage(response.data.message);
      setShowForm(false);
      fetchRestrictions();
      
      // Reset form
      setNewRestriction({
        restrictionName: '',
        type: activeTab,
        scope: 'global',
        affectedYears: [],
        startTime: '',
        endTime: '',
        days: [],
        teacherName: '',
        unavailableSlots: [],
        subjectName: '',
        blockedDays: [],
        priority: 3,
        description: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add restriction');
    }
  };

  // Remove restriction
  const removeRestriction = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/restrictions/${id}`);
        setSuccessMessage(response.data.message);
        fetchRestrictions();
      } catch (err) {
        setError('Failed to remove restriction');
      }
    }
  };

  const handleDayToggle = (day) => {
    setNewRestriction(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleYearToggle = (year) => {
    setNewRestriction(prev => ({
      ...prev,
      affectedYears: prev.affectedYears.includes(year)
        ? prev.affectedYears.filter(y => y !== year)
        : [...prev.affectedYears, year]
    }));
  };

  const handleBlockedDayToggle = (day) => {
    setNewRestriction(prev => ({
      ...prev,
      blockedDays: prev.blockedDays.includes(day) 
        ? prev.blockedDays.filter(d => d !== day)
        : [...prev.blockedDays, day]
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🚫 Timetable Restrictions</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#6c757d' }}>🔄 Loading...</div>
        </div>
      </div>
    );
  }

  const currentRestrictions = data.grouped?.[activeTab] || [];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          🚫 Smart Timetable Restrictions Manager
        </h1>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Configure intelligent restrictions for automated timetable generation
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
      
      {successMessage && (
        <div style={{ 
          color: '#2e7d32', 
          backgroundColor: '#e8f5e8', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          ✅ {successMessage}
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
          { id: 'time', label: 'Time-Based', icon: '🕐' },
          { id: 'teacher', label: 'Teacher-Based', icon: '👨‍🏫' },
          { id: 'subject', label: 'Subject-Based', icon: '📚' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
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
            {tab.icon} {tab.label} ({data.counts?.[tab.id] || 0})
          </button>
        ))}
      </div>

      {/* Add Button */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => {
            setNewRestriction(prev => ({ ...prev, type: activeTab }));
            setShowForm(!showForm);
          }}
          style={{
            backgroundColor: showForm ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showForm ? '❌ Cancel' : `➕ Add ${activeTab} Restriction`}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '30px',
          borderRadius: '12px',
          border: '1px solid #dee2e6',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '24px', color: '#495057' }}>
            ➕ Add New {activeTab} Restriction
          </h3>
          
          {/* Basic Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Restriction Name *
              </label>
              <input
                type="text"
                value={newRestriction.restrictionName}
                onChange={(e) => setNewRestriction(prev => ({ ...prev, restrictionName: e.target.value }))}
                placeholder={
                  activeTab === 'time' ? 'e.g., Morning Recess, Lunch Break' :
                  activeTab === 'teacher' ? 'e.g., Prof. Smith Unavailable' :
                  'e.g., Physics Lab Restriction'
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Scope *
              </label>
              <select
                value={newRestriction.scope}
                onChange={(e) => setNewRestriction(prev => ({ ...prev, scope: e.target.value, affectedYears: [] }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="global">🌐 Global (All Years)</option>
                <option value="year-specific">🎯 Year-Specific</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Priority
              </label>
              <select
                value={newRestriction.priority}
                onChange={(e) => setNewRestriction(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value={1}>1 - Low Priority</option>
                <option value={2}>2 - Low-Medium</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - High</option>
                <option value={5}>5 - Critical</option>
              </select>
            </div>
          </div>

          {/* Year Selection for year-specific */}
          {newRestriction.scope === 'year-specific' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#495057' }}>
                Affected Years *
              </label>
              <div style={{ 
                display: 'flex',
                gap: '16px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '2px solid #e9ecef'
              }}>
                {['2nd Year', '3rd Year', '4th Year'].map(year => (
                  <label key={year} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: newRestriction.affectedYears.includes(year) ? '#fff3cd' : 'transparent'
                  }}>
                    <input
                      type="checkbox"
                      checked={newRestriction.affectedYears.includes(year)}
                      onChange={() => handleYearToggle(year)}
                      style={{ marginRight: '8px' }}
                    />
                    {year}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TIME-BASED FIELDS */}
          {activeTab === 'time' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    Start Time *
                  </label>
                  <input
                    type="text"
                    value={newRestriction.startTime}
                    onChange={(e) => setNewRestriction(prev => ({ ...prev, startTime: e.target.value }))}
                    placeholder="09:00 AM"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                    End Time *
                  </label>
                  <input
                    type="text"
                    value={newRestriction.endTime}
                    onChange={(e) => setNewRestriction(prev => ({ ...prev, endTime: e.target.value }))}
                    placeholder="10:00 AM"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#495057' }}>
                  Days *
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
                      backgroundColor: newRestriction.days.includes(day) ? '#e3f2fd' : 'transparent'
                    }}>
                      <input
                        type="checkbox"
                        checked={newRestriction.days.includes(day)}
                        onChange={() => handleDayToggle(day)}
                        style={{ marginRight: '8px' }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TEACHER-BASED FIELDS */}
          {activeTab === 'teacher' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Teacher Name *
              </label>
              <input
                type="text"
                value={newRestriction.teacherName}
                onChange={(e) => setNewRestriction(prev => ({ ...prev, teacherName: e.target.value }))}
                placeholder="Prof. John Smith"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          )}

          {/* SUBJECT-BASED FIELDS */}
          {activeTab === 'subject' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={newRestriction.subjectName}
                  onChange={(e) => setNewRestriction(prev => ({ ...prev, subjectName: e.target.value }))}
                  placeholder="Physics, Mathematics, etc."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#495057' }}>
                  Blocked Days (Subject cannot be scheduled on these days)
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
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <label key={day} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: newRestriction.blockedDays.includes(day) ? '#ffebee' : 'transparent'
                    }}>
                      <input
                        type="checkbox"
                        checked={newRestriction.blockedDays.includes(day)}
                        onChange={() => handleBlockedDayToggle(day)}
                        style={{ marginRight: '8px' }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
              Description (Optional)
            </label>
            <textarea
              value={newRestriction.description}
              onChange={(e) => setNewRestriction(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional notes about this restriction..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Add Button */}
          <button
            onClick={addRestriction}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ➕ Add {activeTab} Restriction
          </button>
        </div>
      )}

      {/* Current Restrictions Display */}
      <div>
        <h2 style={{ marginBottom: '20px', color: '#495057' }}>
          📋 Current {activeTab} Restrictions ({currentRestrictions.length})
        </h2>
        
        {currentRestrictions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {activeTab === 'time' ? '🕐' : activeTab === 'teacher' ? '👨‍🏫' : '📚'}
            </div>
            <p style={{ color: '#6c757d', fontSize: '18px', margin: '0 0 8px 0' }}>
              No {activeTab} restrictions configured yet
            </p>
            <p style={{ color: '#6c757d', fontSize: '14px', margin: '0' }}>
              Add restrictions to control timetable generation
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentRestrictions.map((restriction) => (
              <div key={restriction._id} style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeTab === 'time' ? '🕐' : activeTab === 'teacher' ? '👨‍🏫' : '📚'} 
                      {restriction.restrictionName}
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '14px', marginBottom: '12px' }}>
                      <span style={{
                        backgroundColor: restriction.scope === 'global' ? '#e3f2fd' : '#fff3cd',
                        color: restriction.scope === 'global' ? '#1976d2' : '#f57c00',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {restriction.scope === 'global' ? 'GLOBAL' : 'YEAR-SPECIFIC'}
                      </span>
                      
                      <span style={{
                        backgroundColor: 
                          restriction.priority <= 2 ? '#6c757d' :
                          restriction.priority === 3 ? '#ffc107' :
                          restriction.priority === 4 ? '#fd7e14' : '#dc3545',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        PRIORITY {restriction.priority}
                      </span>
                    </div>

                    {/* Type-specific details */}
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                      {activeTab === 'time' && (
                        <div>
                          <strong>Time:</strong> {restriction.startTime} - {restriction.endTime} | 
                          <strong> Days:</strong> {restriction.days?.join(', ') || 'None'}
                        </div>
                      )}
                      
                      {activeTab === 'teacher' && (
                        <div>
                          <strong>Teacher:</strong> {restriction.teacherName}
                          {restriction.unavailableSlots?.length > 0 && (
                            <span> | <strong>Unavailable Slots:</strong> {restriction.unavailableSlots.length}</span>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'subject' && (
                        <div>
                          <strong>Subject:</strong> {restriction.subjectName}
                          {restriction.blockedDays?.length > 0 && (
                            <span> | <strong>Blocked Days:</strong> {restriction.blockedDays.join(', ')}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      <strong>Affects:</strong> {
                        restriction.scope === 'global' 
                          ? 'All Years' 
                          : restriction.affectedYears?.join(', ') || 'None'
                      }
                      {restriction.description && (
                        <>
                          {' | '}<strong>Note:</strong> {restriction.description}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeRestriction(restriction._id, restriction.restrictionName)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginLeft: '16px'
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableRestrictions;
