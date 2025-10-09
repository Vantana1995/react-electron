/**
 * Server API Service
 * TypeScript service for handling all backend API calls and communication
 */

import {
  ServerResponse,
  DeviceData,
  ServerCallback,
  NFTData,
  ScriptData,
} from "../types";
import { logger } from "../utils/logger";

export class ServerApiService {
  private baseUrl: string = "http://localhost:3000";
  private frontendServerUrl: string = "http://localhost:3001";
  private deviceHash: string | null = null;
  private sessionToken: string | null = null;
  private userId: string | null = null;
  private callbackPollInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private callbacks: {
    onConnectionStatusChange?: (connected: boolean) => void;
    onServerPing?: (callback: ServerCallback) => void;
    onNFTReceived?: (nft: NFTData) => void;
    onScriptReceived?: (script: ScriptData) => void;
    onNFTScriptPairs?: (
      pairs: Array<{
        nft: NFTData | null; // Can be null for scripts without NFT
        script: ScriptData;
        maxProfiles: number;
        nftInfo: Record<string, unknown> | null;
      }>
    ) => void;
  } = {};

  constructor(baseUrl?: string, frontendServerUrl?: string) {
    if (baseUrl) this.baseUrl = baseUrl;
    if (frontendServerUrl) this.frontendServerUrl = frontendServerUrl;
  }

  /**
   * Get real device IPv4 address (not localhost)
   */
  private async getRealIPv4Address(): Promise<string> {
    try {
      // Try to get local network IP using WebRTC
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");

      const ipPromise = new Promise<string>((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
            const ipMatch = event.candidate.candidate.match(ipRegex);
            if (ipMatch && ipMatch[0] && !ipMatch[0].startsWith("127.")) {
              resolve(ipMatch[0]);
              pc.close();
            }
          }
        };
      });

      await pc.createOffer().then((offer) => pc.setLocalDescription(offer));

      // Wait for IP with timeout
      const ip = await Promise.race([
        ipPromise,
        new Promise<string>((resolve) =>
          setTimeout(() => resolve("192.168.1.1"), 2000)
        ),
      ]);

      pc.close();
      return ip;
    } catch (error) {
      logger.warn("Failed to get real IP, using fallback:", error);
      return "192.168.1.1"; // Fallback IP
    }
  }

  /**
   * Connect to server and register device with wallet address
   */
  async connectToServer(
    deviceData: DeviceData,
    walletAddress?: string
  ): Promise<{
    success: boolean;
    deviceHash?: string;
    sessionToken?: string;
    userId?: string;
    isRegistered?: boolean;
    clientIPv4?: string;
    error?: string;
  }> {
    try {
      logger.log("🔄 Connecting to server...");
      this.updateConnectionStatus(false);

      if (!deviceData.fingerprint) {
        throw new Error("Device data not available");
      }

      // Get real device IP address
      const realIPv4 = await this.getRealIPv4Address();
      logger.log("🌐 Real device IPv4:", realIPv4);

      // Get real memory from system info via Electron IPC (if available)
      let totalMemory = 4294967296; // 4GB fallback
      try {
        if (window.electronAPI) {
          const systemInfo = await window.electronAPI.getSystemInfo?.();
          if (systemInfo?.success && systemInfo.memory?.total) {
            totalMemory = systemInfo.memory.total;
            logger.log(`💾 Real system memory: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
          }
        } else if ((navigator as any).deviceMemory) {
          // Browser API (returns in GB)
          totalMemory = (navigator as any).deviceMemory * 1024 * 1024 * 1024;
          logger.log(`💾 Browser-reported memory: ${(navigator as any).deviceMemory} GB`);
        }
      } catch (error) {
        logger.warn("⚠️ Failed to get real memory, using fallback:", error);
      }

      const requestPayload = {
        // Send device data in the format backend expects
        cpu: deviceData.fingerprint.cpu,
        gpu: deviceData.fingerprint.gpu,
        memory: {
          total: totalMemory,
        },
        os: {
          platform: deviceData.fingerprint.system.platform,
          version: deviceData.fingerprint.system.version,
          architecture: deviceData.fingerprint.system.architecture,
        },
        // Browser fingerprint
        webgl: deviceData.fingerprint.browser?.webgl,
        // Wallet information
        walletAddress: walletAddress,
        // Real device IP address
        clientIPv4: realIPv4,
      };

      logger.log("🔍 Sending fingerprint request...");

      // Send fingerprint request
      const response = await fetch(`${this.baseUrl}/api/auth/fingerprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      logger.log(`🔍 Fingerprint API response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ServerResponse = await response.json();

      if (!result.success) {
        throw new Error(
          result.error?.message || "Fingerprint generation failed"
        );
      }

      // Type guard for result data
      if (typeof result.data !== "object" || result.data === null) {
        throw new Error("Invalid response data format");
      }

      const data = result.data as Record<string, unknown>;

      // Store session data
      this.deviceHash =
        typeof data.deviceHash === "string" ? data.deviceHash : null;
      this.sessionToken =
        typeof data.sessionToken === "string" ? data.sessionToken : null;
      this.userId = typeof data.userId === "string" ? data.userId : null;

      logger.log(`🔑 Device hash: ${this.deviceHash?.substring(0, 16)}...`);
      logger.log(`🆔 User ID: ${this.userId}`);

      if (data.isNewUser) {
        logger.log("✅ Device registered successfully");
      } else {
        logger.log("✅ Device verified successfully");
      }

      // Process data using new structured approach (same as ping data)
      this.processPingData(data);

      this.updateConnectionStatus(true);
      logger.log("✅ Successfully connected to server");

      // Send session to frontend server for callbacks
      await this.sendSessionToFrontendServer();

      // Start callback polling
      this.startCallbackPolling();

      return {
        success: true,
        deviceHash: this.deviceHash || undefined,
        sessionToken: this.sessionToken || undefined,
        userId: this.userId || undefined,
        isRegistered: !data.isNewUser,
        clientIPv4: realIPv4, // Return the IP that was used
      };
    } catch (error) {
      logger.error("❌ Connection failed:", error);
      this.updateConnectionStatus(false);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Send session data to frontend server for callback handling
   */
  private async sendSessionToFrontendServer(): Promise<void> {
    try {
      const sessionData = {
        deviceHash: this.deviceHash,
        sessionToken: this.sessionToken,
        userId: this.userId,
        timestamp: Date.now(),
      };

      const response = await fetch(
        `${this.frontendServerUrl}/api/set-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sessionData),
        }
      );

      if (response.ok) {
        logger.log("📡 Session data sent to frontend server");
      } else {
        logger.warn("⚠️ Failed to send session to frontend server");
      }
    } catch (error) {
      logger.warn("⚠️ Frontend server communication error:", error);
    }
  }

  /**
   * Start polling for server callbacks
   */
  private startCallbackPolling(): void {
    // Clear existing interval
    if (this.callbackPollInterval) {
      clearInterval(this.callbackPollInterval);
    }

    logger.log("🔄 Starting callback polling...");

    // HTTP polling for server callbacks
    this.callbackPollInterval = setInterval(async () => {
      try {
        // Check for counter updates first
        await this.checkCounterUpdates();

        // Then check for callback data
        await this.checkCallbacks();
      } catch (error) {
        // Silently handle polling errors to avoid spam
        console.debug("Polling error:", error);
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Check for counter updates
   */
  private async checkCounterUpdates(): Promise<void> {
    try {
      const response = await fetch(
        `${this.frontendServerUrl}/api/counter-status`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.hasCounterUpdate && data.lastCounterUpdate) {
          logger.log(
            `🔢 Counter update received: ${data.lastCounterUpdate.nonce}`
          );

          // Handle counter update (this would trigger timer reset)
          // The actual timer logic is handled by TimerService

          // Clear the counter update flag
          await fetch(`${this.frontendServerUrl}/api/clear-counter`, {
            method: "POST",
          });
        }
      }
    } catch (error) {
      console.debug("Counter update check error:", error);
    }
  }

  /**
   * Check for server callbacks
   */
  private async checkCallbacks(): Promise<void> {
    try {
      const response = await fetch(
        `${this.frontendServerUrl}/api/callback-status`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.hasNewCallback && data.lastCallback) {
          this.handleServerCallback(data.lastCallback);

          // Clear the callback flag
          await fetch(`${this.frontendServerUrl}/api/clear-callback`, {
            method: "POST",
          });
        }
      }
    } catch (error) {
      console.debug("Callback check error:", error);
    }
  }

  /**
   * Handle server callback
   */
  private handleServerCallback(callback: ServerCallback): void {
    logger.log(`📞 Server Callback: ${callback.instruction.action}`);

    // Notify callback listeners
    this.callbacks.onServerPing?.(callback);

    // Handle different types of callbacks
    if (callback.instruction.action === "verify_connection") {
      logger.log("📡 Connection verification ping received");

      // Handle ping data if present
      if (callback.instruction.data) {
        this.processPingData(callback.instruction.data);
      }
    }
  }

  /**
   * Process ping data from server (new structured approach)
   */
  private processPingData(data: unknown): void {
    logger.log("📡 Processing ping data from server");

    // Type guard for data object
    if (typeof data !== "object" || data === null) {
      logger.log("⚠️ Invalid ping data format");
      return;
    }

    const dataObj = data as Record<string, unknown>;
    logger.log("🔍 Ping data type:", dataObj.type);
    logger.log("🔍 Ping data nonce:", dataObj.nonce);

    // NEW STRUCTURED LOGIC
    // Case 1: NFT+Script pairs (user has NFTs)
    if (Array.isArray(dataObj.nftScriptPairs) && dataObj.nftScriptPairs.length > 0) {
      logger.log(`🖼️ Processing ${dataObj.nftScriptPairs.length} NFT+Script pairs`);

      const processedPairs: Array<{
        nft: NFTData;
        script: ScriptData;
        maxProfiles: number;
        nftInfo: Record<string, unknown>;
      }> = [];

      dataObj.nftScriptPairs.forEach((pair: any, index: number) => {
        // Full pair: NFT + Script
        if (pair.nft && pair.script) {
          logger.log(`📦 Pair ${index + 1}: ${pair.script.name} with NFT ${pair.nft.metadata?.name || 'Unknown'}`);

          const nftData: NFTData = {
            address: pair.nft.address || "",
            image: pair.nft.image || "",
            metadata: pair.nft.metadata || {},
            timestamp: pair.nft.timestamp || Date.now(),
            subscription: {
              maxProfiles: pair.maxProfiles || 0,
              subscriptionLevel: "nft_holder",
              features: pair.script.features || [],
            },
          };

          const scriptData: ScriptData = {
            id: pair.script.id || "",
            name: pair.script.name || "",
            version: pair.script.version || "1.0.0",
            features: pair.script.features || [],
            code: pair.script.code || "",
            content: pair.script.content || "",
            maxProfiles: pair.maxProfiles || 0,
            metadata: {
              description: pair.script.description,
              entryPoint: pair.script.entryPoint,
              category: pair.script.category,
            },
          };

          processedPairs.push({
            nft: nftData,
            script: scriptData,
            maxProfiles: pair.maxProfiles || 0,
            nftInfo: pair.nftInfo || {},
          });

          // Trigger callbacks for first pair (backward compatibility)
          if (index === 0) {
            this.callbacks.onNFTReceived?.(nftData);
            this.callbacks.onScriptReceived?.(scriptData);
          }
        }
        // NFT only (no script) - just update maxProfiles
        else if (pair.nft && !pair.script) {
          logger.log(`ℹ️ Pair ${index + 1}: NFT without script (maxProfiles update only)`);
          // Don't display, just track maxProfiles increase
        }
      });

      // Store in window for backward compatibility (will be deprecated)
      if (typeof window !== "undefined") {
        (window as any).nftScriptPairs = processedPairs;
      }

      // Call the callback directly (preferred method)
      if (processedPairs.length > 0) {
        this.callbacks.onNFTScriptPairs?.(processedPairs);
      }

      logger.log(`✅ Processed ${processedPairs.length} displayable NFT+Script pairs`);
    }
    // Case 2: Scripts without NFT (free tier or no NFT holder)
    else if (Array.isArray(dataObj.scripts) && dataObj.scripts.length > 0) {
      logger.log(`📜 Processing ${dataObj.scripts.length} scripts without NFT`);

      const maxProfiles = typeof dataObj.maxProfiles === "number" ? dataObj.maxProfiles : 1;

      dataObj.scripts.forEach((scriptObj: any, index: number) => {
        const scriptData: ScriptData = {
          id: scriptObj.id || "",
          name: scriptObj.name || "",
          version: scriptObj.version || "1.0.0",
          features: scriptObj.features || [],
          code: scriptObj.code || "",
          content: scriptObj.content || "",
          maxProfiles: maxProfiles,
          metadata: {
            description: scriptObj.description,
            entryPoint: scriptObj.entryPoint,
            category: scriptObj.category,
          },
        };

        logger.log(`📜 Script ${index + 1}: ${scriptData.name} (maxProfiles: ${maxProfiles})`);

        // Trigger callback for first script
        if (index === 0) {
          this.callbacks.onScriptReceived?.(scriptData);
        }
      });

      logger.log("✅ Scripts processed (will display with placeholder image)");
    }
    // Case 3: Simple connection ping (no data)
    else {
      logger.log("📡 Simple connection ping - nonce update only");
      // Timer service will handle nonce update
    }
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      this.callbacks.onConnectionStatusChange?.(connected);
    }
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks: {
    onConnectionStatusChange?: (connected: boolean) => void;
    onServerPing?: (callback: ServerCallback) => void;
    onNFTReceived?: (nft: NFTData) => void;
    onScriptReceived?: (script: ScriptData) => void;
    onNFTScriptPairs?: (
      pairs: Array<{
        nft: NFTData | null; // Can be null for scripts without NFT
        script: ScriptData;
        maxProfiles: number;
        nftInfo: Record<string, unknown> | null;
      }>
    ) => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get session info
   */
  getSessionInfo(): {
    deviceHash: string | null;
    sessionToken: string | null;
    userId: string | null;
    isConnected: boolean;
  } {
    return {
      deviceHash: this.deviceHash,
      sessionToken: this.sessionToken,
      userId: this.userId,
      isConnected: this.isConnected,
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    // Clear callback polling interval
    if (this.callbackPollInterval) {
      clearInterval(this.callbackPollInterval);
      this.callbackPollInterval = null;
    }

    // Reset session state
    this.deviceHash = null;
    this.sessionToken = null;
    this.userId = null;
    this.updateConnectionStatus(false);

    logger.log("🔌 Disconnected from server");
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    this.callbacks = {};
  }
}

// Create singleton instance
export const serverApiService = new ServerApiService();

// Export utility functions
export async function connectToServer(
  deviceData: DeviceData,
  walletAddress?: string
) {
  return serverApiService.connectToServer(deviceData, walletAddress);
}

export function getConnectionStatus(): boolean {
  return serverApiService.getConnectionStatus();
}

export function getSessionInfo() {
  return serverApiService.getSessionInfo();
}

export function setServerCallbacks(callbacks: {
  onConnectionStatusChange?: (connected: boolean) => void;
  onServerPing?: (callback: ServerCallback) => void;
  onNFTReceived?: (nft: NFTData) => void;
  onScriptReceived?: (script: ScriptData) => void;
  onNFTScriptPairs?: (
    pairs: Array<{
      nft: NFTData;
      script: ScriptData;
      maxProfiles: number;
      nftInfo: Record<string, unknown>;
    }>
  ) => void;
}) {
  serverApiService.setCallbacks(callbacks);
}
