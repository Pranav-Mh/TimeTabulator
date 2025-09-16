import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../index.css';

const TeacherRow = ({ teacher, onEdit, onDelete }) => (
  <tr>
    <td>{teacher.name}</td>
    <td>{teacher.maxWorkload}</td>
    <td>
      <button className="edit-btn" onClick={() => onEdit(teacher)}>Edit</button>
      <button className="delete-btn" onClick={() => onDelete(teacher._id)}>Delete</button>
    </td>
  </tr>
);

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: '', maxWorkload: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const res = await axios.get('/api/teachers');
    setTeachers(res.data);
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (editId) {
      await axios.put(`/api/teachers/${editId}`, form);
    } else {
      await axios.post('/api/teachers', form);
    }
    setForm({ name: '', maxWorkload: '' }); setEditId(null);
    fetchTeachers();
  };

  const handleEdit = t => {
    setForm({ name: t.name, maxWorkload: t.maxWorkload });
    setEditId(t._id);
  };

  const handleDelete = async id => {
    await axios.delete(`/api/teachers/${id}`);
    fetchTeachers();
  };

  return (
    <div className="teachers-page">
      <h1>Teacher Data Management</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Teacher Name"
          value={form.name}
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
        {editId && <button onClick={() => { setForm({ name: '', maxWorkload: '' }); setEditId(null); }}>Cancel</button>}
      </form>
      <table>
        <thead>
          <tr>
            <th>Teacher Name</th>
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
