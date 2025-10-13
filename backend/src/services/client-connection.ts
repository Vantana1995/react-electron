import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import {
  generateDeviceKey,
  encryptData,
  createVerificationHash,
} from "@/utils/encryption";
import { tunnelServer } from "./tunnel-server";

interface ActiveConnection {
  userId: number;
  deviceHash: string;
  ipAddress: string;
  nonce: number;
  lastPing: number;
  missedPings: number;
  deviceData?: {
    cpuModel: string;
    ipAddress: string;
  };
}

interface ClientInstruction {
  action:
    | "verify_connection"
    | "update_subscription"
    | "new_features"
    | "disconnect";
  priority: "low" | "normal" | "high" | "critical";
  data?: Record<string, unknown>;
}

interface StoredDeviceInfo {
  cpu: { cores: number; architecture: string; model?: string };
  gpu: { renderer: string; vendor: string; memory?: number };
  memory: { total: number };
  os: { platform: string; version: string; architecture: string };
  [key: string]: unknown;
}

class ClientConnectionManager {
  private activeConnections: Map<string, ActiveConnection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.startPingService();
  }

  /**
   * Register new active connection
   */
  async registerConnection(
    deviceHash: string,
    ipAddress: string,
    nonce: number,
    deviceData?: { cpuModel: string; ipAddress: string }
  ): Promise<void> {
    const db = getDBConnection();
    const userModel = new UserModel(db);

    const user = await userModel.findByDeviceHash(deviceHash);
    if (!user) {
      throw new Error("User not found");
    }

    this.activeConnections.set(deviceHash, {
      userId: user.id,
      deviceHash,
      ipAddress,
      nonce,
      lastPing: Date.now(),
      missedPings: 0,
      deviceData: deviceData || { cpuModel: "unknown", ipAddress },
    });

    console.log(
      `✅ Client connected: ${deviceHash.substring(0, 8)}... from ${ipAddress}`
    );
  }

  /**
   * Remove connection
   */
  removeConnection(deviceHash: string): void {
    this.activeConnections.delete(deviceHash);
    console.log(`❌ Client disconnected: ${deviceHash.substring(0, 8)}...`);
  }

  /**
   * Send message through tunnel to client
   */
  private async sendThroughTunnel(
    connection: ActiveConnection,
    messageType: "ping" | "script-delivery" | "update",
    data: any
  ): Promise<boolean> {
    try {
      // Check if client is connected to tunnel
      const tunnelConnection = tunnelServer.getConnection(connection.deviceHash);
      if (!tunnelConnection) {
        console.log(`❌ Client not connected to tunnel: ${connection.deviceHash.substring(0, 8)}...`);
        return false;
      }

      // Send through tunnel
      const success = await tunnelServer.sendToClient(connection.deviceHash, {
        type: messageType,
        payload: {
          timestamp: Date.now(),
          ...data,
        },
      });

      return success;
    } catch (error) {
      console.error("Tunnel send failed:", error);
      return false;
    }
  }

  /**
   * Ping all active connections through tunnel
   * Note: Actual pinging is handled by tunnelServer's heartbeat system
   * This method is kept for compatibility and monitoring
   */
  private async pingActiveConnections(): Promise<void> {
    const currentTime = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [deviceHash, connection] of this.activeConnections) {
      try {
        // Check if client is still connected to tunnel
        const tunnelConnection = tunnelServer.getConnection(deviceHash);

        if (!tunnelConnection) {
          console.log(
            `❌ Client not in tunnel: ${deviceHash.substring(0, 8)}...`
          );
          await this.handleConnectionLost(connection);
          connectionsToRemove.push(deviceHash);
          continue;
        }

        // Update connection state from tunnel
        connection.lastPing = tunnelConnection.lastPing;
        connection.missedPings = tunnelConnection.missedPings;
        connection.nonce = tunnelConnection.nonce;

        console.log(
          `✅ Client connected via tunnel: ${deviceHash.substring(
            0,
            8
          )}... (nonce: ${connection.nonce})`
        );
      } catch (error) {
        console.error(
          `Error checking client ${deviceHash.substring(0, 8)}...:`,
          error
        );

        await this.handleConnectionLost(connection);
        connectionsToRemove.push(deviceHash);
      }
    }

    // Remove disconnected clients
    connectionsToRemove.forEach((deviceHash) => {
      this.removeConnection(deviceHash);
    });
  }

  /**
   * Handle lost connection - increment nonce
   */
  private async handleConnectionLost(
    connection: ActiveConnection
  ): Promise<void> {
    try {
      const db = getDBConnection();
      const query = `
        UPDATE users 
        SET nonce = nonce + 1,
            last_active = NOW()
        WHERE device_hash = $1
      `;

      await db.query(query, [connection.deviceHash]);

      console.log(
        `🔄 Nonce incremented for disconnected client: ${connection.deviceHash.substring(
          0,
          8
        )}...`
      );
    } catch (error) {
      console.error("Failed to increment nonce:", error);
    }
  }

  /**
   * Send user scripts based on subscription (dynamic NFT-based system)
   */
  async sendUserScripts(deviceHash: string): Promise<boolean> {
    const connection = this.activeConnections.get(deviceHash);

    if (!connection) {
      console.log(`❌ Client not connected: ${deviceHash.substring(0, 8)}...`);
      return false;
    }

    try {
      const db = getDBConnection();
      const userModel = new UserModel(db);
      const { SubscriptionManager } = await import(
        "@/services/subscription-manager"
      );
      const subscriptionManager = new SubscriptionManager(db);

      // Get user
      const user = await userModel.findByDeviceHash(deviceHash);
      if (!user) {
        console.error("❌ User not found");
        return false;
      }

      // Get subscription summary from user_nft_ownership
      const subscription = await subscriptionManager.getSubscriptionSummary(
        user.id
      );
      console.log(
        `📊 User subscription: ${subscription.subscriptionLevel} (${subscription.maxProfiles} profiles, ${subscription.accessibleScripts.length} scripts)`
      );

      // Get accessible scripts
      const { ScriptModel } = await import("@/database/models/Script");
      const scriptModel = new ScriptModel(db);

      // Get full script objects by IDs
      const scripts = await Promise.all(
        subscription.accessibleScripts.map((scriptId) =>
          scriptModel.findByScriptId(scriptId)
        )
      );

      const validScripts = scripts.filter((s) => s !== null);

      if (validScripts.length === 0) {
        console.error("❌ No scripts available for user");
        return false;
      }

      // Prepare all scripts data
      const scriptsData = validScripts.map((script) => ({
        id: script.id,
        name: script.name,
        description: script.description,
        version: script.version,
        category: script.category,
        features: script.config?.features || [],
        usage: script.config?.usage || {},
        security: script.config?.security || {},
        entryPoint: script.config?.entry_point || "index.js",
        path: script.script_id,
        code: script.script_content,
        content: script.script_content,
      }));

      // Get NFT image for the first NFT (all images will be the same)
      let nftImageUrl =
        "https://via.placeholder.com/300x300/4CAF50/white?text=NFT"; // Default fallback

      if (subscription.ownedNFTs.length > 0) {
        try {
          const { getNFTMetadata } = await import("@/services/blockchain");
          const firstNFT = subscription.ownedNFTs[0];
          const nftMetadata = await getNFTMetadata(
            firstNFT.contractAddress,
            "1"
          ); // Use tokenId = 1 for all

          if (nftMetadata && nftMetadata.image) {
            nftImageUrl = nftMetadata.image;
            console.log(`🖼️ NFT image loaded: ${nftImageUrl}`);
          } else {
            console.log("⚠️ No NFT image found, using fallback");
          }
        } catch (error) {
          console.error("❌ Failed to load NFT image:", error);
        }
      }

      // Create NFT+Script pairs for ALL scripts (not just NFT count)
      const nftScriptPairs: Array<any> = [];

      // Step 1: Create pairs for scripts that REQUIRE specific NFTs
      validScripts.forEach((script) => {
        // Check if this script requires a specific NFT
        const nftForThisScript = subscription.ownedNFTs.find((nft) =>
          script.nft_addresses?.includes(nft.contractAddress)
        );

        if (nftForThisScript) {
          // Script has a matching NFT - create pair with NFT
          nftScriptPairs.push({
            nft: {
              address: nftForThisScript.contractAddress,
              image: nftImageUrl,
              metadata: {
                name: `NFT #${nftForThisScript.count}`,
                description: `Owned NFT from ${nftForThisScript.networkName}`,
                attributes: [
                  {
                    trait_type: "Network",
                    value: nftForThisScript.networkName,
                  },
                  {
                    trait_type: "Count",
                    value: nftForThisScript.count,
                  },
                  {
                    trait_type: "Contract",
                    value:
                      nftForThisScript.contractAddress.substring(0, 8) + "...",
                  },
                ],
              },
              timestamp: Date.now(),
            },
            script: {
              id: script.id,
              name: script.name,
              description: script.description,
              version: script.version,
              category: script.category,
              features: script.config?.features || [],
              usage: script.config?.usage || {},
              security: script.config?.security || {},
              entryPoint: script.config?.entry_point || "index.js",
              path: script.script_id,
              code: script.script_content,
              content: script.script_content,
            },
            maxProfiles: subscription.maxProfiles,
            nftInfo: nftForThisScript,
          });
        }
      });

      // Step 2: Add remaining scripts WITHOUT NFT (will show placeholder)
      const assignedScriptIds = nftScriptPairs.map((p) => p.script.id);
      const scriptsWithoutNFT = validScripts.filter(
        (s) => !assignedScriptIds.includes(s.id)
      );

      scriptsWithoutNFT.forEach((script) => {
        nftScriptPairs.push({
          nft: null, // No NFT for this script - frontend will show Ramka.png
          script: {
            id: script.id,
            name: script.name,
            description: script.description,
            version: script.version,
            category: script.category,
            features: script.config?.features || [],
            usage: script.config?.usage || {},
            security: script.config?.security || {},
            entryPoint: script.config?.entry_point || "index.js",
            path: script.script_id,
            code: script.script_content,
            content: script.script_content,
          },
          maxProfiles: subscription.maxProfiles,
          nftInfo: null,
        });
      });

      console.log(
        `📦 Created ${nftScriptPairs.length} pairs: ${
          nftScriptPairs.filter((p) => p.nft).length
        } with NFT, ${nftScriptPairs.filter((p) => !p.nft).length} without NFT`
      );

      // Increment nonce for this ping
      connection.nonce = (connection.nonce || 0) + 1;

      // Prepare data to encrypt - send only necessary structure
      let pingData: Record<string, unknown>;

      if (nftScriptPairs.length > 0) {
        // User has NFTs - send NFT+Script pairs
        pingData = {
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          nonce: connection.nonce,
          nftScriptPairs: nftScriptPairs,
          subscription: {
            level: subscription.subscriptionLevel,
            maxProfiles: subscription.maxProfiles,
            ownedNFTs: subscription.ownedNFTs,
            accessibleScripts: subscription.accessibleScripts,
            nftCount: subscription.ownedNFTs.length,
            scriptCount: subscription.accessibleScripts.length,
          },
          type: "user_scripts_with_nft",
        };
        console.log(`📦 Sending ${nftScriptPairs.length} NFT+Script pairs`);
      } else if (validScripts.length > 0) {
        // User has scripts but no NFTs - send scripts array
        pingData = {
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          nonce: connection.nonce,
          scripts: scriptsData,
          maxProfiles: subscription.maxProfiles,
          subscription: {
            level: subscription.subscriptionLevel,
            maxProfiles: subscription.maxProfiles,
            accessibleScripts: subscription.accessibleScripts,
            scriptCount: subscription.accessibleScripts.length,
          },
          type: "user_scripts_no_nft",
        };
        console.log(`📦 Sending ${scriptsData.length} scripts without NFT`);
      } else {
        // Simple ping without data
        pingData = {
          timestamp: Date.now(),
          serverTime: new Date().toISOString(),
          nonce: connection.nonce,
          type: "connection_ping",
        };
        console.log("📡 Sending connection ping only");
      }

      // Generate encryption key from device data
      const cpuModelForKey = connection.deviceData?.cpuModel || "unknown";
      const ipAddressForKey =
        connection.deviceData?.ipAddress || connection.ipAddress;

      console.log("🔑 BACKEND ENCRYPTION KEY GENERATION:");
      console.log("- CPU Model:", cpuModelForKey);
      console.log("- IP Address:", ipAddressForKey);

      const deviceKey = generateDeviceKey(cpuModelForKey, ipAddressForKey);

      // Encrypt the data
      const encryptedData = encryptData(pingData, deviceKey);

      // Create verification hash
      const verificationHash = createVerificationHash(pingData, deviceKey);

      console.log(
        `🔐 Sending ${
          validScripts.length
        } script(s) to client: ${deviceHash.substring(0, 8)}...`
      );

      console.log("📊 Subscription data:", {
        level: subscription.subscriptionLevel,
        maxProfiles: subscription.maxProfiles,
        nftCount: subscription.ownedNFTs.length,
        scriptCount: subscription.accessibleScripts.length,
        ownedNFTs: subscription.ownedNFTs.map((nft) => ({
          contract: nft.contractAddress.substring(0, 8) + "...",
          count: nft.count,
          network: nft.networkName,
        })),
      });

      console.log("🖼️ NFT+Script pairs being sent:", {
        pairsCount: nftScriptPairs.length,
        nftImageUrl: nftImageUrl,
        pairs: nftScriptPairs.map((pair, index) => ({
          index: index + 1,
          nftAddress: pair.nft ? pair.nft.address.substring(0, 8) + "..." : "No NFT",
          nftName: pair.nft?.metadata?.name || "No NFT",
          scriptName: pair.script?.name || "No script",
          maxProfiles: pair.maxProfiles,
        })),
      });

      return await this.sendThroughTunnel(connection, "script-delivery", {
        encrypted: encryptedData,
        hash: verificationHash,
        type: "encrypted_ping",
        nonce: connection.nonce,
      });
    } catch (error) {
      console.error("Failed to send user scripts:", error);
      return false;
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo(deviceHash: string): ActiveConnection | null {
    return this.activeConnections.get(deviceHash) || null;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ActiveConnection[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Start ping service
   */
  private startPingService(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      this.pingActiveConnections();
    }, this.PING_INTERVAL);

    console.log(
      `🚀 Client ping service started (${this.PING_INTERVAL}ms interval)`
    );
  }

  /**
   * Stop ping service
   */
  stopPingService(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    console.log("🛑 Client ping service stopped");
  }
}

// Singleton instance
export const clientConnectionManager = new ClientConnectionManager();

export default clientConnectionManager;
