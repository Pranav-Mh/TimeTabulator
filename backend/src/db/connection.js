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
});

db.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

module.exports = mongoose;
