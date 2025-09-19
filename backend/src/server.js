// src/server.js
require('./db/connection'); // Go into db folder and get connection.js
const app = require('./app');   // Get app.js from same src folder

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log('MongoDB Atlas connection established');
});
