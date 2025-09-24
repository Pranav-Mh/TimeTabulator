import React from 'react';

const ProgressTracker = ({ status, progress }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'generating': return '#2196f3';
      case 'completed': return '#4caf50';
      case 'failed': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating': return 'Generating timetable...';
      case 'completed': return 'Generation completed!';
      case 'failed': return 'Generation failed';
      default: return 'Unknown status';
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>
        Generation Progress
      </h3>
      
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '10px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: getStatusColor(),
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <div style={{
        textAlign: 'center',
        color: getStatusColor(),
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
      }}>
        {status === 'generating' && (
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e0e0e0',
            borderTop: '2px solid #2196f3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
        {getStatusText()} ({progress}%)
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProgressTracker;
