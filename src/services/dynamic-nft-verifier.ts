/**
 * Dynamic NFT Verifier Service
 * Automatically verifies all NFT contracts from database and manages script access
 */

import { Pool } from "pg";
import { NFTCacheManager } from "@/utils/nft-cache";
import { ScriptModel, Script } from "@/database/models/Script";
import { SubscriptionManager, NFTOwnership } from "./subscription-manager";

export interface DynamicVerificationResult {
  userId: number;
  walletAddress: string;
  ownedNFTs: NFTOwnership[];
  accessibleScripts: Script[];
  subscriptionLevel: "free" | "nft_holder";
  maxProfiles: number;
  verificationTimestamp: Date;
}

/**
 * Dynamic NFT Verifier
 * Handles automatic verification of all NFT contracts from database
 */
export class DynamicNFTVerifier {
  private pool: Pool;
  private nftCacheManager: NFTCacheManager;
  private subscriptionManager: SubscriptionManager;
  private scriptModel: ScriptModel;

  constructor(pool: Pool) {
    this.pool = pool;
    this.nftCacheManager = new NFTCacheManager(pool);
    this.subscriptionManager = new SubscriptionManager(pool);
    this.scriptModel = new ScriptModel(pool);
  }

  /**
   * Get all unique NFT contract addresses from active scripts
   * @returns Array of unique NFT contract addresses
   */
  async getAllNFTContracts(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT unnest(nft_addresses) as contract_address
        FROM scripts_library
        WHERE is_active = true 
        AND cardinality(nft_addresses) > 0
        ORDER BY contract_address
      `;

      const result = await this.pool.query(query);
      const contracts = result.rows.map((row) => row.contract_address);

      console.log(
        `📋 Found ${contracts.length} unique NFT contract(s) in scripts_library`
      );
      return contracts;
    } catch (error) {
      console.error("Error getting NFT contracts:", error);
      return [];
    }
  }

  /**
   * Get all public scripts (no NFT required)
   * @returns Array of public scripts
   */
  async getPublicScripts(): Promise<Script[]> {
    try {
      const query = `
        SELECT * FROM scripts_library
        WHERE is_active = true 
        AND cardinality(nft_addresses) = 0
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Error getting public scripts:", error);
      return [];
    }
  }

  /**
   * Verify all NFT ownership for user dynamically
   * @param userId - User ID
   * @param walletAddress - Wallet address to check
   * @param forceRefresh - Force refresh cache
   * @returns Complete verification result
   */
  async verifyUserNFTs(
    userId: number,
    walletAddress: string,
    forceRefresh: boolean = false
  ): Promise<DynamicVerificationResult> {
    try {
      console.log(`🔍 Starting dynamic NFT verification for user ${userId}...`);

      // Get all NFT contracts from database
      const nftContracts = await this.getAllNFTContracts();

      if (nftContracts.length === 0) {
        console.log("⚠️ No NFT contracts found in database");
        return await this.handleNoNFTContracts(userId, walletAddress);
      }

      // Verify all NFTs with caching
      console.log(
        `🔍 Verifying ${
          nftContracts.length
        } NFT contract(s) for wallet ${walletAddress.substring(0, 8)}...`
      );

      const nftResults = await this.nftCacheManager.verifyMultipleNFTsWithCache(
        userId,
        walletAddress,
        nftContracts,
        forceRefresh
      );

      // Convert to NFTOwnership format
      const ownedNFTs: NFTOwnership[] = nftResults
        .filter((result) => result.hasNFT)
        .map((result) => ({
          contractAddress: result.nftContract,
          hasNFT: result.hasNFT,
          count: result.nftCount,
          networkName: result.networkName,
          verifiedAt: result.verifiedAt,
        }));

      // Calculate subscription
      const subscription =
        await this.subscriptionManager.calculateUserSubscription(
          userId,
          ownedNFTs
        );

      // Get accessible scripts
      const accessibleScripts = await this.getAccessibleScriptsForUser(
        ownedNFTs
      );

      // Update user ownership in database
      await this.subscriptionManager.updateUserOwnership(
        userId,
        ownedNFTs,
        accessibleScripts
      );

      const result: DynamicVerificationResult = {
        userId,
        walletAddress,
        ownedNFTs,
        accessibleScripts,
        subscriptionLevel: subscription.subscriptionLevel,
        maxProfiles: subscription.maxProfiles,
        verificationTimestamp: new Date(),
      };

      console.log(
        `✅ Dynamic verification complete: ${ownedNFTs.length} NFTs owned, ${accessibleScripts.length} scripts accessible`
      );

      return result;
    } catch (error) {
      console.error("Error in dynamic NFT verification:", error);
      throw error;
    }
  }

  /**
   * Get accessible scripts for user based on NFT ownership
   * @param ownedNFTs - Array of owned NFTs
   * @returns Array of accessible scripts
   */
  private async getAccessibleScriptsForUser(
    ownedNFTs: NFTOwnership[]
  ): Promise<Script[]> {
    const hasAnyNFT = ownedNFTs.some((nft) => nft.hasNFT && nft.count > 0);

    if (!hasAnyNFT) {
      // Free tier: get first public script
      const publicScripts = await this.getPublicScripts();
      if (publicScripts.length > 0) {
        console.log(
          `📜 Free tier: User gets first public script "${publicScripts[0].name}"`
        );
        return [publicScripts[0]];
      }

      console.log("⚠️ No public scripts available for free tier");
      return [];
    }

    // NFT holder: get all scripts for owned NFTs
    const ownedAddresses = ownedNFTs
      .filter((nft) => nft.hasNFT && nft.count > 0)
      .map((nft) => nft.contractAddress);

    const scripts = await this.scriptModel.getByNFTAddresses(ownedAddresses);

    console.log(
      `📜 NFT holder: User gets ${scripts.length} script(s) for ${ownedAddresses.length} NFT(s)`
    );

    return scripts;
  }

  /**
   * Handle case when no NFT contracts are found
   * @param userId - User ID
   * @param walletAddress - Wallet address
   * @returns Free tier result
   */
  private async handleNoNFTContracts(
    userId: number,
    walletAddress: string
  ): Promise<DynamicVerificationResult> {
    const publicScripts = await this.getPublicScripts();
    const accessibleScripts =
      publicScripts.length > 0 ? [publicScripts[0]] : [];

    await this.subscriptionManager.updateUserOwnership(
      userId,
      [],
      accessibleScripts
    );

    return {
      userId,
      walletAddress,
      ownedNFTs: [],
      accessibleScripts,
      subscriptionLevel: "free",
      maxProfiles: 1,
      verificationTimestamp: new Date(),
    };
  }

  /**
   * Get verification summary for user
   * @param userId - User ID
   * @returns Verification summary
   */
  async getVerificationSummary(userId: number): Promise<{
    maxProfiles: number;
    subscriptionLevel: string;
    ownedNFTs: NFTOwnership[];
    accessibleScripts: string[];
    lastVerified: Date | null;
  }> {
    return await this.subscriptionManager.getSubscriptionSummary(userId);
  }

  /**
   * Check if user needs re-verification
   * @param userId - User ID
   * @returns True if re-verification needed
   */
  async needsReVerification(userId: number): Promise<boolean> {
    return await this.subscriptionManager.needsReVerification(userId);
  }

  /**
   * Get all NFT contracts with their associated scripts
   * @returns Array of NFT contracts with script info
   */
  async getNFTContractsWithScripts(): Promise<
    Array<{
      contractAddress: string;
      scriptCount: number;
      scriptNames: string[];
    }>
  > {
    try {
      const query = `
        SELECT 
          unnest(nft_addresses) as contract_address,
          script_id,
          name as script_name
        FROM scripts_library
        WHERE is_active = true 
        AND cardinality(nft_addresses) > 0
        ORDER BY contract_address, script_id
      `;

      const result = await this.pool.query(query);

      // Group by contract address
      const contractsMap = new Map<
        string,
        {
          contractAddress: string;
          scriptCount: number;
          scriptNames: string[];
        }
      >();

      for (const row of result.rows) {
        const address = row.contract_address;

        if (!contractsMap.has(address)) {
          contractsMap.set(address, {
            contractAddress: address,
            scriptCount: 0,
            scriptNames: [],
          });
        }

        const contract = contractsMap.get(address)!;
        contract.scriptCount++;
        contract.scriptNames.push(row.script_name);
      }

      return Array.from(contractsMap.values());
    } catch (error) {
      console.error("Error getting NFT contracts with scripts:", error);
      return [];
    }
  }

  /**
   * Get system statistics
   * @returns System statistics
   */
  async getSystemStats(): Promise<{
    totalNFTContracts: number;
    totalScripts: number;
    publicScripts: number;
    nftGatedScripts: number;
    totalUsers: number;
    nftHolders: number;
  }> {
    try {
      const nftContracts = await this.getAllNFTContracts();
      const publicScripts = await this.getPublicScripts();
      const subscriptionStats = await this.subscriptionManager.getStats();

      return {
        totalNFTContracts: nftContracts.length,
        totalScripts: subscriptionStats.totalScriptsAccessible,
        publicScripts: publicScripts.length,
        nftGatedScripts:
          subscriptionStats.totalScriptsAccessible - publicScripts.length,
        totalUsers: subscriptionStats.totalUsers,
        nftHolders: subscriptionStats.nftHolders,
      };
    } catch (error) {
      console.error("Error getting system stats:", error);
      return {
        totalNFTContracts: 0,
        totalScripts: 0,
        publicScripts: 0,
        nftGatedScripts: 0,
        totalUsers: 0,
        nftHolders: 0,
      };
    }
  }
}

// Export factory function - will be created when needed
export const createDynamicNFTVerifier = async () => {
  const { getDBConnection } = await import("@/config/database");
  return new DynamicNFTVerifier(getDBConnection());
};
