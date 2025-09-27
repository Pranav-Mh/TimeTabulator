import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TimetableGrid from '../components/TimetableGrid';

const Generator = () => {
  const [config, setConfig] = useState({
    includeBE: false,
    divisions: {
      SE: [],
      TE: [],
      BE: []
    },
    slots: [],
    loading: false,
    error: '',
    success: ''
  });

  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [canGenerate, setCanGenerate] = useState(false);

  // ✅ Fetch all required data on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // ✅ Check if generation is possible
  useEffect(() => {
    const hasSeAndTe = config.divisions.SE.length > 0 && config.divisions.TE.length > 0;
    const hasSlots = config.slots.length > 0;
    setCanGenerate(hasSeAndTe && hasSlots);
  }, [config.divisions, config.slots]);

  // ✅ FIXED: Generate divisions based on numberOfDivisions
  const generateDivisions = (numberOfDivisions, yearPrefix) => {
    const divisions = [];
    const divisionLetters = ['A', 'B', 'C', 'D', 'E', 'F']; // Support up to 6 divisions
    
    for (let i = 0; i < numberOfDivisions && i < divisionLetters.length; i++) {
      divisions.push(divisionLetters[i]);
    }
    
    return divisions;
  };

  // ✅ COMPLETELY FIXED: Use the correct endpoints and handle responses properly
  const fetchInitialData = async () => {
    setConfig(prev => ({ ...prev, loading: true, error: '' }));
    
    try {
      // ✅ Get time slots first (this is working fine)
      const slotsResponse = await axios.get('http://localhost:5000/api/resources/timeslots');
      
      // ✅ FIXED: Use the MongoDB data directly - check your database first
      let seDivisions = [];
      let teDivisions = [];
      let beDivisions = [];

      try {
        // FIXED: Use the new endpoint structure based on your database
        const seResponse = await axios.get('http://localhost:5000/api/syllabus/SE');
        if (seResponse.data && seResponse.data.numDivisions) {
          console.log('SE syllabus found:', seResponse.data);
          seDivisions = generateDivisions(seResponse.data.numDivisions, 'SE');
        }
      } catch (seError) {
        console.log('SE syllabus not configured yet');
      }

      try {
        // FIXED: Use the new endpoint structure based on your database  
        const teResponse = await axios.get('http://localhost:5000/api/syllabus/TE');
        if (teResponse.data && teResponse.data.numDivisions) {
          console.log('TE syllabus found:', teResponse.data);
          teDivisions = generateDivisions(teResponse.data.numDivisions, 'TE');
        }
      } catch (teError) {
        console.log('TE syllabus not configured yet');
      }

      try {
        // FIXED: Use the new endpoint structure based on your database
        const beResponse = await axios.get('http://localhost:5000/api/syllabus/BE');
        if (beResponse.data && beResponse.data.numDivisions) {
          console.log('BE syllabus found:', beResponse.data);
          beDivisions = generateDivisions(beResponse.data.numDivisions, 'BE');
        }
      } catch (beError) {
        console.log('BE syllabus not configured yet');
      }

      // ✅ FIXED: Handle slots data properly
      let slotsData = [];
      if (slotsResponse.data) {
        if (slotsResponse.data.timeSlots) {
          slotsData = slotsResponse.data.timeSlots;
        } else if (Array.isArray(slotsResponse.data)) {
          slotsData = slotsResponse.data;
        }
      }

      setConfig(prev => ({
        ...prev,
        divisions: {
          SE: seDivisions,
          TE: teDivisions,
          BE: beDivisions
        },
        slots: slotsData,
        loading: false,
        error: (seDivisions.length === 0 && teDivisions.length === 0) ? 
          'Please configure SE and TE syllabus first in the Syllabus tab.' : ''
      }));

      console.log('✅ Final parsed divisions:', {
        SE: seDivisions,
        TE: teDivisions,
        BE: beDivisions,
        slotsCount: slotsData.length
      });

    } catch (error) {
      console.error('Error fetching initial data:', error);
      setConfig(prev => ({
        ...prev,
        error: 'Failed to load configuration data. Please check if the server is running and try again.',
        loading: false
      }));
    }
  };

  // ✅ Handle BE checkbox change
  const handleBEToggle = (e) => {
    setConfig(prev => ({
      ...prev,
      includeBE: e.target.checked
    }));
  };

  // ✅ Generate basic timetable structure
  const generateTimetable = async () => {
    setConfig(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      // Build division list based on selections
      let activeDivisions = [
        ...config.divisions.SE.map(div => `SE-${div}`),
        ...config.divisions.TE.map(div => `TE-${div}`)
      ];

      if (config.includeBE && config.divisions.BE.length > 0) {
        activeDivisions.push(...config.divisions.BE.map(div => `BE-${div}`));
      }

      // Create basic timetable structure
      const timetableData = {
        divisions: activeDivisions,
        slots: config.slots,
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        generatedAt: new Date().toISOString()
      };

      // For now, we're just creating the basic structure
      setGeneratedTimetable(timetableData);
      setConfig(prev => ({
        ...prev,
        success: 'Timetable structure generated successfully!',
        loading: false
      }));

    } catch (error) {
      console.error('Error generating timetable:', error);
      setConfig(prev => ({
        ...prev,
        error: 'Failed to generate timetable structure.',
        loading: false
      }));
    }
  };

  // ✅ Add refresh button to reload data
  const refreshData = () => {
    fetchInitialData();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          textAlign: 'center',
          marginBottom: '8px',
          color: '#333'
        }}>
          Timetable Generator
        </h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
          Generate comprehensive timetables for SE and TE (BE optional)
        </p>
      </div>

      {/* Error/Success Messages */}
      {config.error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #ffcccc'
        }}>
          ⚠️ {config.error}
        </div>
      )}
      
      {config.success && (
        <div style={{ 
          color: 'green', 
          backgroundColor: '#e6ffe6', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #ccffcc'
        }}>
          ✅ {config.success}
        </div>
      )}

      {/* Configuration Panel */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', color: '#333', margin: 0 }}>
            Generation Configuration
          </h2>
          <button
            onClick={refreshData}
            disabled={config.loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {config.loading ? '🔄' : '↻ Refresh Data'}
          </button>
        </div>

        {/* Academic Years Info */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>
            Academic Years & Divisions
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* SE Info */}
            <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: '#2563eb', marginBottom: '4px' }}>
                Second Year (SE) ✅ Mandatory
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Divisions: {config.divisions.SE.length > 0 ? 
                  config.divisions.SE.map(div => `SE-${div}`).join(', ') : 
                  'Not configured'
                }
              </div>
            </div>

            {/* TE Info */}
            <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: '#2563eb', marginBottom: '4px' }}>
                Third Year (TE) ✅ Mandatory
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Divisions: {config.divisions.TE.length > 0 ? 
                  config.divisions.TE.map(div => `TE-${div}`).join(', ') : 
                  'Not configured'
                }
              </div>
            </div>

            {/* BE Info */}
            <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontWeight: '600', color: '#7c2d12', marginBottom: '4px' }}>
                Fourth Year (BE) ⚙️ Optional
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                Divisions: {config.divisions.BE.length > 0 ? 
                  config.divisions.BE.map(div => `BE-${div}`).join(', ') : 
                  'Not configured'
                }
              </div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.includeBE}
                  onChange={handleBEToggle}
                  disabled={config.divisions.BE.length === 0}
                  style={{ marginRight: '8px' }}
                />
                Include Fourth Year (BE) in generation
                {config.divisions.BE.length === 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>(Not available)</span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Slots Info */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>
            Time Slots Configuration
          </h3>
          <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Total Slots: {config.slots.length} | 
              Available: {config.slots.filter(slot => !slot.isBooked).length} | 
              Blocked: {config.slots.filter(slot => slot.isBooked).length}
            </div>
            {config.slots.length === 0 && (
              <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                No time slots configured. Please configure time slots in Restrictions tab.
              </div>
            )}
          </div>
        </div>

        {/* Generation Summary */}
        {canGenerate && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#e6ffe6', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #ccffcc'
          }}>
            <div style={{ fontWeight: '600', color: '#16a34a', marginBottom: '8px' }}>
              Ready to Generate Timetable
            </div>
            <div style={{ fontSize: '14px', color: '#166534' }}>
              Years: SE ({config.divisions.SE.length} divisions) + TE ({config.divisions.TE.length} divisions)
              {config.includeBE && config.divisions.BE.length > 0 && 
                ` + BE (${config.divisions.BE.length} divisions)`
              }
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={generateTimetable}
          disabled={!canGenerate || config.loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            backgroundColor: canGenerate ? '#2563eb' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          {config.loading ? '🔄 Generating...' : '🎯 Generate Timetable Structure'}
        </button>

        {/* Help Text */}
        {!canGenerate && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '14px', 
            color: '#666',
            backgroundColor: '#f8f9fa',
            padding: '12px',
            borderRadius: '6px'
          }}>
            <strong>To generate timetable:</strong>
            <ul style={{ marginTop: '8px', marginLeft: '16px' }}>
              <li>Configure SE and TE syllabus in Syllabus tab</li>
              <li>Configure time slots in Restrictions tab</li>
              <li>Assign teachers to subjects in Lecture and Lab tabs</li>
            </ul>
          </div>
        )}
      </div>

      {/* Generated Timetable Display */}
      {generatedTimetable && (
        <TimetableGrid timetableData={generatedTimetable} />
      )}
    </div>
  );
};

export default Generator;
