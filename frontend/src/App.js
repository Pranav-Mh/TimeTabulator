import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import Lecture from './pages/Lecture';  // Only imported once
import Teachers from './pages/Teachers';

// Member 2 pages
import ConfigureResourcesPage from './pages/ConfigureResourcesPage';
import Lab from './pages/Lab';

import './index.css';

function App() {
  return (
    <Router>
      <Header />
      <div className="app-main">
        <Sidebar activeStep={10} />
        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/syllabus" element={<Syllabus />} />
            {/* Removed AssignTheory route */}
            <Route path="/teachers" element={<Teachers />} />

            {/* Member 2 Routes */}
            <Route path="/configure-resources" element={<ConfigureResourcesPage />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/lecture" element={<Lecture />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
