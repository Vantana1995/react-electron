const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "twitter_automation",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
});

async function initDatabase() {
  try {
    console.log("🚀 Initializing database with new schema...");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "database-init.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Execute the SQL
    await pool.query(sqlContent);

    console.log("\n✅ Database initialized successfully!");
    console.log("📋 Schema includes:");
    console.log("  • scripts_library (with metadata and nft_addresses)");
    console.log("  • script_versions (with nft_addresses)");
    console.log("  • users, user_nft_ownership, user_nft_cache");
    console.log("  • All necessary functions and views");
    console.log("\n🎯 Ready to upload scripts!");
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
    console.error("Details:", error);
  } finally {
    await pool.end();
  }
}

initDatabase();
