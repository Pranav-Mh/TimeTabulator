import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import Teachers from './pages/Teachers';
import Lecture from './pages/Lecture';
import Lab from './pages/Lab';
import ConfigureResources from './pages/ConfigureResources'; // ✅ KEEP ONLY ONE
import Generator from './pages/Generator';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app" style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content" style={{ flex: 1, padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/lecture" element={<Lecture />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/configure-resources" element={<ConfigureResources />} />
            <Route path="/generator" element={<Generator />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
