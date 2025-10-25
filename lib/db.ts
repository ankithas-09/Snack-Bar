import mongoose from "mongoose";

let isConnected = false;

export default async function dbConnect() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI as string;
  const dbName = process.env.MONGODB_DB_NAME || "Snack-Bar"; // 👈 default if not set

  if (!uri) throw new Error("❌ MONGODB_URI is not defined in .env.local");

  try {
    const conn = await mongoose.connect(uri, { dbName });   // 👈 force DB
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.name}`); // should print "Snack-Bar"
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    throw err;
  }
}
