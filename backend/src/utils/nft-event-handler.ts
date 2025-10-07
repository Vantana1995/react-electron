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
import { clientConnectionManager } from "@/services/client-connection";

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
  event: any
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

    // Step 4: Check if user is online
    console.log("\n🌐 Step 4: Checking user online status...");
    const connection = clientConnectionManager.getConnectionInfo(user.device_hash);

    if (!connection) {
      console.log("❌ User is offline");
      console.log("💡 Scripts will be delivered when user connects");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    console.log("✅ User is online!");
    console.log(`📡 IP Address: ${connection.ipAddress}`);
    console.log(`🔢 Current Nonce: ${connection.nonce}`);

    // Step 5: Send updated scripts to user via WebSocket
    console.log("\n📤 Step 5: Sending updated scripts to user...");
    try {
      const success = await clientConnectionManager.sendUserScripts(user.device_hash);

      if (success) {
        console.log("✅ Scripts delivered successfully!");
        console.log("🎉 User can now execute their accessible scripts");
      } else {
        console.log("❌ Failed to deliver scripts");
        console.log("💡 User may need to reconnect");
      }
    } catch (error) {
      console.error("❌ Error sending scripts:", error);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ NFT MINT EVENT PROCESSING COMPLETE\n");

  } catch (error) {
    console.error("\n❌ ERROR PROCESSING NFT MINT EVENT");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

/**
 * Get user's active scripts based on subscription (dynamic NFT system)
 * This can be called when user connects to send their scripts
 *
 * @param userId - User ID
 * @param walletAddress - User's wallet address
 * @returns Array of scripts user has access to
 */
export async function getUserAccessibleScripts(
  userId: number,
  walletAddress: string
): Promise<any[]> {
  try {
    const db = getDBConnection();
    const scriptModel = new ScriptModel(db);
    const nftCacheManager = new NFTCacheManager(db, 30 * 24); // 30 days cache
    const subscriptionManager = new SubscriptionManager(db);

    // Get all NFT contracts from database
    const allNFTAddresses = await scriptModel.getAllNFTAddresses();

    if (allNFTAddresses.length === 0) {
      console.log(`⚠️ No NFT contracts in database`);
      // Return first public script for free tier
      const firstScript = await scriptModel.getFirstPublicScript();
      return firstScript ? [firstScript] : [];
    }

    // Verify all NFTs with cache
    const nftResults = await nftCacheManager.verifyMultipleNFTsWithCache(
      userId,
      walletAddress,
      allNFTAddresses,
      false // Use cache
    );

    // Convert to NFTOwnership format
    const ownedNFTs = nftResults.map((result) => ({
      contractAddress: result.nftContract,
      hasNFT: result.hasNFT,
      count: result.nftCount,
      networkName: result.networkName,
      verifiedAt: result.verifiedAt,
    }));

    // Get accessible scripts based on ownership
    const scripts = await subscriptionManager.getAccessibleScripts(ownedNFTs);

    console.log(`✅ Found ${scripts.length} accessible script(s) for user ${userId}`);
    return scripts;
  } catch (error) {
    console.error("Error getting user accessible scripts:", error);
    return [];
  }
}
