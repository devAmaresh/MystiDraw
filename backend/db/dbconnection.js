import mongoose from "mongoose";

// Define the MongoDB connection URI
const MONGODB_URI = "mongodb://127.0.0.1:27017/doodle";

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit the process if the connection fails
  }
};

// Export the connection function
export { connectDB, mongoose };
