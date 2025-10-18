/**
 * NFT Event Handler
 * Handles NFT mint events and delivers scripts to users
 * Universal handler for any NFT contract (dynamic system)
 */

import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import { ScriptModel } from "@/database/models/Script";
import { NFTCacheManager } from "@/utils/nft-cache";
import { SubscriptionManager } from "@/services/subscription-manager";
import type { Log } from "ethers";

/**
 * Handle NFT mint event
 * Called when a new NFT is minted (Transfer from 0x0)
 *
 * @param walletAddress - Address that received the NFT
 * @param tokenId - Token ID of the minted NFT
 * @param event - Event object from ethers
 */
export async function handleNFTMint(
  walletAddress: string,
  tokenId: string,
  event: { log: Log }
): Promise<void> {
  try {
    console.log("\n🎯 PROCESSING NFT MINT EVENT");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📍 Wallet Address: ${walletAddress}`);
    console.log(`🎫 Token ID: ${tokenId}`);
    console.log(`🔗 Transaction: ${event.log.transactionHash}`);

    // Get contract address from event
    const contractAddress = event.log.address;
    console.log(`📝 Contract Address: ${contractAddress}`);

    const db = getDBConnection();
    const userModel = new UserModel(db);
    const scriptModel = new ScriptModel(db);
    const nftCacheManager = new NFTCacheManager(db);

    // Step 1: Find user by wallet address
    console.log("\n🔍 Step 1: Searching for user in database...");
    const user = await userModel.findByWalletAddress(walletAddress);

    if (!user) {
      console.log("❌ User not found in database");
      console.log("💡 User needs to register first to receive scripts");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.log(`✅ User found: ID ${user.id}`);
    console.log(`📱 Device Hash: ${user.device_hash.substring(0, 16)}...`);

    // Step 2: Invalidate NFT cache for this contract (force fresh verification)
    console.log("\n💾 Step 2: Invalidating NFT cache for contract...");
    try {
      await nftCacheManager.invalidateCacheForContract(user.id, contractAddress);
      console.log("✅ Cache invalidated - will force fresh verification on next check");
    } catch (error) {
      console.error("❌ Failed to invalidate cache:", error);
      // Continue even if cache invalidation fails
    }

    // Step 3: Re-verify ALL user's NFTs and update subscription
    console.log("\n🔄 Step 3: Re-verifying user subscription...");
    const subscriptionManager = new SubscriptionManager(db);

    // Get all NFT contracts from database
    const allNFTAddresses = await scriptModel.getAllNFTAddresses();
    console.log(`🔍 Checking ${allNFTAddresses.length} NFT contract(s)...`);

    // Verify ownership with fresh data (forceRefresh after mint)
    const nftResults = await nftCacheManager.verifyMultipleNFTsWithCache(
      user.id,
      walletAddress,
      allNFTAddresses,
      true // Force refresh to get latest ownership
    );

    // Convert to NFTOwnership format
    const ownedNFTs = nftResults.map((result) => ({
      contractAddress: result.nftContract,
      hasNFT: result.hasNFT,
      count: result.nftCount,
      networkName: result.networkName,
      verifiedAt: result.verifiedAt,
    }));

    // Calculate new subscription
    const subscription = await subscriptionManager.calculateUserSubscription(
      user.id,
      ownedNFTs
    );

    // Get accessible scripts
    const accessibleScripts = await subscriptionManager.getAccessibleScripts(ownedNFTs);

    // Update user_nft_ownership table
    await subscriptionManager.updateUserOwnership(user.id, ownedNFTs, accessibleScripts);

    console.log(
      `✅ Subscription updated: ${subscription.subscriptionLevel} (${subscription.maxProfiles} profiles, ${accessibleScripts.length} scripts)`
    );

    if (accessibleScripts.length === 0) {
      console.log("⚠️ No scripts configured for owned NFTs");
      console.log("💡 Admin needs to add scripts to scripts_library");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.log(`📜 Accessible scripts:`);
    accessibleScripts.forEach((script) => {
      console.log(`   - ${script.name} (v${script.version})`);
    });

    // Step 4: Subscription updated - scripts will be delivered on next connection
    console.log("\n✅ Step 4: Subscription updated in database");
    console.log("💡 User will receive updated scripts on next tunnel connection");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ NFT MINT EVENT PROCESSING COMPLETE\n");

  } catch (error) {
    console.error("\n❌ ERROR PROCESSING NFT MINT EVENT");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}
