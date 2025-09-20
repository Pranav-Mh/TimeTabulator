import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../index.css';

const TeacherRow = ({ teacher, onEdit, onDelete }) => (
  <tr>
    <td>{teacher.name}</td>
    <td>{teacher.teacherId}</td>    {/* ✅ Show teacherId */}
    <td>{teacher.department}</td>   {/* ✅ Show department */}
    <td>{teacher.maxHours}</td>     {/* ✅ Show maxHours from backend */}
    <td>
      <button className="edit-btn" onClick={() => onEdit(teacher)}>Edit</button>
      <button className="delete-btn" onClick={() => onDelete(teacher._id)}>Delete</button>
    </td>
  </tr>
);

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ 
    name: '', 
    teacherId: '',      // ✅ Added teacherId
    department: '',     // ✅ Added department  
    maxWorkload: '' 
  });
  const [editId, setEditId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(''); // ✅ Add error state
  const [successMessage, setSuccessMessage] = useState(''); // ✅ Add success state

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const res = await axios.get('http://localhost:5000/api/teachers'); // ✅ FIXED
    setTeachers(res.data);
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMessage(''); // ✅ Clear error when user types
    setSuccessMessage(''); // ✅ Clear success when user types
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMessage(''); // Clear previous errors
    setSuccessMessage(''); // Clear previous success

    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/teachers/${editId}`, form); // ✅ FIXED
        setSuccessMessage('✅ Teacher updated successfully!');
      } else {
        await axios.post('http://localhost:5000/api/teachers', form); // ✅ FIXED
        setSuccessMessage('✅ Teacher added successfully!');
      }
      setForm({ name: '', teacherId: '', department: '', maxWorkload: '' }); // ✅ Reset all fields
      setEditId(null);
      fetchTeachers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      // ✅ Handle error from backend
      const errorMsg = err.response?.data?.error || 'An error occurred while saving teacher';
      setErrorMessage(errorMsg);
      console.error('Error:', err);
    }
  };

  const handleEdit = t => {
    setForm({ 
      name: t.name, 
      teacherId: t.teacherId,    // ✅ Map teacherId
      department: t.department,   // ✅ Map department
      maxWorkload: t.maxHours     // ✅ Map maxHours → maxWorkload
    });
    setEditId(t._id);
    setErrorMessage(''); // Clear error when editing
    setSuccessMessage(''); // Clear success when editing
  };

  const handleDelete = async id => {
    try {
      await axios.delete(`http://localhost:5000/api/teachers/${id}`); // ✅ FIXED
      setSuccessMessage('✅ Teacher deleted successfully!');
      fetchTeachers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Failed to delete teacher');
    }
  };

  return (
    <div className="teachers-page">
      <h1>Teacher Data Management</h1>
      
      {/* ✅ Display Error Message */}
      {errorMessage && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffe6e6', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '10px',
          border: '1px solid red'
        }}>
          ⚠️ {errorMessage}
        </div>
      )}
      
      {/* ✅ Display Success Message */}
      {successMessage && (
        <div style={{ 
          color: 'green', 
          backgroundColor: '#e6ffe6', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '10px',
          border: '1px solid green'
        }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Teacher Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="teacherId"         // ✅ Added teacherId input
          placeholder="Teacher ID"
          value={form.teacherId}
          onChange={handleChange}
          required
        />
        <input
          name="department"        // ✅ Added department input
          placeholder="Department"
          value={form.department}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="maxWorkload"
          placeholder="Max Workload"
          value={form.maxWorkload}
          onChange={handleChange}
          required
          min="1"
        />
        <button className="add-btn" type="submit">{editId ? "Update" : "Add"}</button>
        {editId && <button type="button" onClick={() => { 
          setForm({ name: '', teacherId: '', department: '', maxWorkload: '' }); 
          setEditId(null);
          setErrorMessage('');
          setSuccessMessage('');
        }}>Cancel</button>}
      </form>
      <table>
        <thead>
          <tr>
            <th>Teacher Name</th>
            <th>Teacher ID</th>      {/* ✅ Added Teacher ID column */}
            <th>Department</th>      {/* ✅ Added Department column */}
            <th>Max Workload</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map(teacher => (
            <TeacherRow
              key={teacher._id}
              teacher={teacher}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Teachers;
