import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Enhanced page imports from merged work
import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import Lecture from './pages/Lecture';
import Teachers from './pages/Teachers';
import ConfigureResources from './pages/ConfigureResources'; // Note: not ConfigureResourcesPage
import Lab from './pages/Lab';
import Generator from './pages/Generator'; // From merged work
import TimetableRestrictions from './pages/TimetableRestrictions'; // Your addition

import './index.css';

function App() {
  return (
    <Router>
      <Header />
      <div className="app-main">
        <Sidebar />
        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/lecture" element={<Lecture />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/configure-resources" element={<ConfigureResources />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/restrictions" element={<TimetableRestrictions />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
