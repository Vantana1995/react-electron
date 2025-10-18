/**
 * Wallet Service
 * TypeScript service for handling wallet connection and authentication
 */

import { WalletConnectionStatus, AuthResult, ElectronAPI } from "../types";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export class WalletService {
  private sessionToken: string | null = null;
  private walletAddress: string | null = null;
  private isConnected: boolean = false;
  private statusCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for wallet events
   */
  private setupEventListeners(): void {
    if (typeof window !== "undefined" && window.electronAPI) {
      // Listen for wallet connection events from main process
      window.electronAPI.onWalletConnected((data: any) => {
        console.log("📨 Wallet connection event received:", data);
        this.handleWalletConnected(data);
      });

      // Listen for auth ready events
      window.electronAPI.onAuthReady((data: any) => {
        console.log("🔐 Authentication system ready:", data);
      });
    }
  }

  /**
   * Connect to wallet through Electron main process
   */
  async connectWallet(): Promise<WalletConnectionStatus> {
    try {
      console.log("🔐 Starting wallet authentication flow...");

      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }

      // Start authentication flow
      const result: AuthResult = await window.electronAPI.startWalletAuth();

      if (result.success) {
        this.sessionToken = result.sessionToken || null;

        // Start checking wallet status
        this.startStatusCheck();

        return {
          isConnected: false, // Will be true when wallet actually connects
          sessionToken: this.sessionToken || undefined,
        };
      } else {
        throw new Error(result.error || "Authentication failed");
      }
    } catch (error) {
      console.error("❌ Connection failed:", error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<{ success: boolean; message: string }> {
    try {
      console.log("🔌 Disconnecting wallet...");

      if (!window.electronAPI || !this.sessionToken) {
        this.resetWalletState();
        return { success: true, message: "Wallet disconnected" };
      }

      const result = await window.electronAPI.disconnectWallet(
        this.sessionToken
      );

      if (result.success) {
        this.resetWalletState();
        console.log("✅ Wallet disconnected successfully");
      }

      return result;
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Disconnect failed",
      };
    }
  }

  /**
   * Check current wallet status
   */
  async getWalletStatus(): Promise<WalletConnectionStatus> {
    if (!this.sessionToken || !window.electronAPI) {
      return { isConnected: false };
    }

    try {
      const result = await window.electronAPI.getWalletStatus(
        this.sessionToken
      );

      if (result.isConnected && result.walletAddress) {
        // Update internal state if wallet is connected
        if (!this.isConnected || this.walletAddress !== result.walletAddress) {
          this.walletAddress = result.walletAddress;
          this.isConnected = true;

          console.log(
            `💰 Wallet connected: ${this.walletAddress.substring(
              0,
              6
            )}...${this.walletAddress.substring(this.walletAddress.length - 4)}`
          );

          // Notify about connection only if state changed
          if (!this.isConnected) {
            this.onWalletConnected?.({
              address: this.walletAddress,
              sessionToken: this.sessionToken || undefined,
            });
          }
        }
      } else if (this.isConnected) {
        // Wallet was disconnected
        this.resetWalletState();
        this.onWalletDisconnected?.();
      }

      return {
        isConnected: result.isConnected || false,
        walletAddress: result.walletAddress,
        sessionToken: this.sessionToken,
      };
    } catch (error) {
      console.error("❌ Status check failed:", error);
      return {
        isConnected: false,
        error: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  /**
   * Handle wallet connection event from main process
   */
  private handleWalletConnected(data: {
    address: string;
    sessionToken?: string;
  }): void {
    console.log(`📨 Wallet connection event: ${data.address}`);

    this.walletAddress = data.address;
    this.isConnected = true;

    if (data.sessionToken) {
      this.sessionToken = data.sessionToken;
    }

    // Notify listeners
    this.onWalletConnected?.(data);
  }

  /**
   * Reset wallet state
   */
  private resetWalletState(): void {
    this.walletAddress = null;
    this.isConnected = false;
    this.sessionToken = null;

    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  /**
   * Start periodic status check
   */
  private startStatusCheck(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    this.statusCheckInterval = setInterval(async () => {
      const currentStatus = await this.getWalletStatus();

      // Проверяем изменения состояния перед вызовом callbacks
      if (currentStatus.isConnected !== this.isConnected) {
        // Состояние изменилось
        if (currentStatus.isConnected) {
          this.onWalletConnected?.({
            address: currentStatus.walletAddress || "",
            sessionToken: currentStatus.sessionToken,
          });
        } else {
          this.onWalletDisconnected?.();
        }
      }
    }, 5000); // Увеличиваем интервал до 5 секунд
  }

  /**
   * Stop status check
   */
  private stopStatusCheck(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): WalletConnectionStatus {
    return {
      isConnected: this.isConnected,
      walletAddress: this.walletAddress || undefined,
      sessionToken: this.sessionToken || undefined,
    };
  }

  /**
   * Event handler for wallet connection (can be overridden)
   */
  onWalletConnected?: (data: {
    address: string;
    sessionToken?: string;
  }) => void;

  /**
   * Event handler for wallet disconnection (can be overridden)
   */
  onWalletDisconnected?: () => void = async () => {
    // Wallet disconnected - cleanup can be added here if needed
  };

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStatusCheck();
    this.resetWalletState();

    if (window.electronAPI) {
      window.electronAPI.removeAllListeners("wallet-connected");
      window.electronAPI.removeAllListeners("auth-ready");
    }
  }
}

// Create singleton instance
export const walletService = new WalletService();

// Export utility functions
export async function connectWallet(): Promise<WalletConnectionStatus> {
  return walletService.connectWallet();
}

export async function disconnectWallet(): Promise<{
  success: boolean;
  message: string;
}> {
  return walletService.disconnectWallet();
}

export async function getWalletStatus(): Promise<WalletConnectionStatus> {
  return walletService.getWalletStatus();
}

export function getConnectionStatus(): WalletConnectionStatus {
  return walletService.getConnectionStatus();
}
