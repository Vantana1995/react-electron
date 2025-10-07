const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "twitter_automation",
  user: "postgres",
  password: "password",
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
