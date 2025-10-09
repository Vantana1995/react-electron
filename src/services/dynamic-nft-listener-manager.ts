/**
 * Dynamic NFT Listener Manager
 * Manages multiple NFT contract listeners dynamically
 * Automatically starts/stops listeners based on active scripts
 */

import { ethers } from "ethers";
import { getDBConnection } from "@/config/database";
import { ScriptModel } from "@/database/models/Script";
import { handleNFTMint } from "@/utils/nft-event-handler";

// Configuration
const ALCHEMY_WSS_URL =
  "wss://eth-sepolia.g.alchemy.com/v2/OrVnzsLq4Nnt8B0SIP5471lFMfw0OnYA";

// ERC-721 Transfer event ABI
const TRANSFER_EVENT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

interface NFTContractListener {
  contractAddress: string;
  provider: ethers.WebSocketProvider | null;
  contract: ethers.Contract | null;
  isListening: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  startedAt: Date;
  lastEventAt: Date | null;
}

interface ListenerStatus {
  contractAddress: string;
  isListening: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  uptime: number; // seconds
  lastEventAt: Date | null;
}

/**
 * Dynamic NFT Listener Manager
 * Manages multiple NFT contract listeners based on active scripts
 */
export class DynamicNFTListenerManager {
  private listeners: Map<string, NFTContractListener> = new Map();
  private isRunning: boolean = false;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAY = 5000; // 5 seconds
  private readonly ERROR_RETRY_DELAY = 10000; // 10 seconds - only retry on error

  constructor() {
    console.log("🎨 Dynamic NFT Listener Manager initialized");
  }

  /**
   * Start the manager and all required listeners
   * Listeners will run continuously via WebSocket
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Dynamic NFT Listener Manager already running");
      return;
    }

    console.log("🚀 Starting Dynamic NFT Listener Manager...");
    this.isRunning = true;

    // Start initial listeners based on current scripts
    // Listeners will remain active continuously
    await this.refreshListeners();

    console.log("✅ Dynamic NFT Listener Manager started - listeners running continuously");
  }

  /**
   * Stop the manager and all listeners
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("⚠️ Dynamic NFT Listener Manager not running");
      return;
    }

    console.log("🛑 Stopping Dynamic NFT Listener Manager...");
    this.isRunning = false;

    // Stop all listeners
    await this.stopAllListeners();

    console.log("✅ Dynamic NFT Listener Manager stopped");
  }

  /**
   * Refresh listeners based on current active scripts
   * NOTE: This runs continuously via WebSocket - listeners stay active until stopped
   * Only called on:
   * - Initial startup
   * - Manual refresh request
   * - Error recovery (auto-reconnect)
   */
  async refreshListeners(): Promise<void> {
    try {
      console.log("🔄 Syncing NFT listeners with active scripts...");

      const db = getDBConnection();
      const scriptModel = new ScriptModel(db);

      // Get all unique NFT addresses from active scripts
      const nftAddresses = await scriptModel.getAllNFTAddresses();

      console.log(
        `📋 Found ${nftAddresses.length} unique NFT contract(s) in active scripts`
      );

      // Start listeners for new contracts (will run continuously)
      for (const contractAddress of nftAddresses) {
        if (!this.listeners.has(contractAddress)) {
          await this.startListener(contractAddress);
        }
      }

      // Stop listeners for contracts no longer needed
      const activeAddresses = new Set(nftAddresses);
      for (const [contractAddress, listener] of this.listeners) {
        if (!activeAddresses.has(contractAddress)) {
          console.log(
            `🗑️ Stopping listener for unused contract: ${contractAddress}`
          );
          await this.stopListener(contractAddress);
        }
      }

      console.log(
        `✅ Listener sync complete: ${this.listeners.size} continuous listeners active`
      );
      console.log(
        `📡 WebSocket connections: ${this.listeners.size} (max ~10 per provider recommended)`
      );
    } catch (error) {
      console.error("❌ Error syncing listeners:", error);
    }
  }

  /**
   * Start listener for specific contract
   */
  private async startListener(contractAddress: string): Promise<void> {
    try {
      console.log(`🎧 Starting listener for contract: ${contractAddress}`);

      const listener: NFTContractListener = {
        contractAddress,
        provider: null,
        contract: null,
        isListening: false,
        reconnectAttempts: 0,
        lastError: null,
        startedAt: new Date(),
        lastEventAt: null,
      };

      // Create WebSocket provider
      listener.provider = new ethers.WebSocketProvider(ALCHEMY_WSS_URL);

      // Create contract interface
      const contractInterface = new ethers.Interface(TRANSFER_EVENT_ABI);
      listener.contract = new ethers.Contract(
        contractAddress,
        contractInterface,
        listener.provider
      );

      // Set up event listener
      this.setupEventListener(listener);

      // Set up WebSocket error handlers
      this.setupWebSocketHandlers(listener);

      listener.isListening = true;
      this.listeners.set(contractAddress, listener);

      console.log(`✅ Listener started for contract: ${contractAddress}`);
    } catch (error) {
      console.error(
        `❌ Failed to start listener for ${contractAddress}:`,
        error
      );
      this.scheduleReconnect(contractAddress);
    }
  }

  /**
   * Stop listener for specific contract
   */
  private async stopListener(contractAddress: string): Promise<void> {
    const listener = this.listeners.get(contractAddress);
    if (!listener) {
      return;
    }

    try {
      // Remove all listeners
      if (listener.contract) {
        listener.contract.removeAllListeners();
      }

      // Close provider
      if (listener.provider) {
        listener.provider.removeAllListeners();
        listener.provider.destroy();
      }

      this.listeners.delete(contractAddress);
      console.log(`✅ Listener stopped for contract: ${contractAddress}`);
    } catch (error) {
      console.error(
        `❌ Error stopping listener for ${contractAddress}:`,
        error
      );
    }
  }

  /**
   * Stop all listeners
   */
  private async stopAllListeners(): Promise<void> {
    const contractAddresses = Array.from(this.listeners.keys());

    for (const contractAddress of contractAddresses) {
      await this.stopListener(contractAddress);
    }
  }

  /**
   * Set up event listener for contract
   */
  private setupEventListener(listener: NFTContractListener): void {
    if (!listener.contract) {
      console.error("❌ Contract not initialized");
      return;
    }

    // Listen to Transfer events
    listener.contract.on("Transfer", async (from, to, tokenId, event) => {
      try {
        // Filter: only mint events (from = 0x0)
        if (from === ethers.ZeroAddress) {
          console.log(
            `\n🎉 NFT MINT EVENT DETECTED for ${listener.contractAddress}!`
          );
          console.log(`📦 Token ID: ${tokenId.toString()}`);
          console.log(`👤 Recipient: ${to}`);
          console.log(`🔗 Transaction: ${event.log.transactionHash}`);

          // Update last event timestamp
          listener.lastEventAt = new Date();

          // Handle the mint event
          await handleNFTMint(to, tokenId.toString(), event);
        }
      } catch (error) {
        console.error(
          `❌ Error processing Transfer event for ${listener.contractAddress}:`,
          error
        );
        listener.lastError =
          error instanceof Error ? error.message : String(error);
      }
    });

    console.log(
      `✅ Event listener registered for contract: ${listener.contractAddress}`
    );
  }

  /**
   * Set up WebSocket connection handlers
   */
  private setupWebSocketHandlers(listener: NFTContractListener): void {
    if (!listener.provider) {
      return;
    }

    // Get WebSocket instance
    const websocket = (listener.provider as any)._websocket;

    if (websocket) {
      websocket.on("error", (error: Error) => {
        console.error(
          `❌ WebSocket error for ${listener.contractAddress}:`,
          error
        );
        listener.lastError = error.message;
        this.handleDisconnect(listener.contractAddress);
      });

      websocket.on("close", (code: number, reason: string) => {
        console.log(
          `🔌 WebSocket closed for ${listener.contractAddress} (code: ${code}, reason: ${reason})`
        );
        this.handleDisconnect(listener.contractAddress);
      });

      websocket.on("ping", () => {
        console.log(
          `🏓 WebSocket ping received for ${listener.contractAddress}`
        );
      });
    }

    // Provider-level error handling
    listener.provider.on("error", (error) => {
      console.error(
        `❌ Provider error for ${listener.contractAddress}:`,
        error
      );
      listener.lastError =
        error instanceof Error ? error.message : String(error);
      this.handleDisconnect(listener.contractAddress);
    });
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(contractAddress: string): void {
    const listener = this.listeners.get(contractAddress);
    if (!listener || !listener.isListening) {
      return;
    }

    console.log(
      `⚠️ NFT Listener disconnected for contract: ${contractAddress}`
    );
    listener.isListening = false;

    // Clean up
    this.cleanupListener(listener);

    // Schedule reconnect
    this.scheduleReconnect(contractAddress);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(contractAddress: string): void {
    const listener = this.listeners.get(contractAddress);
    if (!listener) {
      return;
    }

    if (listener.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(
        `❌ Max reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for ${contractAddress}. Giving up.`
      );
      this.listeners.delete(contractAddress);
      return;
    }

    listener.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * listener.reconnectAttempts;

    console.log(
      `🔄 Reconnecting ${contractAddress} in ${delay / 1000}s... (attempt ${
        listener.reconnectAttempts
      }/${this.MAX_RECONNECT_ATTEMPTS})`
    );

    setTimeout(() => {
      this.startListener(contractAddress);
    }, delay);
  }

  /**
   * Clean up listener resources
   */
  private cleanupListener(listener: NFTContractListener): void {
    try {
      // Remove all listeners
      if (listener.contract) {
        listener.contract.removeAllListeners();
        listener.contract = null;
      }

      // Close provider
      if (listener.provider) {
        listener.provider.removeAllListeners();
        listener.provider.destroy();
        listener.provider = null;
      }
    } catch (error) {
      console.error(
        `❌ Error during cleanup for ${listener.contractAddress}:`,
        error
      );
    }
  }

  /**
   * Manually refresh listeners (called on demand, not periodic)
   * Used when:
   * - New script added
   * - Script removed
   * - Manual trigger needed
   */
  async manualRefresh(): Promise<void> {
    console.log("🔄 Manual refresh triggered");
    await this.refreshListeners();
  }

  /**
   * Get status of all listeners
   */
  getStatus(): ListenerStatus[] {
    const now = new Date();

    return Array.from(this.listeners.values()).map((listener) => ({
      contractAddress: listener.contractAddress,
      isListening: listener.isListening,
      reconnectAttempts: listener.reconnectAttempts,
      lastError: listener.lastError,
      uptime: Math.floor((now.getTime() - listener.startedAt.getTime()) / 1000),
      lastEventAt: listener.lastEventAt,
    }));
  }

  /**
   * Get status of specific listener
   */
  getListenerStatus(contractAddress: string): ListenerStatus | null {
    const listener = this.listeners.get(contractAddress);
    if (!listener) {
      return null;
    }

    const now = new Date();
    return {
      contractAddress: listener.contractAddress,
      isListening: listener.isListening,
      reconnectAttempts: listener.reconnectAttempts,
      lastError: listener.lastError,
      uptime: Math.floor((now.getTime() - listener.startedAt.getTime()) / 1000),
      lastEventAt: listener.lastEventAt,
    };
  }

  /**
   * Force refresh listeners (for admin API)
   */
  async forceRefresh(): Promise<void> {
    console.log("🔄 Force refreshing listeners...");
    await this.refreshListeners();
  }

  /**
   * Get manager status
   */
  getManagerStatus(): {
    isRunning: boolean;
    totalListeners: number;
    activeListeners: number;
    listeners: ListenerStatus[];
  } {
    const listeners = this.getStatus();
    const activeListeners = listeners.filter((l) => l.isListening).length;

    return {
      isRunning: this.isRunning,
      totalListeners: listeners.length,
      activeListeners,
      listeners,
    };
  }
}

// Singleton instance
export const dynamicNFTListenerManager = new DynamicNFTListenerManager();

export default dynamicNFTListenerManager;
