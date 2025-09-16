import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import Teachers from './pages/Teachers'; // Import the new Teachers page

import './index.css';

function App() {
  return (
    <Router>
      <Header />
      <div className="app-main">
        {/* Pass activeStep prop to enable sidebar links */}
        <Sidebar activeStep={10} />
        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/teachers" element={<Teachers />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}


export default App;
