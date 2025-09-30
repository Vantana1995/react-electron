import http from "http";
import { getDBConnection } from "@/config/database";
import { UserModel } from "@/database/models/User";
import { generateClientVerificationHash } from "@/utils/crypto";
import {
  generateDeviceKey,
  encryptData,
  createVerificationHash,
} from "@/utils/encryption";
import { scriptManager } from "@/services/script-manager";

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
   * Send direct call to client application
   */
  private async sendDirectCallToClient(
    connection: ActiveConnection,
    instruction: ClientInstruction
  ): Promise<boolean> {
    try {
      // Generate verification hash for client to verify server authenticity
      const db = getDBConnection();
      const userModel = new UserModel(db);
      const user = await userModel.findByDeviceHash(connection.deviceHash);

      if (!user) {
        return false;
      }

      const deviceInfo = user.device_info as StoredDeviceInfo;
      const verificationHash = generateClientVerificationHash({
        cpu: { cores: deviceInfo.cpu.cores },
        gpu: { vendor: deviceInfo.gpu.vendor },
        memory: { total: deviceInfo.memory.total },
        nonce: connection.nonce,
      });

      // Prepare payload for client
      const payload = {
        verificationHash, // Client verifies this using own data
        timestamp: Date.now(),
        instruction,
        nonce: connection.nonce,
      };

      // Send HTTP request directly to client's IP
      // const clientUrl = `http://${connection.ipAddress}:${this.CLIENT_PORT}/server-callback`;

      return new Promise((resolve) => {
        const data = JSON.stringify(payload);

        const options = {
          hostname: "localhost",
          port: 3001,
          path: "/api/server-callback",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
            "X-Server-Auth": verificationHash.substring(0, 16), // Partial hash for quick verification
          },
          timeout: 5000, // 5 second timeout
        };

        const req = http.request(options, (res) => {
          let responseData = "";

          res.on("data", (chunk) => {
            responseData += chunk;
          });

          res.on("end", () => {
            if (res.statusCode === 200) {
              try {
                const response = JSON.parse(responseData);
                // Client should respond with confirmation hash
                resolve(response.verified === true);
              } catch {
                resolve(false);
              }
            } else {
              resolve(false);
            }
          });
        });

        req.on("error", () => {
          resolve(false);
        });

        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });

        req.write(data);
        req.end();
      });
    } catch (error) {
      console.error("Direct call to client failed:", error);
      return false;
    }
  }

  /**
   * Ping all active connections
   */
  private async pingActiveConnections(): Promise<void> {
    const currentTime = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [deviceHash, connection] of this.activeConnections) {
      try {
        // Increment nonce for this ping
        connection.nonce = (connection.nonce || 0) + 1;

        // Send verification ping to client with data and nonce
        const success = await this.sendDirectCallToClient(connection, {
          action: "verify_connection",
          priority: "normal",
          data: {
            timestamp: currentTime,
            serverTime: new Date().toISOString(),
            nonce: connection.nonce, // Include nonce in ping data
            // Add any additional data here
          },
        });

        if (success) {
          // Reset connection state
          connection.lastPing = currentTime;
          connection.missedPings = 0;
          console.log(
            `✅ Client ping successful: ${deviceHash.substring(
              0,
              8
            )}... (nonce: ${connection.nonce})`
          );
        } else {
          // Connection failed - client either disconnected or will close after 40s
          console.log(
            `❌ Client ping failed: ${deviceHash.substring(0, 8)}...`
          );

          // Immediately handle connection loss (no multiple attempts)
          await this.handleConnectionLost(connection);
          connectionsToRemove.push(deviceHash);
        }
      } catch (error) {
        console.error(
          `Error pinging client ${deviceHash.substring(0, 8)}...:`,
          error
        );

        // Connection error - handle immediately
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
   * Send instruction to specific client
   */
  async sendInstructionToClient(
    deviceHash: string,
    instruction: ClientInstruction
  ): Promise<boolean> {
    const connection = this.activeConnections.get(deviceHash);

    if (!connection) {
      console.log(`❌ Client not connected: ${deviceHash.substring(0, 8)}...`);
      return false;
    }

    return await this.sendDirectCallToClient(connection, instruction);
  }

  /**
   * Send ping with NFT data and Puppeteer script to specific client
   */
  async sendPingWithNFTData(
    deviceHash: string,
    nftImage: string,
    nftMetadata?: any
  ): Promise<boolean> {
    const connection = this.activeConnections.get(deviceHash);

    if (!connection) {
      console.log(`❌ Client not connected: ${deviceHash.substring(0, 8)}...`);
      return false;
    }

    try {
      // Get Puppeteer script info
      const puppeteerScript = scriptManager.getScript("puppeteer-browser");

      if (!puppeteerScript) {
        console.error("❌ Puppeteer script not found");
        return false;
      }

      // Get script code
      const scriptCode = scriptManager.getScriptCode("puppeteer-browser");

      if (!scriptCode) {
        console.error("❌ Failed to read Puppeteer script code");
        return false;
      }

      // Increment nonce for this ping
      connection.nonce = (connection.nonce || 0) + 1;

      // Prepare data to encrypt (nonce is now sent separately)
      const pingData = {
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        // nonce removed - now sent as separate variable
        nftImage: nftImage,
        nftMetadata: nftMetadata,
        script: {
          id: puppeteerScript.id,
          name: puppeteerScript.config.name,
          description: puppeteerScript.config.description,
          version: puppeteerScript.config.version,
          category: puppeteerScript.config.category,
          features: puppeteerScript.config.features,
          usage: puppeteerScript.config.usage,
          security: puppeteerScript.config.security,
          entryPoint: puppeteerScript.config.entry_point,
          path: puppeteerScript.path,
          // Add the actual script code
          code: scriptCode,
        },
        // Profile management settings - NFT holders get 5 profiles
        subscription: {
          maxProfiles: 5,
          subscriptionLevel: "basic",
          features: ["profile_management", "proxy_support", "automation"]
        },
        type: "nft_data_with_script",
      };

      // Generate encryption key from device data
      const cpuModelForKey = connection.deviceData?.cpuModel || "unknown";
      const ipAddressForKey = connection.deviceData?.ipAddress || connection.ipAddress;

      console.log("🔑 BACKEND ENCRYPTION KEY GENERATION:");
      console.log("- CPU Model:", cpuModelForKey);
      console.log("- IP Address:", ipAddressForKey);
      console.log("- Device Data:", JSON.stringify(connection.deviceData, null, 2));

      const deviceKey = generateDeviceKey(cpuModelForKey, ipAddressForKey);
      console.log("- Generated Device Key (hex):", deviceKey.toString('hex').substring(0, 16) + "...");
      console.log("- Full Device Key for comparison:", deviceKey.toString('hex'));

      // Encrypt the data
      const encryptedData = encryptData(pingData, deviceKey);

      // Create verification hash
      const verificationHash = createVerificationHash(pingData, deviceKey);

      console.log(
        `🔐 Sending encrypted data to client: ${deviceHash.substring(0, 8)}...`
      );

      return await this.sendDirectCallToClient(connection, {
        action: "verify_connection",
        priority: "normal",
        data: {
          encrypted: encryptedData,
          hash: verificationHash,
          type: "encrypted_ping",
          nonce: connection.nonce, // Add nonce as separate variable
        },
      });
    } catch (error) {
      console.error("Failed to encrypt ping data:", error);
      return false;
    }
  }

  /**
   * Broadcast instruction to all connected clients
   */
  async broadcastInstruction(instruction: ClientInstruction): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.activeConnections.values()).map((connection) =>
        this.sendDirectCallToClient(connection, instruction)
      )
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value === true
    ).length;

    console.log(
      `📡 Broadcast sent to ${this.activeConnections.size} clients, ${successful} successful`
    );
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
