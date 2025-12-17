import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import TimetableGrid from '../components/TimetableGrid';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ViewSavedTimetable = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef(); // 🔥 used for screenshot

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedTimetable, setSavedTimetable] = useState(null);
  const [finalGrid, setFinalGrid] = useState(null);

  useEffect(() => {
    fetchSavedTimetable();
    // eslint-disable-next-line
  }, [id]);

  const fetchSavedTimetable = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await axios.get(
        `http://localhost:5000/api/generator/saved-timetables/${id}`
      );

      if (!res.data.success) {
        throw new Error('Failed to load timetable');
      }

      setSavedTimetable(res.data.savedTimetable);
      setFinalGrid(res.data.finalTimetableGrid);

    } catch (err) {
      console.error(err);
      setError('Failed to load saved timetable');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ONE DAY = ONE PAGE PDF EXPORT
  const exportPDF = async () => {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const dayElements = pdfRef.current.querySelectorAll('.pdf-day');

    for (let i = 0; i < dayElements.length; i++) {
      const canvas = await html2canvas(dayElements[i], {
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (i !== 0) pdf.addPage();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`${savedTimetable.name}.pdf`);
  };

  if (loading) {
    return <h2 style={{ textAlign: 'center' }}>⏳ Loading timetable...</h2>;
  }

  if (error || !finalGrid) {
    return <h2 style={{ textAlign: 'center' }}>❌ Timetable not found</h2>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{ marginBottom: 20 }}
      >
        ← Back to Dashboard
      </button>

      <h1>📅 {savedTimetable.name}</h1>
      <p>Saved on {new Date(savedTimetable.savedAt).toLocaleString()}</p>

      {/* 🔥 THIS IS SCREENSHOT SOURCE */}
      <div ref={pdfRef} style={{ background: '#fff', padding: 10 }}>
        {Object.entries(finalGrid).map(([day, dayGrid]) => (
          <div
            key={day}
            className="pdf-day"
            style={{ marginBottom: '40px' }}
          >
            <TimetableGrid
              timetableData={{ [day]: dayGrid }}
              readOnly
            />
          </div>
        ))}
      </div>

      {/* Export Button */}
      <button
        onClick={exportPDF}
        style={{
          marginTop: 20,
          padding: '10px 20px',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        📄 Export PDF (One Day = One Page)
      </button>
    </div>
  );
};

export default ViewSavedTimetable;
