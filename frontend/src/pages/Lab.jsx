import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../index.css';

const Lab = () => {
  const [selectedYear, setSelectedYear] = useState('SE');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [divisions, setDivisions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherWorkload, setTeacherWorkload] = useState([]);
  const [canAccess, setCanAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 🔥 UI batch selector
  const [batchCount, setBatchCount] = useState(3);
  const [pendingBatchCount, setPendingBatchCount] = useState(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  /* ---------------- ACCESS ---------------- */
  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (canAccess) {
      fetchDivisions();
      fetchTeachers();
      fetchTeacherWorkload();
    }
  }, [selectedYear, canAccess]);

  useEffect(() => {
    if (canAccess && divisions.length > 0) {
      fetchSubjects();
    }
  }, [selectedYear, selectedDivision, canAccess, divisions]);

  const checkAccess = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/labs/access-check');
      setCanAccess(res.data.canAccess);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Access denied');
      setCanAccess(false);
    }
  };

  /* ---------------- DATA FETCH ---------------- */
  const fetchDivisions = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/labs/divisions/${selectedYear}`
      );

      setDivisions(res.data);

      if (res.data.length > 0) {
        const first = res.data[0];
        setSelectedDivision(first.name.split('-')[1]);

        // 🔥 sync UI with backend
        setBatchCount(first.batchCount || 3);
      }
    } catch (err) {
      console.error('Error fetching divisions:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/teachers');
      setTeachers(res.data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/labs/subjects/${selectedYear}/${selectedDivision}`
      );

      setSubjects(res.data.subjects || []);

      // 🔥 trust backend batch count
      if (res.data.subjects?.[0]?.batches?.length) {
        setBatchCount(res.data.subjects[0].batches.length);
      }
    } catch (err) {
      console.error('Error fetching lab subjects:', err);
      setSubjects([]);
    }
  };

  const fetchTeacherWorkload = async () => {
    try {
      const res = await axios.get(
        'http://localhost:5000/api/labs/teacher-workload'
      );
      setTeacherWorkload(res.data);
    } catch (err) {
      console.error('Error fetching teacher workload:', err);
    }
  };

  /* ---------------- ASSIGN ---------------- */
  const handleTeacherAssignment = async (subjectId, batchNumber, teacherId) => {
    if (!teacherId) return;

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const division = divisions.find(
        d => d.name === `${selectedYear}-${selectedDivision}`
      );

      await axios.post('http://localhost:5000/api/labs/assign', {
        subjectId,
        divisionId: division._id,
        batchNumber,
        teacherId
      });

      setSuccessMessage('Lab teacher assigned successfully!');

      await fetchSubjects();
      await fetchTeacherWorkload();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to assign lab teacher');
    }
  };

  /* ---------------- BLOCK ---------------- */
  if (!canAccess) {
    return (
      <div className="lab-page">
        <h1>Assign Teachers for Practical Lab</h1>
        <div style={{ color: 'red', backgroundColor: '#ffe6e6', padding: 20 }}>
          <h2>Access Denied</h2>
          <p>Complete both SE and TE syllabus configuration.</p>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="lab-page">
      <h1>Assign Teachers for Practical Lab</h1>

      {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
      {successMessage && <div style={{ color: 'green' }}>{successMessage}</div>}

      {/* Year & Division */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          <option value="SE">SE</option>
          <option value="TE">TE</option>
          <option value="BE">BE</option>
        </select>

        <select
          value={selectedDivision}
          onChange={e => setSelectedDivision(e.target.value)}
        >
          {divisions.map(d => (
            <option key={d._id} value={d.name.split('-')[1]}>
              {d.name.split('-')[1]}
            </option>
          ))}
        </select>
      </div>

      {/* Batch Count */}
      <div style={{ marginBottom: 20 }}>
        <label><strong>Batch Count:</strong></label>
        <select
          value={batchCount}
          onChange={e => {
            setPendingBatchCount(Number(e.target.value));
            setShowBatchConfirm(true);
          }}
          style={{ marginLeft: 10 }}
        >
          <option value={3}>3 Batches</option>
          <option value={4}>4 Batches</option>
        </select>
      </div>

      {/* CONFIRM */}
      {showBatchConfirm && (
        <div style={{ background: '#fff3cd', padding: 15, marginBottom: 20 }}>
          <p>⚠️ Changing batch count will update lab structure.</p>
          <button
            onClick={async () => {
              try {
                const division = divisions.find(
                  d => d.name === `${selectedYear}-${selectedDivision}`
                );

                await axios.put(
                  `http://localhost:5000/api/labs/division/${division._id}/batch-count`,
                  { batchCount: pendingBatchCount }
                );

                setBatchCount(pendingBatchCount);
                await fetchSubjects();

                setShowBatchConfirm(false);
                setPendingBatchCount(null);
              } catch {
                setErrorMessage('Failed to update batch count');
              }
            }}
          >
            Confirm
          </button>
          <button
            style={{ marginLeft: 10 }}
            onClick={() => {
              setShowBatchConfirm(false);
              setPendingBatchCount(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* 🔥 FINAL FIXED TABLE */}
      {subjects.length > 0 && (
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Hours</th>
              {subjects[0].batches.map(b => (
                <th key={b.batchNumber}>
                  {selectedDivision}{b.batchNumber}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {subjects.map(subject => (
              <tr key={subject._id}>
                <td>{subject.name}</td>
                <td>{subject.hoursPerWeek}</td>

                {subject.batches.map(batch => (
                  <td key={batch.batchNumber}>
                    <select
                      value={batch.assignedTeacher?._id || ''}
                      onChange={e =>
                        handleTeacherAssignment(
                          subject._id,
                          batch.batchNumber,
                          e.target.value
                        )
                      }
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Lab;
