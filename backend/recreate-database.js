const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Connect to postgres database to drop and recreate twitter_automation
const adminPool = new Pool({
  host: "localhost",
  port: 5432,
  database: "postgres", // Connect to default postgres database
  user: "postgres",
  password: "password",
});

async function recreateDatabase() {
  try {
    console.log("🗑️  Dropping existing database...");

    // Terminate all connections to twitter_automation database
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'twitter_automation' AND pid <> pg_backend_pid()
    `);

    // Drop the database
    await adminPool.query("DROP DATABASE IF EXISTS twitter_automation");
    console.log("✅ Database dropped");

    console.log("🆕 Creating new database...");
    // Create the database
    await adminPool.query("CREATE DATABASE twitter_automation");
    console.log("✅ Database created");

    // Close admin connection
    await adminPool.end();

    console.log("🚀 Initializing schema...");

    // Connect to the new database
    const pool = new Pool({
      host: "localhost",
      port: 5432,
      database: "twitter_automation",
      user: "postgres",
      password: "password",
    });

    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, "database-init.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    await pool.query(sqlContent);

    console.log("\n✅ Database recreated successfully!");
    console.log("📋 New schema includes:");
    console.log("  • scripts_library (with metadata and nft_addresses)");
    console.log("  • script_versions (with nft_addresses)");
    console.log("  • users, user_nft_ownership, user_nft_cache");
    console.log("  • All necessary functions and views");
    console.log("  • Clean database (no sample data)");
    console.log("\n🎯 Ready to upload scripts!");

    await pool.end();
  } catch (error) {
    console.error("❌ Error recreating database:", error.message);
    console.error("Details:", error);
  }
}

recreateDatabase();
