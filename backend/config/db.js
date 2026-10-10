const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/deskdrop';
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection to ${uri} failed: ${error.message}`);
    // If remote connection failed, fallback to local MongoDB instance
    if (!uri.includes('127.0.0.1') && !uri.includes('localhost')) {
      try {
        console.log('[Database] Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/deskdrop)...');
        const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/deskdrop', { serverSelectionTimeoutMS: 5000 });
        console.log(`[Database] MongoDB Connected to local instance: ${fallbackConn.connection.host}`);
        return fallbackConn;
      } catch (fallbackError) {
        console.error(`[Database Error] Fallback also failed: ${fallbackError.message}`);
      }
    }
    process.exit(1);
  }
};

module.exports = connectDB;
