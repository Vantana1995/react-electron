/**
 * NFT Cache Utility
 * Manages NFT ownership caching to reduce blockchain calls
 */

import { Pool } from "pg";
import { blockchainService } from "../services/blockchain";

export interface NFTCacheEntry {
  id: number;
  user_id: number;
  wallet_address: string;
  has_nft: boolean;
  nft_contract: string;
  network_name: string;
  nft_count: number;
  verified_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NFTVerificationResult {
  hasNFT: boolean;
  walletAddress: string;
  nftContract: string;
  networkName: string;
  nftCount: number;
  isCached: boolean;
  verifiedAt: Date;
}

/**
 * NFT Cache Manager
 */
export class NFTCacheManager {
  private pool: Pool;
  private cacheExpiryHours: number;

  constructor(pool: Pool, cacheExpiryHours: number = 30 * 24) {
    // 30 days default (720 hours)
    this.pool = pool;
    this.cacheExpiryHours = cacheExpiryHours;
  }

  /**
   * Get cached NFT verification for user
   * Returns null if cache doesn't exist or is stale
   */
  async getCachedVerification(
    userId: number,
    walletAddress: string,
    nftContract?: string
  ): Promise<NFTCacheEntry | null> {
    try {
      let query: string;
      let params: (string | number)[];

      if (nftContract) {
        query = `
          SELECT * FROM user_nft_cache
          WHERE user_id = $1 AND wallet_address = $2 AND nft_contract = $3
        `;
        params = [userId, walletAddress, nftContract];
      } else {
        query = `
          SELECT * FROM user_nft_cache
          WHERE user_id = $1 AND wallet_address = $2
        `;
        params = [userId, walletAddress];
      }

      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        console.log(`📋 No NFT cache found for user ${userId}`);
        return null;
      }

      const cache = result.rows[0];
      const isCacheStale = this.isCacheStale(cache.verified_at);

      if (isCacheStale) {
        console.log(
          `⏰ NFT cache stale for user ${userId} (${this.getHoursSinceVerification(
            cache.verified_at
          )}h old)`
        );
        return null;
      }

      console.log(
        `✅ Valid NFT cache found for user ${userId} (${this.getHoursSinceVerification(
          cache.verified_at
        )}h old)`
      );
      return cache;
    } catch (error) {
      console.error("Error getting cached NFT verification:", error);
      return null;
    }
  }

  /**
   * Verify NFT ownership with smart caching
   * - Returns cached result if valid and shows ownership
   * - Re-verifies if cache is stale or shows no ownership (to catch new purchases)
   */
  async verifyNFTWithCache(
    userId: number,
    walletAddress: string,
    nftContract: string,
    forceRefresh: boolean = false
  ): Promise<NFTVerificationResult> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedResult = await this.getCachedVerification(
          userId,
          walletAddress,
          nftContract
        );

        // If cache exists and shows ownership, use it
        if (cachedResult && cachedResult.has_nft) {
          return {
            hasNFT: cachedResult.has_nft,
            walletAddress: cachedResult.wallet_address,
            nftContract: cachedResult.nft_contract,
            networkName: cachedResult.network_name,
            nftCount: cachedResult.nft_count,
            isCached: true,
            verifiedAt: cachedResult.verified_at,
          };
        }

        // If cache exists but shows no ownership, still verify blockchain
        // (user might have bought NFT after last check)
        if (cachedResult && !cachedResult.has_nft) {
          console.log(
            `🔄 Cache shows no NFT, re-verifying blockchain for potential new purchase...`
          );
        }
      }

      // Verify on blockchain
      console.log(
        `🔗 Verifying NFT ownership on blockchain for ${walletAddress.substring(
          0,
          8
        )}...`
      );
      const blockchainResult = await blockchainService.checkNFTOwnership(
        walletAddress,
        nftContract
      );

      // Update cache
      await this.updateCache(userId, walletAddress, blockchainResult);

      return {
        hasNFT: blockchainResult.hasNFT,
        walletAddress: blockchainResult.userAddress,
        nftContract: blockchainResult.contractAddress,
        networkName: blockchainResult.networkName,
        nftCount: blockchainResult.nftCount,
        isCached: false,
        verifiedAt: new Date(),
      };
    } catch (error) {
      console.error("Error verifying NFT with cache:", error);
      throw error;
    }
  }

  /**
   * Update NFT cache for user
   */
  async updateCache(
    userId: number,
    walletAddress: string,
    verificationResult: {
      hasNFT: boolean;
      contractAddress: string;
      networkName: string;
      nftCount: number;
    }
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO user_nft_cache (
          user_id,
          wallet_address,
          has_nft,
          nft_contract,
          network_name,
          nft_count,
          verified_at,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '30 days')
        ON CONFLICT (user_id, wallet_address, nft_contract)
        DO UPDATE SET
          has_nft = EXCLUDED.has_nft,
          network_name = EXCLUDED.network_name,
          nft_count = EXCLUDED.nft_count,
          verified_at = NOW(),
          expires_at = NOW() + INTERVAL '30 days',
          updated_at = NOW()
      `;

      await this.pool.query(query, [
        userId,
        walletAddress,
        verificationResult.hasNFT,
        verificationResult.contractAddress,
        verificationResult.networkName,
        verificationResult.nftCount,
      ]);

      console.log(
        `💾 Updated NFT cache for user ${userId}: hasNFT=${verificationResult.hasNFT}, count=${verificationResult.nftCount}`
      );
    } catch (error) {
      console.error("Error updating NFT cache:", error);
      throw error;
    }
  }

  /**
   * Verify multiple NFT contracts with cache
   * Checks ownership of multiple NFT contracts efficiently
   */
  async verifyMultipleNFTsWithCache(
    userId: number,
    walletAddress: string,
    contractAddresses: string[],
    forceRefresh: boolean = false
  ): Promise<NFTVerificationResult[]> {
    if (contractAddresses.length === 0) {
      console.log("⚠️ No NFT contracts to verify");
      return [];
    }

    console.log(
      `🔍 Verifying ${contractAddresses.length} NFT contract(s) for user ${userId}`
    );

    const results: NFTVerificationResult[] = [];

    for (const contractAddress of contractAddresses) {
      try {
        // Check cache first (unless force refresh)
        let cachedResult: NFTCacheEntry | null = null;

        if (!forceRefresh) {
          const cacheQuery = `
            SELECT * FROM user_nft_cache
            WHERE user_id = $1 AND wallet_address = $2 AND nft_contract = $3
          `;

          const cacheResult = await this.pool.query(cacheQuery, [
            userId,
            walletAddress,
            contractAddress,
          ]);

          if (cacheResult.rows.length > 0) {
            const cache = cacheResult.rows[0];
            const isCacheStale = this.isCacheStale(cache.verified_at);

            if (!isCacheStale) {
              cachedResult = cache;
            }
          }
        }

        // If cache exists and shows ownership, use it
        if (cachedResult && cachedResult.has_nft) {
          results.push({
            hasNFT: cachedResult.has_nft,
            walletAddress: cachedResult.wallet_address,
            nftContract: cachedResult.nft_contract,
            networkName: cachedResult.network_name,
            nftCount: cachedResult.nft_count,
            isCached: true,
            verifiedAt: cachedResult.verified_at,
          });

          console.log(
            `✅ Cache hit for ${contractAddress.substring(0, 8)}... (has NFT)`
          );
          continue;
        }

        // If cache exists but shows no ownership, log it and still verify blockchain
        if (cachedResult && !cachedResult.has_nft) {
          console.log(
            `🔄 Cache shows no NFT for ${contractAddress.substring(
              0,
              8
            )}..., re-verifying blockchain...`
          );
        }

        // Verify on blockchain
        console.log(
          `🔗 Checking blockchain for ${contractAddress.substring(0, 8)}...`
        );

        const blockchainResult = await blockchainService.checkNFTOwnership(
          walletAddress,
          contractAddress
        );

        // Update cache
        await this.updateCache(userId, walletAddress, {
          hasNFT: blockchainResult.hasNFT,
          contractAddress: blockchainResult.contractAddress,
          networkName: blockchainResult.networkName,
          nftCount: blockchainResult.nftCount,
        });

        results.push({
          hasNFT: blockchainResult.hasNFT,
          walletAddress: blockchainResult.userAddress,
          nftContract: blockchainResult.contractAddress,
          networkName: blockchainResult.networkName,
          nftCount: blockchainResult.nftCount,
          isCached: false,
          verifiedAt: new Date(),
        });
      } catch (error) {
        console.error(`❌ Error verifying NFT ${contractAddress}:`, error);
        // Add failed result
        results.push({
          hasNFT: false,
          walletAddress,
          nftContract: contractAddress,
          networkName: "Unknown",
          nftCount: 0,
          isCached: false,
          verifiedAt: new Date(),
        });
      }
    }

    const ownedCount = results.filter((r) => r.hasNFT).length;
    const cachedCount = results.filter((r) => r.isCached).length;

    console.log(
      `✅ Multi-NFT verification complete: ${ownedCount}/${contractAddresses.length} owned, ${cachedCount} from cache`
    );

    return results;
  }

  /**
   * Invalidate cache for user (force next check to verify blockchain)
   */
  async invalidateCache(userId: number, walletAddress: string): Promise<void> {
    try {
      const query = `
        DELETE FROM user_nft_cache
        WHERE user_id = $1 AND wallet_address = $2
      `;

      await this.pool.query(query, [userId, walletAddress]);
      console.log(`🗑️ Invalidated NFT cache for user ${userId}`);
    } catch (error) {
      console.error("Error invalidating NFT cache:", error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific NFT contract
   */
  async invalidateCacheForContract(
    userId: number,
    contractAddress: string
  ): Promise<void> {
    try {
      const query = `
        DELETE FROM user_nft_cache
        WHERE user_id = $1 AND nft_contract = $2
      `;

      await this.pool.query(query, [userId, contractAddress]);
      console.log(
        `🗑️ Invalidated cache for user ${userId}, contract ${contractAddress.substring(
          0,
          8
        )}...`
      );
    } catch (error) {
      console.error("Error invalidating NFT cache for contract:", error);
      throw error;
    }
  }

  /**
   * Check if cache is stale (older than expiry hours or past expires_at)
   */
  private isCacheStale(verifiedAt: Date, expiresAt?: Date): boolean {
    const now = new Date();
    
    // If expires_at is provided, use it for more accurate expiration check
    if (expiresAt) {
      const expirationTime = new Date(expiresAt);
      return now > expirationTime;
    }
    
    // Fallback to time-based calculation
    const verifiedTime = new Date(verifiedAt);
    const hoursSinceVerification =
      (now.getTime() - verifiedTime.getTime()) / (1000 * 60 * 60);

    return hoursSinceVerification >= this.cacheExpiryHours;
  }

  /**
   * Get hours since last verification
   */
  private getHoursSinceVerification(verifiedAt: Date): number {
    const now = new Date();
    const verifiedTime = new Date(verifiedAt);
    const hours = (now.getTime() - verifiedTime.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 10) / 10; // Round to 1 decimal
  }

  /**
   * Clean up old cache entries (optional maintenance)
   */
  async cleanupOldCache(daysToKeep: number = 30): Promise<number> {
    try {
      const query = `
        DELETE FROM user_nft_cache
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        RETURNING id
      `;

      const result = await this.pool.query(query);
      const deletedCount = result.rows.length;

      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old NFT cache entries`);
      }

      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up old cache:", error);
      return 0;
    }
  }

  /**
   * Get all cached NFT holders (users with verified NFT ownership)
   */
  async getAllNFTHolders(): Promise<NFTCacheEntry[]> {
    try {
      const query = `
        SELECT * FROM user_nft_cache
        WHERE has_nft = true
        ORDER BY verified_at DESC
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Error getting NFT holders:", error);
      return [];
    }
  }
}
