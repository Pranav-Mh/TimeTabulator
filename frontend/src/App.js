import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import AssignTheory from "./pages/AssignTheory";
import './index.css';

function App() {
  return (
    <Router>
      <Header />
      <div className="app-main">
        <Sidebar />
        <div className="dashboard-content">
          <Routes>
            {/* Default route "/" redirects to "/dashboard" */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/assign-theory" element={<AssignTheory />} /> {/* ✅ new */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}


export default App;
