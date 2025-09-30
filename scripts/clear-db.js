/**
 * Clear database script - removes all users and resets the database
 * Run this before starting the server for clean testing
 */

const { Pool } = require("pg");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "twitter_automation",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  ssl: false,
};

const db = new Pool(dbConfig);

async function clearDatabase() {
  try {
    console.log("🧹 Clearing database...");

    // Clear all tables in correct order (respecting foreign keys)
    await db.query("DELETE FROM activity_logs");
    console.log("✅ Cleared activity_logs");

    await db.query("DELETE FROM subscriptions");
    console.log("✅ Cleared subscriptions");

    await db.query("DELETE FROM device_nonces");
    console.log("✅ Cleared device_nonces");

    await db.query("DELETE FROM users");
    console.log("✅ Cleared users");

    // Reset sequences
    await db.query("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await db.query("ALTER SEQUENCE subscriptions_id_seq RESTART WITH 1");
    await db.query("ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1");
    await db.query("ALTER SEQUENCE device_nonces_id_seq RESTART WITH 1");

    console.log("✅ Reset sequences");
    console.log("🎉 Database cleared successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase();
