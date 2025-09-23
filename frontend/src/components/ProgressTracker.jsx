import React from 'react';

const ProgressTracker = ({ progress, currentPhase, loading }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      {/* Progress Title */}
      <h4 style={{ 
        marginBottom: '16px', 
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        {loading && (
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #f0f0f0',
            borderTop: '2px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        )}
        Generating Master Timetable...
      </h4>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '12px',
        backgroundColor: '#f0f0f0',
        borderRadius: '6px',
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: progress < 50 ? '#ff9800' : progress < 90 ? '#2196f3' : '#4caf50',
          borderRadius: '6px',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}>
          {/* Animated stripes for active progress */}
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
              backgroundSize: '20px 20px',
              animation: 'move 1s linear infinite'
            }}></div>
          )}
        </div>
      </div>

      {/* Progress Percentage */}
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1976d2',
        marginBottom: '8px'
      }}>
        {Math.round(progress)}%
      </div>

      {/* Current Phase */}
      <div style={{
        fontSize: '14px',
        color: '#6c757d',
        marginBottom: '16px'
      }}>
        {currentPhase}
      </div>

      {/* Generation Phases */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginTop: '20px'
      }}>
        {[
          { phase: 'Data Validation', progress: progress >= 10 },
          { phase: 'Time Matrix Creation', progress: progress >= 25 },
          { phase: 'Applying Restrictions', progress: progress >= 40 },
          { phase: 'Lab Scheduling', progress: progress >= 65 },
          { phase: 'Lecture Scheduling', progress: progress >= 80 },
          { phase: 'Optimization', progress: progress >= 95 }
        ].map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: item.progress ? '#e8f5e8' : '#f8f9fa',
            borderRadius: '6px',
            border: `1px solid ${item.progress ? '#4caf50' : '#ddd'}`
          }}>
            <span style={{ marginRight: '8px', fontSize: '16px' }}>
              {item.progress ? '✅' : '⏳'}
            </span>
            <span style={{ 
              fontSize: '13px',
              color: item.progress ? '#2e7d32' : '#6c757d'
            }}>
              {item.phase}
            </span>
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes move {
          0% { background-position: 0 0; }
          100% { background-position: 20px 20px; }
        }
      `}</style>
    </div>
  );
};

export default ProgressTracker;
