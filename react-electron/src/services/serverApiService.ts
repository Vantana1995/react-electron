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
      console.warn("Failed to get real IP, using fallback:", error);
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
      console.log("🔄 Connecting to server...");
      this.updateConnectionStatus(false);

      if (!deviceData.fingerprint) {
        throw new Error("Device data not available");
      }

      // Get real device IP address
      const realIPv4 = await this.getRealIPv4Address();
      console.log("🌐 Real device IPv4:", realIPv4);

      const requestPayload = {
        // Send device data in the format backend expects
        cpu: deviceData.fingerprint.cpu,
        gpu: deviceData.fingerprint.gpu,
        memory: {
          total: (navigator as unknown as { deviceMemory?: number })
            .deviceMemory
            ? (navigator as unknown as { deviceMemory: number }).deviceMemory *
              1024 *
              1024 *
              1024
            : 4294967296,
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

      console.log("🔍 Sending fingerprint request...");

      // Send fingerprint request
      const response = await fetch(`${this.baseUrl}/api/auth/fingerprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      console.log(`🔍 Fingerprint API response status: ${response.status}`);

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

      console.log(`🔑 Device hash: ${this.deviceHash?.substring(0, 16)}...`);
      console.log(`🆔 User ID: ${this.userId}`);

      if (data.isNewUser) {
        console.log("✅ Device registered successfully");
      } else {
        console.log("✅ Device verified successfully");
      }

      // Modernized NFT+Script handling - check for new nftScriptPairs first
      if (
        Array.isArray(data.nftScriptPairs) &&
        data.nftScriptPairs.length > 0
      ) {
        console.log(
          `🖼️ Processing ${data.nftScriptPairs.length} NFT+Script pairs from connectToServer`
        );

        // Initialize nftScriptPairs array if it doesn't exist
        if (typeof window !== "undefined") {
          const windowWithNFT = window as typeof window & {
            nftScriptPairs?: Array<unknown>;
          };
          if (!windowWithNFT.nftScriptPairs) {
            windowWithNFT.nftScriptPairs = [];
            console.log(
              "🆕 Initialized NFT+Script pairs array in connectToServer"
            );
          }
        }

        // Clear existing pairs to avoid duplicates on reconnection
        (
          window as typeof window & { nftScriptPairs?: Array<unknown> }
        ).nftScriptPairs = [];

        // Process each NFT+Script pair
        data.nftScriptPairs.forEach(
          (pair: Record<string, unknown>, index: number) => {
            const nft = pair.nft as Record<string, unknown>;
            const script = pair.script as Record<string, unknown>;

            if (nft && script) {
              console.log(
                `📦 Pair ${index + 1}: ${script.name as string} for NFT ${
                  nft.address as string
                }`
              );

              // Create NFT data - use the exact format from backend
              const nftData: NFTData = {
                address: (nft.address as string) || "unknown",
                image: (nft.image as string) || "",
                metadata: (nft.metadata as NFTData["metadata"]) || {
                  name: "Unknown NFT",
                },
                timestamp: (nft.timestamp as number) || Date.now(),
                subscription: (nft.subscription as NFTData["subscription"]) || {
                  maxProfiles: (pair.maxProfiles as number) || 0,
                  subscriptionLevel: "nft_holder",
                  features: (script.features as string[]) || [],
                },
              };

              // Create script data - use the exact format from backend
              const scriptData: ScriptData = {
                id: (script.id as string) || `script_${index}`,
                name: (script.name as string) || "Unknown Script",
                version: (script.version as string) || "1.0.0",
                content: (script.content as string) || "",
                code:
                  (script.code as string) || (script.content as string) || "",
                features: (script.features as string[]) || [],
                maxProfiles: (pair.maxProfiles as number) || 0,
                metadata: (script.metadata as ScriptData["metadata"]) || {
                  description: (script.description as string) || "",
                  author: (script.author as string) || "System",
                  created:
                    (script.created as string) || new Date().toISOString(),
                  updated:
                    (script.updated as string) || new Date().toISOString(),
                  entryPoint: (script.entryPoint as string) || "index.js",
                  category: (script.category as string) || "",
                },
              };

              // Store in window for component access
              if (typeof window !== "undefined") {
                const windowWithNFT = window as typeof window & {
                  nftScriptPairs?: Array<unknown>;
                };
                windowWithNFT.nftScriptPairs?.push({
                  nft: nftData,
                  script: scriptData,
                  maxProfiles: pair.maxProfiles,
                  nftInfo: pair.nftInfo,
                });
                console.log(
                  `✅ Added new NFT+Script pair: ${scriptData.name} for NFT ${nftData.address}`
                );
              }

              // Trigger callbacks for backward compatibility (only for first pair)
              if (index === 0) {
                console.log(
                  "🖼️ NFT data received from SERVER API SERVICE:",
                  nftData
                );
                console.log(
                  "📊 Subscription data from SERVER API:",
                  nftData.subscription
                );
                this.callbacks.onNFTReceived?.(nftData);
                this.callbacks.onScriptReceived?.(scriptData);
              }
            }
          }
        );
      } else {
        // Fallback to legacy system for backward compatibility
        console.log("ℹ️ No nftScriptPairs found - using legacy system");

        if (data.hasLegionNFT && data.nftImage) {
          console.log("🎉 Legacy Legion NFT ownership verified!");
          const nftData: NFTData = {
            address:
              typeof data.walletAddress === "string"
                ? data.walletAddress
                : "unknown",
            image: typeof data.nftImage === "string" ? data.nftImage : "",
            metadata: data.nftMetadata as NFTData["metadata"],
            timestamp: Date.now(),
          };

          // Add subscription data to NFT data
          if (data.subscription && typeof data.subscription === "object") {
            const subscription = data.subscription as Record<string, unknown>;
            nftData.subscription = {
              maxProfiles:
                typeof subscription.maxProfiles === "number"
                  ? subscription.maxProfiles
                  : 0,
              subscriptionLevel:
                typeof subscription.subscriptionLevel === "string"
                  ? subscription.subscriptionLevel
                  : "basic",
              features: Array.isArray(subscription.features)
                ? subscription.features
                : [],
            };
            console.log(
              `📊 Initial NFT subscription data: ${nftData.subscription.maxProfiles} max profiles`
            );
          }

          // Check for script data if NFT is present
          if (
            data.script &&
            typeof data.script === "object" &&
            data.script !== null
          ) {
            const scriptData = data.script as ScriptData;
            console.log("📜 Script received with NFT:", scriptData.name);
            this.callbacks.onNFTReceived?.(nftData);
            this.callbacks.onScriptReceived?.(scriptData);
          }
        } else {
          console.log("ℹ️ No NFT found - using free tier");

          // Создаем NFT данные для free tier с ограничением в 1 профиль
          const freeTierNFT: NFTData = {
            address:
              typeof data.walletAddress === "string" ? data.walletAddress : "",
            image: "", // Нет изображения для free tier
            metadata: { name: "Free Tier Access" },
            timestamp: Date.now(),
            subscription: {
              maxProfiles: 1, // Free tier ограничен 1 профилем
              subscriptionLevel: "free",
              features: [],
            },
          };

          console.log("🆓 Free tier NFT data created with 1 profile limit");
          this.callbacks.onNFTReceived?.(freeTierNFT);

          // Проверяем наличие скрипта для free tier
          if (
            data.script &&
            typeof data.script === "object" &&
            data.script !== null
          ) {
            const scriptData = data.script as ScriptData;
            console.log("📜 Free tier script received:", scriptData.name);
            this.callbacks.onScriptReceived?.(scriptData);
          }
        }
      }

      this.updateConnectionStatus(true);
      console.log("✅ Successfully connected to server");

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
      console.error("❌ Connection failed:", error);
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
        console.log("📡 Session data sent to frontend server");
      } else {
        console.warn("⚠️ Failed to send session to frontend server");
      }
    } catch (error) {
      console.warn("⚠️ Frontend server communication error:", error);
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

    console.log("🔄 Starting callback polling...");

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
          console.log(
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
    console.log(`📞 Server Callback: ${callback.instruction.action}`);

    // Notify callback listeners
    this.callbacks.onServerPing?.(callback);

    // Handle different types of callbacks
    if (callback.instruction.action === "verify_connection") {
      console.log("📡 Connection verification ping received");

      // Handle ping data if present
      if (callback.instruction.data) {
        this.processPingData(callback.instruction.data);
      }
    }
  }

  /**
   * Process ping data from server
   */
  private processPingData(data: unknown): void {
    console.log("📡 Processing ping data:", data);

    // Log subscription data availability
    if (typeof data === "object" && data !== null) {
      const dataObj = data as Record<string, unknown>;
      console.log("🔍 Ping data keys:", Object.keys(dataObj));
      console.log("🔍 Has subscription data:", !!dataObj.subscription);
      console.log("🔍 Has NFT+Script pairs:", !!dataObj.nftScriptPairs);
      if (dataObj.subscription) {
        console.log("🔍 Subscription data:", dataObj.subscription);
      }
    }

    // Type guard for data object
    if (typeof data !== "object" || data === null) {
      return;
    }

    const dataObj = data as Record<string, unknown>;

    // Handle NFT+Script pairs (new format)
    if (Array.isArray(dataObj.nftScriptPairs)) {
      console.log(
        `🖼️ Processing ${dataObj.nftScriptPairs.length} NFT+Script pairs from ping`
      );

      // Initialize nftScriptPairs array if it doesn't exist
      if (typeof window !== "undefined") {
        const windowWithNFT = window as typeof window & {
          nftScriptPairs?: Array<unknown>;
        };
        if (!windowWithNFT.nftScriptPairs) {
          windowWithNFT.nftScriptPairs = [];
          console.log("🆕 Initialized NFT+Script pairs array from ping");
        }
      }

      // Clear existing pairs to avoid duplicates on ping updates
      (
        window as typeof window & { nftScriptPairs?: Array<unknown> }
      ).nftScriptPairs = [];

      dataObj.nftScriptPairs.forEach(
        (pair: Record<string, unknown>, index: number) => {
          const nft = pair.nft as Record<string, unknown>;
          const script = pair.script as Record<string, unknown>;

          if (nft && script) {
            console.log(`📦 Pair ${index + 1}:`, {
              nftName: (nft.metadata as Record<string, unknown>)?.name,
              scriptName: script.name as string,
              maxProfiles: pair.maxProfiles as number,
            });

            // Create NFT data - use the exact format from backend
            const nftData: NFTData = {
              address: (nft.address as string) || "",
              image: (nft.image as string) || "",
              metadata: (nft.metadata as NFTData["metadata"]) || {},
              timestamp: (nft.timestamp as number) || Date.now(),
              subscription: (nft.subscription as NFTData["subscription"]) || {
                maxProfiles: (pair.maxProfiles as number) || 0,
                subscriptionLevel: "nft_holder",
                features: (script.features as string[]) || [],
              },
            };

            // Create script data - use the exact format from backend
            const scriptData: ScriptData = {
              id: (script.id as string) || "",
              name: (script.name as string) || "",
              version: (script.version as string) || "1.0.0",
              features: (script.features as string[]) || [],
              code: (script.code as string) || (script.content as string) || "",
              content: (script.content as string) || "",
              maxProfiles: (pair.maxProfiles as number) || 0,
              metadata: (script.metadata as ScriptData["metadata"]) || {
                description: (script.description as string) || "",
                author: (script.author as string) || "System",
                created: (script.created as string) || new Date().toISOString(),
                updated: (script.updated as string) || new Date().toISOString(),
                entryPoint: (script.entryPoint as string) || "index.js",
                category: (script.category as string) || "",
              },
            };

            // Store in window for component access
            if (typeof window !== "undefined") {
              const windowWithNFT = window as typeof window & {
                nftScriptPairs?: Array<unknown>;
              };
              windowWithNFT.nftScriptPairs?.push({
                nft: nftData,
                script: scriptData,
                maxProfiles: pair.maxProfiles,
                nftInfo: pair.nftInfo,
              });
              console.log(
                `✅ Added new NFT+Script pair from ping: ${scriptData.name} for NFT ${nftData.address}`
              );
            }

            // Trigger callbacks for all pairs to update UI
            console.log(
              "🖼️ NFT data received from SERVER API SERVICE:",
              nftData
            );
            console.log(
              "📊 Subscription data from SERVER API:",
              nftData.subscription
            );
            this.callbacks.onNFTReceived?.(nftData);
            this.callbacks.onScriptReceived?.(scriptData);
          }
        }
      );
    }

    // Handle legacy NFT data (backward compatibility)
    if (
      dataObj.nft &&
      typeof dataObj.nft === "object" &&
      dataObj.nft !== null &&
      !Array.isArray(dataObj.nftScriptPairs)
    ) {
      const nftObj = dataObj.nft as Record<string, unknown>;
      if (typeof nftObj.image === "string") {
        const nftData: NFTData = {
          address: typeof nftObj.address === "string" ? nftObj.address : "",
          image: nftObj.image,
          metadata: nftObj.metadata as NFTData["metadata"],
          timestamp: Date.now(),
        };

        // Add subscription data if present
        if (dataObj.subscription && typeof dataObj.subscription === "object") {
          const subscription = dataObj.subscription as Record<string, unknown>;
          nftData.subscription = {
            maxProfiles:
              typeof subscription.maxProfiles === "number"
                ? subscription.maxProfiles
                : 0,
            subscriptionLevel:
              typeof subscription.subscriptionLevel === "string"
                ? subscription.subscriptionLevel
                : "basic",
            features: Array.isArray(subscription.features)
              ? subscription.features
              : [],
          };
          console.log(
            `📊 NFT subscription data: ${nftData.subscription.maxProfiles} max profiles`
          );
        }

        console.log("🖼️ NFT data received from ping (legacy)");
        this.callbacks.onNFTReceived?.(nftData);
      }
    }

    // Handle legacy script data (backward compatibility)
    if (
      dataObj.script &&
      typeof dataObj.script === "object" &&
      dataObj.script !== null &&
      !Array.isArray(dataObj.nftScriptPairs)
    ) {
      console.log("📜 Script data received from ping (legacy)");

      // Детальное логирование скрипта
      const script = dataObj.script as ScriptData;
      console.log(" SCRIPT DATA ANALYSIS:");
      console.log("- Script name:", script.name);
      console.log("- Script version:", script.version);
      console.log("- Script features:", script.features);
      console.log("- Code length:", script.code?.length || 0);
      console.log(
        "- Code preview:",
        script.code?.substring(0, 20) + "..." || "No code"
      );

      this.callbacks.onScriptReceived?.(script);
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

    console.log("🔌 Disconnected from server");
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
}) {
  serverApiService.setCallbacks(callbacks);
}
