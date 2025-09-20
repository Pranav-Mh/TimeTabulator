import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConfigureResources = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState({ roomName: '', type: 'CR', capacity: 60 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/resources/rooms');
      setRooms(response.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const addRoom = async () => {
    try {
      if (!newRoom.roomName.trim()) {
        setError('Room name is required');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/resources/rooms', newRoom);
      setMessage(response.data.message);
      setNewRoom({ roomName: '', type: 'CR', capacity: 60 });
      fetchRooms();
    } catch (err) {
      console.error('Error adding room:', err);
      setError(err.response?.data?.error || 'Failed to add room');
    }
  };

  const removeRoom = async (id, roomName) => {
    if (window.confirm(`Are you sure you want to remove "${roomName}"?`)) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/resources/rooms/${id}`);
        setMessage(response.data.message);
        fetchRooms();
      } catch (err) {
        console.error('Error removing room:', err);
        setError('Failed to remove room');
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          🏗️ Resource Configuration
        </h1>
        <p style={{ color: '#6c757d', fontSize: '16px' }}>
          Configure classrooms and laboratories for intelligent timetable generation
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          color: '#d32f2f', 
          backgroundColor: '#ffebee', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #f44336'
        }}>
          ❌ {error}
        </div>
      )}

      {message && (
        <div style={{ 
          color: '#2e7d32', 
          backgroundColor: '#e8f5e8', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #4caf50'
        }}>
          ✅ {message}
        </div>
      )}

      {/* Info Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #1976d2'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>🏛️ Classrooms (CR)</h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#424242' }}>
            For theory subjects, open electives, and VAP. Entire division can sit together.
          </p>
        </div>
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #388e3c'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#388e3c' }}>🔬 Laboratories (LAB)</h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#424242' }}>
            For practical subjects. Each batch (A1, A2, A3) requires separate labs.
          </p>
        </div>
      </div>

      {/* Add Room Form */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginBottom: '16px' }}>➕ Add New Room</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Room Name</label>
            <input
              type="text"
              value={newRoom.roomName}
              onChange={(e) => setNewRoom(prev => ({ ...prev, roomName: e.target.value }))}
              placeholder="e.g., CL203, LAB101, Physics Lab"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Type</label>
            <select
              value={newRoom.type}
              onChange={(e) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="CR">CR (Classroom)</option>
              <option value="LAB">LAB (Laboratory)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Capacity</label>
            <input
              type="number"
              value={newRoom.capacity}
              onChange={(e) => setNewRoom(prev => ({ ...prev, capacity: parseInt(e.target.value) || 60 }))}
              min="20"
              max="100"
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={addRoom}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            ➕ Add Room
          </button>
        </div>
      </div>

      {/* Current Resources */}
      <div>
        <h3 style={{ marginBottom: '16px' }}>📊 Current Resources ({rooms.length})</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            Loading rooms...
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏫</div>
            <p>No rooms configured yet. Add your first room above!</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {rooms.map(room => (
              <div key={room._id} style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '16px'
                    }}>
                      {room.type === 'CR' ? '🏛️' : '🔬'} {room.roomName}
                    </h4>
                    <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                      {room.type === 'CR' ? 'Classroom' : 'Laboratory'} • Capacity: {room.capacity}
                    </p>
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '4px 8px', 
                      backgroundColor: room.type === 'CR' ? '#e3f2fd' : '#e8f5e8',
                      color: room.type === 'CR' ? '#1976d2' : '#388e3c',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'inline-block'
                    }}>
                      {room.type === 'CR' ? 'Theory Classes' : 'Lab Sessions'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeRoom(room._id, room.roomName)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Remove room"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigureResources;
