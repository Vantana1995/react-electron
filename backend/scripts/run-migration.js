/**
 * Run NFT Cache and Script Library Migration
 * Usage: node scripts/run-migration.js
 */

const path = require("path");

// Load environment variables FIRST
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Pool } = require("pg");
const fs = require("fs");

// Database configuration from environment or defaults
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "twitter_automation",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");
    console.log(`📋 Database: ${process.env.DB_NAME || "twitter_automation"}`);
    console.log(`👤 User: ${process.env.DB_USER || "postgres"}`);
    console.log("");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "..",
      "nft-cache-and-script-library-migration.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    console.log("📄 Reading migration file...");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("🚀 Running migration...");
    console.log("");

    // Execute migration
    await client.query(migrationSQL);

    console.log("✅ Migration completed successfully!");
    console.log("");
    console.log("📊 Created tables:");
    console.log("  - user_nft_cache");
    console.log("  - scripts_library");
    console.log("  - script_versions");
    console.log("");

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_nft_cache', 'scripts_library', 'script_versions')
      ORDER BY table_name
    `);

    console.log("✅ Verified tables exist:");
    tablesResult.rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}`);
    });
    console.log("");

    // Show table counts
    console.log("📈 Current table counts:");
    const cacheCount = await client.query(
      "SELECT COUNT(*) FROM user_nft_cache"
    );
    const scriptsCount = await client.query(
      "SELECT COUNT(*) FROM scripts_library"
    );
    const versionsCount = await client.query(
      "SELECT COUNT(*) FROM script_versions"
    );

    console.log(`  user_nft_cache: ${cacheCount.rows[0].count} entries`);
    console.log(`  scripts_library: ${scriptsCount.rows[0].count} scripts`);
    console.log(`  script_versions: ${versionsCount.rows[0].count} versions`);
    console.log("");

    console.log("🎉 Migration complete! You can now:");
    console.log("  1. Add scripts via admin API");
    console.log("  2. User connections will use NFT caching");
    console.log("  3. Check NFT-CACHE-IMPLEMENTATION.md for usage examples");
  } catch (error) {
    console.error("❌ Migration failed!");
    console.error("");
    console.error("Error details:", error.message);
    console.error("");

    if (error.message.includes("already exists")) {
      console.log("ℹ️  Tables may already exist. This is usually safe to ignore.");
      console.log("   The migration uses 'IF NOT EXISTS' clauses.");
    } else {
      console.error("Stack trace:", error.stack);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
console.log("========================================");
console.log("  NFT Cache & Script Library Migration");
console.log("========================================");
console.log("");

runMigration();
