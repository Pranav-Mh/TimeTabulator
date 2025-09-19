// Example using in-memory arrays. Replace with DB logic if needed.
let workingDaysPeriods = { workingDays: 5, periodsPerDay: 8, periodDuration: 60 };
let timeSlots = [
  { startTime: "08:00", endTime: "09:00", label: "Slot 1" },
  { startTime: "09:00", endTime: "10:00", label: "Slot 2" }
];

exports.getWorkingDaysPeriods = (req, res) => {
  res.json(workingDaysPeriods);
};

exports.saveWorkingDaysPeriods = (req, res) => {
  workingDaysPeriods = req.body;
  res.json({ message: "Configuration saved" });
};

exports.getTimeSlots = (req, res) => {
  res.json(timeSlots);
};

exports.addTimeSlot = (req, res) => {
  timeSlots.push(req.body);
  res.json({ message: "Time slot added" });
};

exports.deleteTimeSlot = (req, res) => {
  const idx = parseInt(req.params.index, 10);
  timeSlots.splice(idx, 1);
  res.json({ message: "Time slot deleted" });
};
