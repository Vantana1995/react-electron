const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'twitter_automation',
  user: 'postgres',
  password: 'password'
});

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database...');
    
    // Drop all tables in correct order (respecting foreign keys)
    const dropQueries = [
      'DROP TABLE IF EXISTS script_versions CASCADE;',
      'DROP TABLE IF EXISTS scripts_library CASCADE;',
      'DROP TABLE IF EXISTS user_nft_ownership CASCADE;',
      'DROP TABLE IF EXISTS user_nft_cache CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;',
      'DROP VIEW IF EXISTS user_subscription_status CASCADE;',
      'DROP VIEW IF EXISTS active_scripts_summary CASCADE;',
      'DROP FUNCTION IF EXISTS update_user_nft_ownership CASCADE;',
      'DROP FUNCTION IF EXISTS get_all_nft_addresses CASCADE;',
      'DROP FUNCTION IF EXISTS user_needs_nft_reverification CASCADE;'
    ];

    for (const query of dropQueries) {
      try {
        await pool.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        console.log(`⚠️  Warning: ${query} - ${error.message}`);
      }
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Run: psql -h localhost -U postgres -d twitter_automation -f database-init.sql');
    console.log('   2. Or restart your backend server to auto-create tables');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    await pool.end();
  }
}

clearDatabase();
