import React, { useState, useEffect } from "react";
import axios from "axios";

const AddEditResourceForm = ({ resource, onSave, onCancel }) => {
  const [name, setName] = useState(resource ? resource.name : "");
  const [type, setType] = useState(resource ? resource.type : "Room");
  const [capacity, setCapacity] = useState(resource ? resource.capacity : "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !capacity) {
      alert("Fill all fields");
      return;
    }

    const data = { name, type, capacity: Number(capacity) };
    if (resource) data.id = resource.id;

    const request = resource
      ? axios.put(`/api/resources/${resource.id}`, data)
      : axios.post("/api/resources", data);

    request
      .then(() => {
        onSave();
      })
      .catch(() => alert("Save failed"));
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded">
      <h3 className="text-lg mb-2">{resource ? "Edit Resource" : "Add Resource"}</h3>
      <div className="mb-2">
        <label className="block">Name</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          className="border p-1 w-full" />
      </div>
      <div className="mb-2">
        <label className="block">Type</label>
        <select value={type} onChange={e => setType(e.target.value)} className="border p-1 w-full">
          <option value="Room">Room</option>
          <option value="Lab">Lab</option>
        </select>
      </div>
      <div className="mb-2">
        <label className="block">Capacity</label>
        <input 
          type="number" 
          value={capacity} 
          onChange={e => setCapacity(e.target.value)} 
          className="border p-1 w-full" />
      </div>

      <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded mr-2">
        Save
      </button>
      <button type="button" className="bg-gray-400 px-3 py-1 rounded" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
};

export default AddEditResourceForm;
