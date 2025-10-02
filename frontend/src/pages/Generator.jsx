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
    restrictions: {
      global: [],
      yearWise: []
    },
    loading: false,
    error: '',
    success: ''
  });

  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [labScheduleData, setLabScheduleData] = useState(null);
  const [canGenerate, setCanGenerate] = useState(false);
  
  // ✅ NEW: Add state for lab requirement error
  const [labRequirementError, setLabRequirementError] = useState(null);

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

  // ✅ Generate divisions based on numberOfDivisions
  const generateDivisions = (numberOfDivisions, yearPrefix) => {
    const divisions = [];
    const divisionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    for (let i = 0; i < numberOfDivisions && i < divisionLetters.length; i++) {
      divisions.push(divisionLetters[i]);
    }
    
    return divisions;
  };

  // ✅ NEW: Fetch restrictions data
  const fetchRestrictions = async () => {
    try {
      console.log('Fetching restrictions for timetable generation...');
      const restrictionsRes = await axios.get('http://localhost:5000/api/generator/restrictions');
      
      console.log('Restrictions fetched:', restrictionsRes.data);
      
      return {
        global: restrictionsRes.data.global || [],
        yearWise: restrictionsRes.data.yearWise || []
      };
    } catch (error) {
      console.error('Error fetching restrictions:', error);
      return { global: [], yearWise: [] };
    }
  };

  // ✅ UPDATED: Fetch all data including restrictions
  const fetchInitialData = async () => {
    setConfig(prev => ({ ...prev, loading: true, error: '' }));
    
    try {
      // Get time slots and restrictions
      const [slotsResponse, restrictions] = await Promise.all([
        axios.get('http://localhost:5000/api/resources/timeslots'),
        fetchRestrictions()
      ]);
      
      // Get divisions for each year
      let seDivisions = [];
      let teDivisions = [];
      let beDivisions = [];

      try {
        const seResponse = await axios.get('http://localhost:5000/api/syllabus/SE');
        if (seResponse.data && seResponse.data.numDivisions) {
          seDivisions = generateDivisions(seResponse.data.numDivisions, 'SE');
        }
      } catch (seError) {
        console.log('SE syllabus not configured yet');
      }

      try {
        const teResponse = await axios.get('http://localhost:5000/api/syllabus/TE');
        if (teResponse.data && teResponse.data.numDivisions) {
          teDivisions = generateDivisions(teResponse.data.numDivisions, 'TE');
        }
      } catch (teError) {
        console.log('TE syllabus not configured yet');
      }

      try {
        const beResponse = await axios.get('http://localhost:5000/api/syllabus/BE');
        if (beResponse.data && beResponse.data.numDivisions) {
          beDivisions = generateDivisions(beResponse.data.numDivisions, 'BE');
        }
      } catch (beError) {
        console.log('BE syllabus not configured yet');
      }

      // Handle slots data
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
        restrictions: restrictions,
        loading: false,
        error: (seDivisions.length === 0 && teDivisions.length === 0) ? 
          'Please configure SE and TE syllabus first in the Syllabus tab.' : ''
      }));

      console.log('✅ Complete data loaded:', {
        SE: seDivisions,
        TE: teDivisions,
        BE: beDivisions,
        slotsCount: slotsData.length,
        globalRestrictions: restrictions.global.length,
        yearWiseRestrictions: restrictions.yearWise.length
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

  // ✅ COMPLETELY UPDATED: Generate timetable with lab requirement error handling
  const generateTimetable = async () => {
    setConfig(prev => ({ ...prev, loading: true, error: '', success: '' }));
    setLabRequirementError(null); // Clear previous lab errors
    setGeneratedTimetable(null); // Clear previous timetable
    setLabScheduleData(null); // Clear previous lab data

    try {
      // Build included years
      let includedYears = ['SE', 'TE'];
      if (config.includeBE && config.divisions.BE.length > 0) {
        includedYears.push('BE');
      }

      console.log('Generating timetable for years:', includedYears);

      // ✅ Call the enhanced timetable generation API (includes lab requirement check)
      const response = await axios.post('http://localhost:5000/api/generator/generate-timetable', {
        includedYears: includedYears,
        includeBE: config.includeBE
      });

      const result = response.data;

      // ✅ Handle lab requirement error BEFORE displaying timetable
      if (!response.status === 200 && result.error === 'INSUFFICIENT_LAB_CAPACITY') {
        // Show lab requirement error to user - STOP HERE
        setLabRequirementError({
          type: 'LAB_CAPACITY_ERROR',
          title: 'Additional Labs Required',
          message: result.labRequirementError.message,
          details: `Current Labs: ${result.labRequirementError.currentLabs}, Required: ${result.labRequirementError.minimumRequired}`,
          recommendation: result.labRequirementError.recommendation,
          additionalLabsNeeded: result.labRequirementError.additionalLabsNeeded,
          currentLabs: result.labRequirementError.currentLabs,
          minimumRequired: result.labRequirementError.minimumRequired
        });
        
        // Don't display timetable - user needs to fix lab capacity first
        setGeneratedTimetable(null);
        setLabScheduleData(null);
        
        setConfig(prev => ({
          ...prev,
          loading: false,
          error: '', // Don't show generic error - we have specific lab error
          success: ''
        }));
        
        return; // STOP processing here
      }

      // ✅ Normal success case - only reached if labs are sufficient
      if (result.success) {
        setGeneratedTimetable(result.timetable);
        
        // NEW: Set lab schedule data
        if (result.lab_schedule) {
          setLabScheduleData(result.lab_schedule);
          console.log('🔬 Lab schedule received:', result.lab_schedule.metrics);
        }
        
        // Enhanced success message
        let successMessage = `Timetable generated successfully! Applied ${result.restrictionsApplied} restrictions across ${result.divisionsCount} divisions.`;
        
        if (result.lab_schedule?.success) {
          successMessage += ` 🔬 Lab scheduling: ${result.lab_schedule.metrics.total_sessions_scheduled} sessions scheduled.`;
        } else if (result.lab_schedule?.error) {
          successMessage += ` ⚠️ Lab scheduling had issues: ${result.lab_schedule.error}`;
        }

        setConfig(prev => ({
          ...prev,
          success: successMessage,
          loading: false,
          error: ''
        }));
      } else {
        throw new Error('Timetable generation failed');
      }

    } catch (error) {
      console.error('Error generating timetable:', error);
      
      // ✅ Handle different types of errors
      if (error.response?.status === 400 && error.response?.data?.error === 'INSUFFICIENT_LAB_CAPACITY') {
        // Lab capacity error from server
        const labError = error.response.data.labRequirementError;
        setLabRequirementError({
          type: 'LAB_CAPACITY_ERROR',
          title: 'Additional Labs Required',
          message: labError.message,
          details: `Current Labs: ${labError.currentLabs}, Required: ${labError.minimumRequired}`,
          recommendation: labError.recommendation,
          additionalLabsNeeded: labError.additionalLabsNeeded,
          currentLabs: labError.currentLabs,
          minimumRequired: labError.minimumRequired
        });
        
        setConfig(prev => ({
          ...prev,
          loading: false,
          error: '', // Don't show generic error
          success: ''
        }));
      } else {
        // Generic error
        setConfig(prev => ({
          ...prev,
          error: error.response?.data?.error || 'Failed to generate timetable structure.',
          loading: false,
          success: ''
        }));
      }
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
          Generate comprehensive timetables with restrictions for SE and TE (BE optional)
        </p>
      </div>

      {/* ✅ NEW: Lab Requirement Error Display */}
      {labRequirementError && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          border: '2px solid #fca5a5',
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>🚨</span>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
              {labRequirementError.title}
            </h3>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', color: '#991b1b', margin: '0 0 8px 0' }}>
              {labRequirementError.message}
            </p>
            <p style={{ fontSize: '14px', color: '#7f1d1d', margin: '0' }}>
              {labRequirementError.details}
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: '#fef2f2', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>
              📋 What you need to do:
            </div>
            <div style={{ fontSize: '14px', color: '#991b1b', marginBottom: '12px' }}>
              {labRequirementError.recommendation}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#dc2626' }}>Current Labs</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#991b1b' }}>{labRequirementError.currentLabs}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#16a34a' }}>Required Labs</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#15803d' }}>{labRequirementError.minimumRequired}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#d97706' }}>Labs to Add</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c' }}>+{labRequirementError.additionalLabsNeeded}</div>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* NEW: Restrictions Info */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>
            Configured Restrictions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            
            {/* Global Restrictions */}
            <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
              <div style={{ fontWeight: '600', color: '#856404', marginBottom: '4px' }}>
                🌐 Global Restrictions (Priority 1)
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Count: {config.restrictions.global.length}
              </div>
              {config.restrictions.global.length > 0 && (
                <div style={{ fontSize: '12px', color: '#495057', marginTop: '4px' }}>
                  {config.restrictions.global.map(r => r.activityName).join(', ')}
                </div>
              )}
            </div>

            {/* Year-wise Restrictions */}
            <div style={{ padding: '12px', backgroundColor: '#d1ecf1', borderRadius: '8px', border: '1px solid #bee5eb' }}>
              <div style={{ fontWeight: '600', color: '#0c5460', marginBottom: '4px' }}>
                🎓 Year-wise Restrictions (Priority 2)
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Count: {config.restrictions.yearWise.length}
              </div>
              {config.restrictions.yearWise.length > 0 && (
                <div style={{ fontSize: '12px', color: '#495057', marginTop: '4px' }}>
                  {config.restrictions.yearWise.map(r => `${r.activityName} (${r.academicYear})`).join(', ')}
                </div>
              )}
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
        {canGenerate && !labRequirementError && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#e6ffe6', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #ccffcc'
          }}>
            <div style={{ fontWeight: '600', color: '#16a34a', marginBottom: '8px' }}>
              Ready to Generate Timetable with Lab Integration
            </div>
            <div style={{ fontSize: '14px', color: '#166534' }}>
              Years: SE ({config.divisions.SE.length} divisions) + TE ({config.divisions.TE.length} divisions)
              {config.includeBE && config.divisions.BE.length > 0 && 
                ` + BE (${config.divisions.BE.length} divisions)`
              }
              <br />
              Restrictions: {config.restrictions.global.length} global + {config.restrictions.yearWise.length} year-wise
              <br />
              🔬 Lab Scheduling: Auto-enabled (assigns labs to batches simultaneously)
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
          {config.loading ? '🔄 Generating...' : '🎯 Generate Timetable with Labs'}
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
              <li>Add global and year-wise bookings as needed</li>
              <li>Assign teachers to subjects in Lecture and Lab tabs</li>
              <li>Add sufficient LAB resources for lab scheduling</li>
            </ul>
          </div>
        )}
      </div>

      {/* Generated Timetable Display with Lab Integration */}
      {generatedTimetable && !labRequirementError && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#333' }}>
            Generated Timetable Structure with Lab Assignments
          </h2>
          <TimetableGrid 
            timetableData={generatedTimetable} 
            labScheduleData={labScheduleData} 
          />
        </div>
      )}
    </div>
  );
};

export default Generator;
