/**
 * NFT Event Listener Service
 * Listens to NFT mint events and delivers scripts to users in real-time
 */

import { ethers } from "ethers";
import { handleNFTMint } from "@/utils/nft-event-handler";

// Contract configuration
const LEGION_NFT_CONTRACT = "0x9991Ef85B711Bc91B3ABbe62bD4eD10394C399BA";
const ALCHEMY_WSS_URL = "wss://eth-sepolia.g.alchemy.com/v2/OrVnzsLq4Nnt8B0SIP5471lFMfw0OnYA";

// ERC-721 Transfer event ABI
const TRANSFER_EVENT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

/**
 * NFT Event Listener
 * Singleton service that listens to NFT mint events via WebSocket
 */
export class NFTEventListener {
  private provider: ethers.WebSocketProvider | null = null;
  private contract: ethers.Contract | null = null;
  private isListening: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000; // 5 seconds

  constructor() {
    console.log("🎨 NFT Event Listener initialized");
  }

  /**
   * Start listening to NFT events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.log("⚠️ NFT Event Listener already running");
      return;
    }

    try {
      console.log("🚀 Starting NFT Event Listener...");
      console.log(`📡 Connecting to: ${ALCHEMY_WSS_URL.substring(0, 30)}...`);
      console.log(`📝 Contract: ${LEGION_NFT_CONTRACT}`);

      // Create WebSocket provider
      this.provider = new ethers.WebSocketProvider(ALCHEMY_WSS_URL);

      // Create contract interface
      const contractInterface = new ethers.Interface(TRANSFER_EVENT_ABI);
      this.contract = new ethers.Contract(
        LEGION_NFT_CONTRACT,
        contractInterface,
        this.provider
      );

      // Set up event listener
      this.setupEventListener();

      // Set up WebSocket error handlers
      this.setupWebSocketHandlers();

      this.isListening = true;
      this.reconnectAttempts = 0;

      console.log("✅ NFT Event Listener started successfully");
      console.log("👂 Listening for Transfer events (mint only)...");
    } catch (error) {
      console.error("❌ Failed to start NFT Event Listener:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Set up Transfer event listener
   */
  private setupEventListener(): void {
    if (!this.contract) {
      console.error("❌ Contract not initialized");
      return;
    }

    // Listen to Transfer events
    this.contract.on("Transfer", async (from, to, tokenId, event) => {
      try {
        // Filter: only mint events (from = 0x0)
        if (from === ethers.ZeroAddress) {
          console.log("\n🎉 NFT MINT EVENT DETECTED!");
          console.log(`📦 Token ID: ${tokenId.toString()}`);
          console.log(`👤 Recipient: ${to}`);
          console.log(`🔗 Transaction: ${event.log.transactionHash}`);
          console.log(`📊 Block: ${event.log.blockNumber}`);

          // Handle the mint event
          await handleNFTMint(to, tokenId.toString(), event);
        }
      } catch (error) {
        console.error("❌ Error processing Transfer event:", error);
      }
    });

    console.log("✅ Event listener registered for Transfer events");
  }

  /**
   * Set up WebSocket connection handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.provider) {
      return;
    }

    // Get WebSocket instance
    const websocket = (this.provider as any)._websocket;

    if (websocket) {
      websocket.on("error", (error: Error) => {
        console.error("❌ WebSocket error:", error);
        this.handleDisconnect();
      });

      websocket.on("close", (code: number, reason: string) => {
        console.log(`🔌 WebSocket closed (code: ${code}, reason: ${reason})`);
        this.handleDisconnect();
      });

      websocket.on("ping", () => {
        console.log("🏓 WebSocket ping received");
      });
    }

    // Provider-level error handling
    this.provider.on("error", (error) => {
      console.error("❌ Provider error:", error);
      this.handleDisconnect();
    });
  }

  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(): void {
    if (!this.isListening) {
      return; // Already handling disconnect
    }

    console.log("⚠️ NFT Event Listener disconnected");
    this.isListening = false;

    // Clean up
    this.cleanup();

    // Schedule reconnect
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `❌ Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `🔄 Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.start();
    }, delay);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    try {
      // Remove all listeners
      if (this.contract) {
        this.contract.removeAllListeners();
        this.contract = null;
      }

      // Close provider
      if (this.provider) {
        this.provider.removeAllListeners();
        this.provider.destroy();
        this.provider = null;
      }
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
    }
  }

  /**
   * Stop listening to events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      console.log("⚠️ NFT Event Listener not running");
      return;
    }

    console.log("🛑 Stopping NFT Event Listener...");
    this.isListening = false;
    this.cleanup();
    console.log("✅ NFT Event Listener stopped");
  }

  /**
   * Get listener status
   */
  getStatus(): {
    isListening: boolean;
    reconnectAttempts: number;
    contract: string;
  } {
    return {
      isListening: this.isListening,
      reconnectAttempts: this.reconnectAttempts,
      contract: LEGION_NFT_CONTRACT,
    };
  }
}

// Singleton instance
export const nftEventListener = new NFTEventListener();

// Auto-start (can be disabled if needed)
// nftEventListener.start();

export default nftEventListener;
