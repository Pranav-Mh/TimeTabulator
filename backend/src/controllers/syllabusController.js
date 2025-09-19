const db = require('../db/connection');

function getDivisionNames(year, count) {
  return Array.from({length: count}, (_, i) => `${year}-${String.fromCharCode(65 + i)}`);
}

exports.saveSyllabus = async (req, res) => {
  const { year, divisionCount, divisions, subjects } = req.body;

  if (!year || !divisionCount || !subjects || subjects.length === 0) {
    return res.status(400).json({ message: "Invalid input" });
  }

  const divisionNames = divisions && divisions.length > 0 ? divisions : getDivisionNames(year, divisionCount);

  try {
    for (const division of divisionNames) {
      await db.query("INSERT IGNORE INTO divisions (year, division_name) VALUES (?, ?)", [year, division]);
    }

    for (const subject of subjects) {
      await db.query(
        "INSERT INTO syllabus (year, subject_name, type, credits, hours_per_week) VALUES (?, ?, ?, ?, ?)",
        [year, subject.name, subject.type, subject.credits, subject.hours]
      );
    }
    res.json({ message: "Syllabus saved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error saving syllabus", error: err.message });
  }
};
