import { Pool, PoolConfig } from "pg";

const dbConfig: PoolConfig = {
  // Local database configuration
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "twitter_automation",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",

  /**
   * Connection Pool Settings
   *
   * PostgreSQL connection pooling allows efficient reuse of database connections.
   * Instead of creating a new connection for each query, the pool maintains a set
   * of active connections that can be reused by multiple requests.
   *
   * This is for the BACKEND SERVER itself - not for tracking user connections.
   * The pool manages how the Next.js backend connects to PostgreSQL.
   *
   * Benefits:
   * - Reduces overhead of creating/destroying connections
   * - Handles concurrent database requests efficiently
   * - Prevents database connection exhaustion
   * - Automatically manages connection lifecycle
   */
  max: 20, // Maximum number of database connections in the pool (20 concurrent queries max)
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds to free resources
  connectionTimeoutMillis: 2000, // Fail fast if can't get a connection within 2 seconds

  // No SSL for local database
  ssl: false,
};

let pool: Pool | null = null;

export function getDBConnection(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig);

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err);
    });
  }

  return pool;
}

export async function closeDBConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Health check function
export async function testDBConnection(): Promise<boolean> {
  try {
    const client = getDBConnection();
    const result = await client.query("SELECT NOW()");
    return !!result.rows[0];
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

export default getDBConnection;
