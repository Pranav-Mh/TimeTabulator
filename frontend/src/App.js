import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus'; // Placeholder for Member 2
import './index.css';

function App() {
  // Stepper logic: 0 = Dashboard, 1 = Syllabus
  const [activeStep, setActiveStep] = useState(0);

  // This can be replaced with useNavigate for SPA routing.
  const handleGenerateNew = () => {
    setActiveStep(1); // Unlock Syllabus
    window.location.href = '/syllabus';
  };

  const handleViewTimetable = (row) => {
    alert('View timetable: ' + row.name); // Placeholder, can replace with modal or route
  };

  return (
    <Router>
      <Header />
      <div className="app-main">
        <Sidebar activeStep={activeStep} />
        <div className="dashboard-content">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <Dashboard onGenerateNew={handleGenerateNew} onViewTimetable={handleViewTimetable} />
              }
            />
            <Route
              path="/syllabus"
              element={<Syllabus />}
            />
            {/* Add further steps/pages here */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
