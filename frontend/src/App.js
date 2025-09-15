import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Syllabus from "./pages/Syllabus";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/syllabus" element={<Syllabus />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
