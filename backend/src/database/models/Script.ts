import { Pool } from "pg";

export interface Script {
  id: number;
  script_id: string;
  name: string;
  description: string | null;
  version: string;
  ipfs_hash: string;
  nft_addresses: string[];
  category: string | null;
  is_active: boolean;
  config: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateScriptData {
  script_id: string;
  name: string;
  description?: string;
  version: string;
  ipfs_hash: string;
  nft_addresses: string[];
  category?: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateScriptData {
  name?: string;
  description?: string;
  version?: string;
  ipfs_hash?: string;
  nft_addresses?: string[];
  category?: string;
  is_active?: boolean;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ScriptVersion {
  id: number;
  script_id: number;
  version: string;
  ipfs_hash: string;
  nft_addresses: string[];
  changelog: string | null;
  is_current: boolean;
  created_at: Date;
  created_by: string | null;
}

export class ScriptModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new script in the library
   */
  async create(scriptData: CreateScriptData): Promise<Script> {
    const query = `
      INSERT INTO scripts_library (
        script_id,
        name,
        description,
        version,
        ipfs_hash,
        nft_addresses,
        category,
        config,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      scriptData.script_id,
      scriptData.name,
      scriptData.description || null,
      scriptData.version,
      scriptData.ipfs_hash,
      scriptData.nft_addresses,
      scriptData.category || null,
      JSON.stringify(scriptData.config || {}),
      JSON.stringify(scriptData.metadata || {}),
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find script by script_id
   */
  async findByScriptId(scriptId: string): Promise<Script | null> {
    const query = `
      SELECT * FROM scripts_library
      WHERE script_id = $1
    `;

    const result = await this.pool.query(query, [scriptId]);
    return result.rows[0] || null;
  }

  /**
   * Find script by database ID
   */
  async findById(id: number): Promise<Script | null> {
    const query = `
      SELECT * FROM scripts_library
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all active scripts
   */
  async getAllActive(): Promise<Script[]> {
    const query = `
      SELECT * FROM scripts_library
      WHERE is_active = true
      ORDER BY name ASC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get scripts by category
   */
  async getByCategory(category: string): Promise<Script[]> {
    const query = `
      SELECT * FROM scripts_library
      WHERE category = $1 AND is_active = true
      ORDER BY name ASC
    `;

    const result = await this.pool.query(query, [category]);
    return result.rows;
  }

  /**
   * Get scripts accessible by NFT addresses
   * Returns scripts that user can access based on their NFT ownership
   */
  async getByNFTAddresses(nftAddresses: string[]): Promise<Script[]> {
    const query = `
      SELECT * FROM scripts_library
      WHERE is_active = true
      AND (
        nft_addresses && $1::text[]
        OR cardinality(nft_addresses) = 0
      )
      ORDER BY name ASC
    `;

    const result = await this.pool.query(query, [nftAddresses]);
    return result.rows;
  }

  /**
   * Update script
   */
  async update(
    scriptId: string,
    updateData: UpdateScriptData
  ): Promise<Script | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(
          typeof value === "object" && !Array.isArray(value)
            ? JSON.stringify(value)
            : value
        );
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findByScriptId(scriptId);
    }

    const query = `
      UPDATE scripts_library
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE script_id = $${paramIndex}
      RETURNING *
    `;

    values.push(scriptId);

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete script
   */
  async delete(scriptId: string): Promise<void> {
    const query = `DELETE FROM scripts_library WHERE script_id = $1`;
    await this.pool.query(query, [scriptId]);
  }

  /**
   * Create script version
   */
  async createVersion(
    scriptId: number,
    versionData: {
      version: string;
      ipfs_hash: string;
      nft_addresses: string[];
      changelog?: string;
      created_by?: string;
      is_current?: boolean;
    }
  ): Promise<ScriptVersion> {
    const query = `
      INSERT INTO script_versions (
        script_id,
        version,
        ipfs_hash,
        nft_addresses,
        changelog,
        created_by,
        is_current
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      scriptId,
      versionData.version,
      versionData.ipfs_hash,
      versionData.nft_addresses,
      versionData.changelog || null,
      versionData.created_by || null,
      versionData.is_current || false,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all versions for a script
   */
  async getVersions(scriptId: number): Promise<ScriptVersion[]> {
    const query = `
      SELECT * FROM script_versions
      WHERE script_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [scriptId]);
    return result.rows;
  }

  /**
   * Get current version for a script
   */
  async getCurrentVersion(scriptId: number): Promise<ScriptVersion | null> {
    const query = `
      SELECT * FROM script_versions
      WHERE script_id = $1 AND is_current = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [scriptId]);
    return result.rows[0] || null;
  }

  /**
   * Set version as current (and unset others)
   */
  async setCurrentVersion(scriptId: number, versionId: number): Promise<void> {
    // First, unset all current versions for this script
    await this.pool.query(
      `UPDATE script_versions SET is_current = false WHERE script_id = $1`,
      [scriptId]
    );

    // Then set the specified version as current
    await this.pool.query(
      `UPDATE script_versions SET is_current = true WHERE id = $1`,
      [versionId]
    );
  }

  /**
   * Check if user has access to script based on NFT ownership
   */
  async userHasAccess(
    scriptId: string,
    userNFTAddresses: string[]
  ): Promise<boolean> {
    const query = `
      SELECT 1 FROM scripts_library
      WHERE script_id = $1
      AND is_active = true
      AND (
        nft_addresses && $2::text[]
        OR cardinality(nft_addresses) = 0
      )
    `;

    const result = await this.pool.query(query, [scriptId, userNFTAddresses]);
    return result.rows.length > 0;
  }

  /**
   * Get script statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    byCategory: Record<string, number>;
  }> {
    const totalQuery = `SELECT COUNT(*) as count FROM scripts_library`;
    const activeQuery = `SELECT COUNT(*) as count FROM scripts_library WHERE is_active = true`;
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM scripts_library
      WHERE category IS NOT NULL
      GROUP BY category
    `;

    const [totalResult, activeResult, categoryResult] = await Promise.all([
      this.pool.query(totalQuery),
      this.pool.query(activeQuery),
      this.pool.query(categoryQuery),
    ]);

    const byCategory: Record<string, number> = {};
    categoryResult.rows.forEach((row) => {
      byCategory[row.category] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult.rows[0].count),
      active: parseInt(activeResult.rows[0].count),
      byCategory,
    };
  }
}
