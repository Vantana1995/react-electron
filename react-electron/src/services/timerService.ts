/**
 * Timer Service
 * TypeScript service for handling nonce validation and ping timeout functionality
 */

import { TimerState, ElectronAPI } from "../types";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export class TimerService {
  private currentNonce: number = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private firstPingReceived: boolean = false;
  private expectedNonce: number = 1;
  private timeRemaining: number = 40;
  private callbacks: {
    onNonceUpdate?: (nonce: number) => void;
    onTimeout?: () => void;
  } = {};

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for ping events
   */
  private setupEventListeners(): void {
    if (typeof window !== "undefined" && window.electronAPI) {
      // Listen for ping counter updates from main process
      window.electronAPI.onPingCounterUpdate(
        (data: { nonce: number; timestamp: number }) => {
          console.log(`🔢 Counter update received: ${data.nonce}`);
          this.updateNonce(data.nonce);
          this.resetPingTimer();
        }
      );
    }
  }

  /**
   * Update nonce display and validation
   */
  updateNonce(nonce: number): void {
    this.currentNonce = nonce;
    console.log(`🔢 Server nonce updated: ${nonce}`);

    // Notify callback
    this.callbacks.onNonceUpdate?.(nonce);
  }


  /**
   * Clear cache and close application
   */
  private async clearCacheAndClose(): Promise<void> {
    try {
      console.log("🧹 Clearing application cache...");

      // Clear all timers
      this.clearAllTimers();

      // Clear localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        console.log("✅ localStorage cleared");
      }

      // Clear sessionStorage
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.clear();
        console.log("✅ sessionStorage cleared");
      }

      // Clear any cached data
      if (typeof window !== "undefined" && "caches" in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
          console.log("✅ Browser cache cleared");
        } catch (error) {
          console.warn("⚠️ Could not clear browser caches:", error);
        }
      }

      console.log(
        "🔒 Application closing due to ping timeout or security violation"
      );

      // Close the application
      if (window.electronAPI) {
        await window.electronAPI.closeApp();
      }
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      // Force close even if cleanup fails
      if (window.electronAPI) {
        await window.electronAPI.closeApp();
      }
    }
  }

  /**
   * Start ping timeout timer (40 seconds)
   */
  startPingTimer(): void {
    // Clear existing timers
    this.clearAllTimers();

    // Reset time remaining
    this.timeRemaining = 40;

    console.log("⏰ Starting 40-second ping timer...");

    // Start countdown
    this.countdownTimer = setInterval(() => {
      this.timeRemaining--;

      if (this.timeRemaining <= 0) {
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }
    }, 1000);

    // Set main timeout
    this.pingTimer = setTimeout(() => {
      this.clearCacheAndClose();
      this.callbacks.onTimeout?.();
    }, 40000); // 40 seconds
  }

  /**
   * Reset ping timer (called on each ping)
   */
  resetPingTimer(): void {
    this.clearAllTimers();

    // Restart timer
    this.startPingTimer();

    if (this.firstPingReceived) {
      console.log("⏰ Ping timer reset");
    } else {
      this.firstPingReceived = true;
      console.log("⏰ Ping timer started after first ping");
    }
  }

  /**
   * Validate nonce from server ping
   */
  validateNonce(receivedNonce: number): boolean {
    if (!this.firstPingReceived) {
      // First ping should have nonce 1
      if (receivedNonce === this.expectedNonce) {
        this.firstPingReceived = true;
        this.expectedNonce = receivedNonce + 1; // Next expected nonce
        console.log(`✅ First ping validated - nonce: ${receivedNonce}`);
        return true;
      } else {
        console.error(
          `❌ Invalid first ping nonce: expected ${this.expectedNonce}, received ${receivedNonce}`
        );
        this.clearCacheAndClose();
        return false;
      }
    } else {
      // Subsequent pings should increment by 1
      if (receivedNonce === this.expectedNonce) {
        this.expectedNonce = receivedNonce + 1; // Update expected nonce
        console.log(`✅ Ping nonce validated: ${receivedNonce}`);
        return true;
      } else {
        console.error(
          `❌ Invalid ping nonce: expected ${this.expectedNonce}, received ${receivedNonce}`
        );
        this.clearCacheAndClose();
        return false;
      }
    }
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Get current timer state
   */
  getTimerState(): TimerState {
    return {
      value: this.currentNonce,
      running: this.pingTimer !== null,
      timeout: this.timeRemaining,
    };
  }

  /**
   * Get current nonce
   */
  getCurrentNonce(): number {
    return this.currentNonce;
  }

  /**
   * Get time remaining
   */
  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  /**
   * Check if first ping was received
   */
  isFirstPingReceived(): boolean {
    return this.firstPingReceived;
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks: {
    onNonceUpdate?: (nonce: number) => void;
    onTimeout?: () => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Force stop all timers (for cleanup)
   */
  stop(): void {
    this.clearAllTimers();
    this.firstPingReceived = false;
    this.expectedNonce = 1;
    this.timeRemaining = 40;
    this.currentNonce = 0;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.callbacks = {};

    if (window.electronAPI) {
      window.electronAPI.removeAllListeners("ping-counter-update");
    }
  }
}

// Create singleton instance
export const timerService = new TimerService();

// Export utility functions
export function startPingTimer(): void {
  timerService.startPingTimer();
}

export function resetPingTimer(): void {
  timerService.resetPingTimer();
}

export function validateNonce(nonce: number): boolean {
  return timerService.validateNonce(nonce);
}

export function updateNonce(nonce: number): void {
  timerService.updateNonce(nonce);
}

export function getTimerState(): TimerState {
  return timerService.getTimerState();
}

export function getCurrentNonce(): number {
  return timerService.getCurrentNonce();
}

export function getTimeRemaining(): number {
  return timerService.getTimeRemaining();
}

export function setTimerCallbacks(callbacks: {
  onNonceUpdate?: (nonce: number) => void;
  onTimeout?: () => void;
}): void {
  timerService.setCallbacks(callbacks);
}

export async function clearCacheAndClose(): Promise<void> {
  // This is now private in the service, but we can trigger it via timeout
  timerService.stop();
  if (window.electronAPI) {
    await window.electronAPI.closeApp();
  }
}
