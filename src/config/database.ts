import { Pool, PoolConfig } from "pg";

const dbConfig: PoolConfig = {
  // Local database configuration
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "twitter_automation",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",

  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client can be idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client

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
