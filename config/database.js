import mongoose from 'mongoose';

// Cache the database connection in serverless environment
let cachedConnection = null;

const connectDB = async () => {
  // Reuse existing connection if available (important for serverless)
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    // Set serverless-friendly options
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });

    cachedConnection = conn;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      cachedConnection = null;
    });

    return conn;

  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    // Don't exit in serverless - just throw the error
    throw error;
  }
};

export default connectDB;
