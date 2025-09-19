const db = require("../db/connection");

exports.listResources = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM resources");
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.addResource = async (req, res) => {
  const { name, type, capacity } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO resources (name, type, capacity) VALUES (?, ?, ?)",
      [name, type, capacity]
    );
    res.json({ message: "Resource added", id: result.insertId });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.updateResource = async (req, res) => {
  const id = req.params.id;
  const { name, type, capacity } = req.body;
  try {
    await db.query(
      "UPDATE resources SET name=?, type=?, capacity=? WHERE id=?",
      [name, type, capacity, id]
    );
    res.json({ message: "Resource updated" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.deleteResource = async (req, res) => {
  const id = req.params.id;
  try {
    await db.query("DELETE FROM resources WHERE id=?", [id]);
    res.json({ message: "Resource deleted" });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
