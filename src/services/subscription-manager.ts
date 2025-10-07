/**
 * Subscription Manager Service
 * Manages dynamic NFT-based subscriptions
 */

import { Pool } from "pg";
import { ScriptModel, Script } from "@/database/models/Script";

export interface NFTOwnership {
  contractAddress: string;
  hasNFT: boolean;
  count: number;
  networkName: string;
  verifiedAt?: Date;
}

export interface UserSubscription {
  maxProfiles: number;
  subscriptionLevel: "free" | "nft_holder";
  ownedNFTs: NFTOwnership[];
}

export interface UserOwnershipData {
  userId: number;
  ownedNFTs: NFTOwnership[];
  maxProfiles: number;
  accessibleScripts: string[];
  lastVerified: Date;
}

/**
 * Subscription Manager
 * Handles all subscription logic based on NFT ownership
 */
export class SubscriptionManager {
  private pool: Pool;
  private readonly FREE_MAX_PROFILES = 1;
  private readonly NFT_HOLDER_MAX_PROFILES = 5;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Calculate user subscription based on NFT ownership
   * @param userId - User ID
   * @param ownedNFTs - Array of NFT ownership data
   * @returns Subscription details
   */
  async calculateUserSubscription(
    userId: number,
    ownedNFTs: NFTOwnership[]
  ): Promise<UserSubscription> {
    const hasAnyNFT = ownedNFTs.some((nft) => nft.hasNFT && nft.count > 0);

    const subscription: UserSubscription = {
      maxProfiles: hasAnyNFT
        ? this.NFT_HOLDER_MAX_PROFILES
        : this.FREE_MAX_PROFILES,
      subscriptionLevel: hasAnyNFT ? "nft_holder" : "free",
      ownedNFTs: ownedNFTs.filter((nft) => nft.hasNFT && nft.count > 0),
    };

    console.log(
      `📊 Calculated subscription for user ${userId}: ${subscription.subscriptionLevel} (${subscription.maxProfiles} profiles, ${subscription.ownedNFTs.length} NFTs)`
    );

    return subscription;
  }

  /**
   * Get accessible scripts for user based on NFT ownership
   * @param ownedNFTs - Array of owned NFTs
   * @returns Array of accessible scripts
   */
  async getAccessibleScripts(
    ownedNFTs: NFTOwnership[]
  ): Promise<Script[]> {
    const scriptModel = new ScriptModel(this.pool);

    const hasAnyNFT = ownedNFTs.some((nft) => nft.hasNFT && nft.count > 0);

    if (!hasAnyNFT) {
      // Free tier: только первый публичный скрипт
      const firstScript = await scriptModel.getFirstPublicScript();

      if (firstScript) {
        console.log(
          `📜 Free tier: User gets first public script "${firstScript.name}"`
        );
        return [firstScript];
      }

      console.log("⚠️ No public scripts available for free tier");
      return [];
    }

    // NFT holder: все скрипты для принадлежащих NFT
    const ownedAddresses = ownedNFTs
      .filter((nft) => nft.hasNFT && nft.count > 0)
      .map((nft) => nft.contractAddress);

    const scripts = await scriptModel.getByNFTAddresses(ownedAddresses);

    console.log(
      `📜 NFT holder: User gets ${scripts.length} script(s) for ${ownedAddresses.length} NFT(s)`
    );

    return scripts;
  }

  /**
   * Update user NFT ownership in database
   * @param userId - User ID
   * @param ownedNFTs - Array of owned NFTs
   * @param accessibleScripts - Array of accessible scripts
   */
  async updateUserOwnership(
    userId: number,
    ownedNFTs: NFTOwnership[],
    accessibleScripts: Script[]
  ): Promise<void> {
    const hasAnyNFT = ownedNFTs.some((nft) => nft.hasNFT && nft.count > 0);
    const maxProfiles = hasAnyNFT
      ? this.NFT_HOLDER_MAX_PROFILES
      : this.FREE_MAX_PROFILES;

    // Filter only owned NFTs
    const ownedNFTsData = ownedNFTs
      .filter((nft) => nft.hasNFT && nft.count > 0)
      .map((nft) => ({
        contractAddress: nft.contractAddress,
        count: nft.count,
        networkName: nft.networkName,
        hasNFT: true,
        verifiedAt: nft.verifiedAt || new Date(),
      }));

    const query = `
      INSERT INTO user_nft_ownership (
        user_id,
        owned_nfts,
        max_profiles,
        accessible_scripts,
        last_verified
      ) VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        owned_nfts = EXCLUDED.owned_nfts,
        max_profiles = EXCLUDED.max_profiles,
        accessible_scripts = EXCLUDED.accessible_scripts,
        last_verified = NOW(),
        updated_at = NOW()
    `;

    const scriptIds = accessibleScripts.map((s) => s.script_id);

    await this.pool.query(query, [
      userId,
      JSON.stringify(ownedNFTsData),
      maxProfiles,
      scriptIds,
    ]);

    console.log(
      `💾 Updated ownership for user ${userId}: ${maxProfiles} profiles, ${scriptIds.length} scripts`
    );
  }

  /**
   * Get user ownership data from database
   * @param userId - User ID
   * @returns User ownership data or null
   */
  async getUserOwnership(userId: number): Promise<UserOwnershipData | null> {
    const query = `
      SELECT
        user_id,
        owned_nfts,
        max_profiles,
        accessible_scripts,
        last_verified
      FROM user_nft_ownership
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      userId: row.user_id,
      ownedNFTs: row.owned_nfts || [],
      maxProfiles: row.max_profiles,
      accessibleScripts: row.accessible_scripts || [],
      lastVerified: row.last_verified,
    };
  }

  /**
   * Initialize free tier subscription for new user
   * @param userId - User ID
   */
  async initializeFreeTier(userId: number): Promise<void> {
    const scriptModel = new ScriptModel(this.pool);
    const firstScript = await scriptModel.getFirstPublicScript();

    const accessibleScripts = firstScript ? [firstScript] : [];

    await this.updateUserOwnership(userId, [], accessibleScripts);

    console.log(
      `🆓 Initialized free tier for user ${userId} (1 profile, ${accessibleScripts.length} script)`
    );
  }

  /**
   * Get subscription summary for user
   * @param userId - User ID
   * @returns Subscription summary
   */
  async getSubscriptionSummary(userId: number): Promise<{
    maxProfiles: number;
    subscriptionLevel: string;
    ownedNFTs: NFTOwnership[];
    accessibleScripts: string[];
    lastVerified: Date | null;
  }> {
    const ownership = await this.getUserOwnership(userId);

    if (!ownership) {
      // User has no ownership record, return free tier
      return {
        maxProfiles: this.FREE_MAX_PROFILES,
        subscriptionLevel: "free",
        ownedNFTs: [],
        accessibleScripts: [],
        lastVerified: null,
      };
    }

    return {
      maxProfiles: ownership.maxProfiles,
      subscriptionLevel:
        ownership.maxProfiles > this.FREE_MAX_PROFILES ? "nft_holder" : "free",
      ownedNFTs: ownership.ownedNFTs,
      accessibleScripts: ownership.accessibleScripts,
      lastVerified: ownership.lastVerified,
    };
  }

  /**
   * Check if user needs NFT re-verification
   * @param userId - User ID
   * @param maxCacheAge - Maximum cache age in hours (default 30 days)
   * @returns True if re-verification needed
   */
  async needsReVerification(
    userId: number,
    maxCacheAge: number = 30 * 24
  ): Promise<boolean> {
    const ownership = await this.getUserOwnership(userId);

    if (!ownership) {
      // No record, needs verification
      return true;
    }

    const now = new Date();
    const lastVerified = new Date(ownership.lastVerified);
    const hoursSinceVerification =
      (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60);

    const needsUpdate = hoursSinceVerification >= maxCacheAge;

    if (needsUpdate) {
      console.log(
        `⏰ User ${userId} ownership is stale (${Math.round(hoursSinceVerification)}h old), needs re-verification`
      );
    }

    return needsUpdate;
  }

  /**
   * Get all NFT holders
   * @returns Array of user IDs who own NFTs
   */
  async getAllNFTHolders(): Promise<number[]> {
    const query = `
      SELECT user_id
      FROM user_nft_ownership
      WHERE max_profiles > $1
      ORDER BY user_id
    `;

    const result = await this.pool.query(query, [this.FREE_MAX_PROFILES]);
    return result.rows.map((row) => row.user_id);
  }

  /**
   * Get subscription statistics
   * @returns Statistics about subscriptions
   */
  async getStats(): Promise<{
    totalUsers: number;
    freeUsers: number;
    nftHolders: number;
    averageNFTsPerHolder: number;
    totalScriptsAccessible: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE max_profiles = $1) as free_users,
        COUNT(*) FILTER (WHERE max_profiles > $1) as nft_holders,
        AVG(jsonb_array_length(owned_nfts)) FILTER (WHERE max_profiles > $1) as avg_nfts,
        SUM(cardinality(accessible_scripts)) as total_scripts
      FROM user_nft_ownership
    `;

    const result = await this.pool.query(query, [this.FREE_MAX_PROFILES]);
    const row = result.rows[0];

    return {
      totalUsers: parseInt(row.total_users) || 0,
      freeUsers: parseInt(row.free_users) || 0,
      nftHolders: parseInt(row.nft_holders) || 0,
      averageNFTsPerHolder: parseFloat(row.avg_nfts) || 0,
      totalScriptsAccessible: parseInt(row.total_scripts) || 0,
    };
  }
}
