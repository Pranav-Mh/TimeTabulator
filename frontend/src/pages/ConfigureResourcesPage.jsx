import React, { useEffect, useState } from "react";
import axios from "axios";

// Modal for configuring time slots
function TimeSlotModal({ open, slots, onClose, onChange, onBook, allDays, onSave }) {
  const [editSlots, setEditSlots] = useState(slots || []);
  const [bookSlot, setBookSlot] = useState({ slot: "", days: [], label: "" });

  useEffect(() => {
    setEditSlots(slots || []);
  }, [slots, open]);

  const handleSlotChange = (idx, field, value) => {
    const updated = editSlots.map((s, i) =>
      i === idx ? { ...s, [field]: value } : s
    );
    setEditSlots(updated);
    onChange(updated);
  };

  const handleBook = () => {
    if (bookSlot.slot !== "" && bookSlot.days.length > 0 && bookSlot.label) {
      onBook(bookSlot);
      setBookSlot({ slot: "", days: [], label: "" });
    }
  };

  if (!open) return null;
  return (
    <div className="fixed top-0 left-0 bg-black bg-opacity-40 w-full h-full z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg w-[600px] relative">
        <h3 className="text-lg font-semibold mb-4">Configure Time Slots</h3>
        {editSlots.map((slot, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <label>Slot {idx + 1}</label>
            <input
              type="time"
              value={slot.startTime}
              onChange={e => handleSlotChange(idx, "startTime", e.target.value)}
              className="border p-1"
            />
            <span>-</span>
            <input
              type="time"
              value={slot.endTime}
              onChange={e => handleSlotChange(idx, "endTime", e.target.value)}
              className="border p-1"
            />
            <input
              type="text"
              value={slot.label || ""}
              onChange={e => handleSlotChange(idx, "label", e.target.value)}
              placeholder="(optional label)"
              className="border p-1 w-[120px]"
            />
            <button
              onClick={() => onChange(editSlots.filter((_, i) => i !== idx))}
              className="text-xs text-red-600 ml-1"
            >
              Remove
            </button>
          </div>
        ))}

        <hr className="my-4" />

        <div>
          <h4 className="font-medium mb-2">Book Fixed Slot</h4>
          <select
            value={bookSlot.slot}
            onChange={e => setBookSlot({ ...bookSlot, slot: e.target.value })}
            className="border p-1 mr-2"
          >
            <option value="">Select Slot</option>
            {editSlots.map((s, idx) => (
              <option key={idx} value={idx}>
                Slot {idx + 1}
              </option>
            ))}
          </select>
          <select
            multiple
            value={bookSlot.days}
            onChange={e =>
              setBookSlot({
                ...bookSlot,
                days: Array.from(e.target.selectedOptions, opt => opt.value),
              })
            }
            className="border p-1 mr-2"
          >
            {allDays.map(day => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={bookSlot.label}
            onChange={e => setBookSlot({ ...bookSlot, label: e.target.value })}
            placeholder="Label"
            className="border p-1 mr-2 w-32"
          />
          <button onClick={handleBook} className="bg-blue-600 text-white px-2 py-1 rounded">
            Book
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onSave}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const allDaysNames = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

export default function ConfigureResourcesPage() {
  // Resource State
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({ name: "", type: "CR", capacity: "" });
  const [editingId, setEditingId] = useState(null);

  // Time slots State
  const [workingDays, setWorkingDays] = useState(5);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [periodDuration, setPeriodDuration] = useState(60);
  const [slots, setSlots] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Fetch resources
    axios.get("/api/resources")
      .then(res => setResources(res.data))
      .catch(() => setResources([]));

    // Fetch time slot config
    axios.get("/api/config/working-days-periods")
      .then(res => {
        setWorkingDays(res.data.workingDays || 5);
        setPeriodsPerDay(res.data.periodsPerDay || 8);
        setPeriodDuration(res.data.periodDuration || 60);
      });
    axios.get("/api/config/time-slots")
      .then(res => setSlots(res.data))
      .catch(() => setSlots([]));
  }, []);

  // Resource CRUD
  const handleSaveResource = () => {
    if (!form.name || !form.type || !form.capacity) return;
    if (editingId) {
      axios
        .put(`/api/resources/${editingId}`, form)
        .then(() => {
          setEditingId(null);
          setForm({ name: "", type: "CR", capacity: "" });
          axios.get("/api/resources").then(res => setResources(res.data));
        });
    } else {
      axios
        .post("/api/resources", form)
        .then(() => {
          setForm({ name: "", type: "CR", capacity: "" });
          axios.get("/api/resources").then(res => setResources(res.data));
        });
    }
  };

  const handleEditResource = id => {
    const res = resources.find(r => r.id === id);
    setEditingId(id);
    setForm({
      name: res.name,
      type: res.type,
      capacity: res.capacity,
    });
  };

  const handleDeleteResource = id => {
    axios.delete(`/api/resources/${id}`).then(() =>
      axios.get("/api/resources").then(res => setResources(res.data))
    );
  };

  // Time slots CRUD (simple version for demo)
  const handleSlotChange = updatedSlots => setSlots(updatedSlots);

  const handleBookSlot = booking => {
    // Change label for booked slot and days
    setSlots(prev =>
      prev.map((s, idx) =>
        idx == booking.slot
          ? {
              ...s,
              label: booking.label,
              bookedDays: booking.days,
            }
          : s
      )
    );
  };

  // Save configs
  const handleConfigSave = () => {
    axios
      .post("/api/config/working-days-periods", {
        workingDays,
        periodsPerDay,
        periodDuration,
      })
      .then(() => alert("Config Saved"));
  };

  const handleModalSave = () => {
    axios
      .post("/api/config/time-slots", slots)
      .then(() => {
        setModalOpen(false);
        alert("Slots Saved!");
      });
  };

  // Add empty slots if needed
  const addEmptySlots = () => {
    let newSlots = [];
    for (let i = 0; i < periodsPerDay; i++) {
      newSlots.push({
        startTime: "",
        endTime: "",
        label: `Slot ${i + 1}`,
        bookedDays: [],
      });
    }
    setSlots(newSlots);
    setModalOpen(true);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-center mb-8">Configure Resources & Time Slots</h2>
      <div className="flex gap-12 mb-8">
        {/* Resource Management */}
        <div className="w-[440px]">
          <h3 className="font-semibold text-lg mb-4">Classroom & Lab Management</h3>
          <table className="table-auto w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Room Name</th>
                <th className="border px-2 py-1">Type</th>
                <th className="border px-2 py-1">Capacity</th>
                <th className="border px-2 py-1">Action</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(res => (
                <tr key={res.id}>
                  <td className="border px-2 py-1">{res.name}</td>
                  <td className="border px-2 py-1">{res.type}</td>
                  <td className="border px-2 py-1">{res.capacity}</td>
                  <td className="border px-2 py-1">
                    <button
                      onClick={() => handleEditResource(res.id)}
                      className="bg-yellow-600 text-white px-2 mr-2 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteResource(res.id)}
                      className="bg-red-600 text-white px-2 rounded"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4 className="font-semibold mb-2">Add New Room</h4>
          <input
            type="text"
            placeholder="Room Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="border p-1 mr-2"
          />
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className="border p-1 mr-2"
          >
            <option value="CR">Classroom</option>
            <option value="LAB">Lab</option>
          </select>
          <input
            type="number"
            placeholder="Capacity"
            value={form.capacity}
            onChange={e => setForm({ ...form, capacity: e.target.value })}
            className="border p-1 mr-2 w-[80px]"
          />
          <button
            onClick={handleSaveResource}
            className="bg-green-600 text-white px-3 py-1 rounded"
          >
            {editingId ? "Update" : "Add Room"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({ name: "", type: "CR", capacity: "" });
              }}
              className="ml-2 bg-gray-400 text-white px-3 py-1 rounded"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Timetable Slots */}
        <div className="flex-grow">
          <h3 className="font-semibold text-lg mb-2">Scheduling Parameters</h3>
          <div className="flex gap-6 mb-3">
            <div>
              <label>No. Working Days/Week</label>
              <input
                type="number"
                value={workingDays}
                min={1}
                max={7}
                onChange={e => setWorkingDays(e.target.value)}
                className="border p-1 w-14 ml-2"
              />
            </div>
            <div>
              <label>No. Time Slots/Day</label>
              <input
                type="number"
                value={periodsPerDay}
                min={1}
                max={12}
                onChange={e => setPeriodsPerDay(e.target.value)}
                className="border p-1 w-14 ml-2"
              />
            </div>
            <div>
              <label>Period Duration (min)</label>
              <input
                type="number"
                value={periodDuration}
                min={10}
                max={120}
                onChange={e => setPeriodDuration(e.target.value)}
                className="border p-1 w-14 ml-2"
              />
            </div>
          </div>
          <button onClick={handleConfigSave} className="bg-blue-600 text-white px-4 py-2 rounded mt-2">
            Save Configuration
          </button>
          <div className="mt-4">
            <button
              onClick={addEmptySlots}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Select Time Slots
            </button>
          </div>
        </div>
      </div>

      <TimeSlotModal
        open={modalOpen}
        slots={slots}
        onClose={() => setModalOpen(false)}
        onChange={handleSlotChange}
        onBook={handleBookSlot}
        allDays={allDaysNames}
        onSave={handleModalSave}
      />
    </div>
  );
}
