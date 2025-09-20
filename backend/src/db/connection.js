// src/db/connection.js
const mongoose = require('mongoose');

console.log('🔗 Attempting to connect to MongoDB Atlas...');

mongoose.connect('mongodb+srv://pranavmhaisdhunesomnath112023051_db_user:iQ4WxTyxLNUSVXql@cluster0.yebudrj.mongodb.net/timetabulator_db?retryWrites=true&w=majority&appName=Cluster0');

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});

db.once('open', () => {
  console.log('✅ Connected to MongoDB Atlas successfully!');
  
  // ✅ ADD THIS FUNCTION CALL HERE - After successful connection
  removeOldEmailIndex();
});

db.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// ✅ ADD THIS FUNCTION - Remove old email index
const removeOldEmailIndex = async () => {
  try {
    // Import Teacher model here to avoid circular dependency
    const Teacher = require('../models/Teacher');
    await Teacher.collection.dropIndex('email_1');
    console.log('✅ Old email index removed successfully');
  } catch (err) {
    console.log('ℹ️ Email index already removed or doesn\'t exist:', err.message);
  }
};

module.exports = mongoose;
