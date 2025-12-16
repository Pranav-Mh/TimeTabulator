import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import Header from './components/Header';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import ViewSavedTimetable from './pages/ViewSavedTimetable';
import Lecture from './pages/Lecture';
import Teachers from './pages/Teachers';
import ConfigureResources from './pages/ConfigureResources';
import Lab from './pages/Lab';
import Generator from './pages/Generator';
import TimetableRestrictions from './pages/TimetableRestrictions';
import LoginPage from './pages/LoginPage';

import './index.css';

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // --- Layout for LOGIN page only ---
  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* anything else while not logged in goes to /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // --- Layout for MAIN app (with header + sidebar) ---
  return (
    <>
      <Header />
      <div className="app-main">
        <Sidebar />
        <div className="dashboard-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/view-timetable/:id" element={<ViewSavedTimetable />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/lecture" element={<Lecture />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/configure-resources" element={<ConfigureResources />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/restrictions" element={<TimetableRestrictions />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
