import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Header from './components/Header';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import AssignTheory from "./pages/AssignTheory";
import Teachers from './pages/Teachers';

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
            <Route path="/assign-theory" element={<AssignTheory />} />
            <Route path="/teachers" element={<Teachers />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
