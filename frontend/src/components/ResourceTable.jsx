import React, { useState, useEffect } from "react";
import axios from "axios";

const ResourceTable = ({ onEdit }) => {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    axios.get("/api/resources")
      .then(res => setResources(res.data))
      .catch(err => alert("Failed to fetch resources"));
  }, []);

  const handleDelete = (id) => {
    if (!window.confirm("Delete this resource?")) return;
    axios.delete(`/api/resources/${id}`)
      .then(() => setResources(resources.filter(r => r.id !== id)))
      .catch(() => alert("Delete failed"));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Resources</h3>
      <table className="table-auto border-collapse border w-full mb-4">
        <thead>
          <tr className="border">
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Type</th>
            <th className="border px-2 py-1">Capacity</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map(r => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.name}</td>
              <td className="border px-2 py-1">{r.type}</td>
              <td className="border px-2 py-1">{r.capacity}</td>
              <td className="border px-2 py-1">
                <button 
                  className="text-blue-600 mr-2" 
                  onClick={() => onEdit(r)}>Edit</button>
                <button 
                  className="text-red-600" 
                  onClick={() => handleDelete(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResourceTable;
