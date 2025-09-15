import React from 'react';
import Table from '../components/Table';
import { useNavigate } from 'react-router-dom';

const dummyData = [
  { name: 'tb-1', time: '08:10 AM', date: '08/08/2024' },
  { name: 'tb-2', time: '10:00 AM', date: '08/08/2024' },
  { name: 'tb-3', time: '02:30 PM', date: '09/08/2024' },
  { name: 'tb-4', time: '09:00 AM', date: '10/08/2024' }
];

const Dashboard = () => {
  const navigate = useNavigate();

  const handleGenerateNew = () => {
    // (Optional: clear previous state here)
    navigate("/syllabus");
  };

  const handleViewTimetable = (row) => {
    // You can also use navigate here for viewing details
    alert("View: " + row.name);
  };

  return (
    <>
      <h1>Previous Timetable</h1>
      <div className="table-container">
        <Table data={dummyData} onView={handleViewTimetable} />
      </div>
      <button className="generate-btn" onClick={handleGenerateNew}>
        Generate New Timetable
      </button>
    </>
  );
};

export default Dashboard;
