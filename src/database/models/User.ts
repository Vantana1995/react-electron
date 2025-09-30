import { Pool } from "pg";

export interface User {
  id: number;
  device_hash: string;
  device_fingerprint: string; // Step 1 hash (device data only)
  ip_address: string;
  nonce: number;
  backup_emails: string[];
  created_at: Date;
  last_active: Date | null;
  device_info: Record<string, unknown>;
}

export interface CreateUserData {
  device_hash: string;
  device_fingerprint: string;
  ip_address: string;
  nonce: number;
  backup_emails: string[];
  device_info: Record<string, unknown>;
}

export class UserModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new user
   */
  async create(userData: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (device_hash, device_fingerprint, ip_address, nonce, backup_emails, device_info)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      userData.device_hash,
      userData.device_fingerprint,
      userData.ip_address,
      userData.nonce,
      userData.backup_emails,
      JSON.stringify(userData.device_info),
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by device hash
   */
  async findByDeviceHash(deviceHash: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE device_hash = $1
    `;

    const result = await this.pool.query(query, [deviceHash]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(id: number): Promise<void> {
    const query = `
      UPDATE users 
      SET last_active = NOW() 
      WHERE id = $1
    `;

    await this.pool.query(query, [id]);
  }

  /**
   * Update backup emails
   */
  async updateBackupEmails(id: number, emails: string[]): Promise<void> {
    const query = `
      UPDATE users 
      SET backup_emails = $1 
      WHERE id = $2
    `;

    await this.pool.query(query, [emails, id]);
  }

  /**
   * Delete user by ID
   */
  async delete(id: number): Promise<void> {
    const query = `DELETE FROM users WHERE id = $1`;
    await this.pool.query(query, [id]);
  }
}
