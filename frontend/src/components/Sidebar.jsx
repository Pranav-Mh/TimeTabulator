import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';

const menuItems = [
  { label: "Dashboard", path: "/dashboard", alwaysEnabled: true },
  { label: "Syllabus", path: "/syllabus", alwaysEnabled: true },
  { label: "Teacher", path: "/teachers", alwaysEnabled: true },
  { label: "Lecture", path: "/lecture", requiredAccess: 'canAccessLecture' },
  { label: "Lab", path: "/lab", requiredAccess: 'canAccessLab' },
  { label: "Configure Resources", path: "/configure-resources", requiredAccess: 'canAccessResources' },
  { label: "🚫 Restrictions", path: "/restrictions", alwaysEnabled: true }, // ✅ YOUR ADDITION WITH ACCESS CONTROL
  { label: "Generator", path: "/generator", requiredAccess: 'canAccessGenerator' },
];

const Sidebar = () => {
  const location = useLocation();
  const [navigationStatus, setNavigationStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNavigationStatus();
  }, [location.pathname]);

  const fetchNavigationStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/navigation/status');
      setNavigationStatus(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching navigation status:', err);
      setLoading(false);
    }
  };

  const isItemEnabled = (item) => {
    if (item.alwaysEnabled) return true;
    if (!item.requiredAccess) return true;
    return navigationStatus[item.requiredAccess] || false;
  };

  const getItemTooltip = (item) => {
    if (isItemEnabled(item)) return '';
    
    const tooltips = {
      'canAccessLecture': 'Complete SE and TE syllabus first',
      'canAccessLab': 'Complete lecture assignments first',
      'canAccessResources': 'Complete lab assignments first',
      'canAccessGenerator': 'Configure resources first'
    };
    
    return tooltips[item.requiredAccess] || 'Complete previous steps to unlock';
  };

  const getProgressPercentage = () => {
    let progress = 0;
    if (navigationStatus.hasTeachers) progress += 15;
    if (navigationStatus.syllabusCompleted) progress += 25;
    if (navigationStatus.lectureAssignmentsCompleted) progress += 25;
    if (navigationStatus.labAssignmentsCompleted) progress += 20;
    if (navigationStatus.resourcesConfigured) progress += 10;
    if (navigationStatus.canAccessGenerator) progress += 5;
    return progress;
  };

  if (loading) {
    return (
      <aside style={{ width: '250px', padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ color: '#6c757d' }}>Loading navigation...</div>
      </aside>
    );
  }

  return (
    <aside style={{ 
      width: '250px', 
      padding: '20px', 
      backgroundColor: '#f8f9fa', 
      minHeight: '100vh',
      borderRight: '1px solid #dee2e6'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h2 style={{ color: '#495057', margin: '0 0 10px 0' }}>TimeTabulator</h2>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ 
            backgroundColor: '#e9ecef', 
            borderRadius: '10px', 
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#28a745',
              height: '100%',
              width: `${getProgressPercentage()}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <small style={{ color: '#6c757d', fontSize: '12px' }}>
            Progress: {getProgressPercentage()}%
          </small>
        </div>

        {/* Current Step Indicator */}
        {navigationStatus.currentStep && (
          <div style={{
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            padding: '5px 10px',
            borderRadius: '15px',
            fontSize: '12px',
            display: 'inline-block'
          }}>
            Current: {navigationStatus.currentStep.charAt(0).toUpperCase() + navigationStatus.currentStep.slice(1)}
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav>
        {menuItems.map((item) => {
          const enabled = isItemEnabled(item);
          const isActive = location.pathname === item.path;
          const tooltip = getItemTooltip(item);

          return (
            <div key={item.label} style={{ position: 'relative', marginBottom: '5px' }}>
              <Link
                to={enabled ? item.path : '#'}
                className={isActive ? 'active' : enabled ? 'enabled' : 'disabled'}
                tabIndex={enabled ? 0 : -1}
                aria-disabled={!enabled}
                title={tooltip}
                style={{
                  display: 'block',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive ? '#fff' : enabled ? '#495057' : '#6c757d',
                  backgroundColor: isActive ? '#007bff' : enabled ? 'transparent' : 'transparent',
                  fontWeight: isActive ? 'bold' : 'normal',
                  opacity: enabled ? 1 : 0.5,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  pointerEvents: enabled ? 'auto' : 'none',
                  border: isActive ? '2px solid #0056b3' : enabled ? '2px solid transparent' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (enabled && !isActive) {
                    e.target.style.backgroundColor = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  if (enabled && !isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{item.label}</span>
                  
                  {/* Status Icons */}
                  {isActive && (
                    <span style={{ color: '#fff', fontSize: '14px' }}>➤</span>
                  )}
                  {!enabled && (
                    <span style={{ color: '#dc3545', fontSize: '14px' }}>🔒</span>
                  )}
                  {enabled && !isActive && navigationStatus.currentStep === item.label.toLowerCase() && (
                    <span style={{ color: '#28a745', fontSize: '14px' }}>●</span>
                  )}
                </div>
              </Link>

              {/* Tooltip for disabled items */}
              {!enabled && tooltip && (
                <div style={{
                  position: 'absolute',
                  left: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginLeft: '10px',
                  backgroundColor: '#343a40',
                  color: 'white',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s ease',
                  zIndex: 1000
                }}
                className="tooltip"
                >
                  {tooltip}
                  <div style={{
                    position: 'absolute',
                    right: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 0,
                    height: 0,
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '5px solid #343a40'
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Completion Status Summary */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#fff', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#495057' }}>Completion Status</h4>
        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
          <div style={{ color: navigationStatus.hasTeachers ? '#28a745' : '#dc3545' }}>
            {navigationStatus.hasTeachers ? '✅' : '❌'} Teachers Added
          </div>
          <div style={{ color: navigationStatus.syllabusCompleted ? '#28a745' : '#dc3545' }}>
            {navigationStatus.syllabusCompleted ? '✅' : '❌'} Syllabus Complete
          </div>
          <div style={{ color: navigationStatus.lectureAssignmentsCompleted ? '#28a745' : '#dc3545' }}>
            {navigationStatus.lectureAssignmentsCompleted ? '✅' : '❌'} Lectures Assigned
          </div>
          <div style={{ color: navigationStatus.labAssignmentsCompleted ? '#28a745' : '#dc3545' }}>
            {navigationStatus.labAssignmentsCompleted ? '✅' : '❌'} Labs Assigned
          </div>
          <div style={{ color: navigationStatus.resourcesConfigured ? '#28a745' : '#dc3545' }}>
            {navigationStatus.resourcesConfigured ? '✅' : '❌'} Resources Configured
          </div>
        </div>
      </div>

      {/* CSS for Tooltip Hover Effect */}
      <style jsx>{`
        .tooltip:hover {
          opacity: 1 !important;
        }
        nav > div:hover .tooltip {
          opacity: 1;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
