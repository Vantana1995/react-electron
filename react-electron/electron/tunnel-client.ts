import { Socket } from "socket.io-client";
import { BrowserWindow } from "electron";
import { logger } from "./logger";

/**
 * Tunnel Client - WebSocket client for persistent connection to backend
 * using Socket.IO with robust reconnection and authentication
 */

interface TunnelConfig {
  serverUrl: string;
  deviceHash: string;
  walletAddress?: string;
  deviceData?: {
    cpuModel: string;
    ipAddress: string;
  };
}

interface TunnelMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export class TunnelClient {
  private socket: Socket | null = null;
  private config: TunnelConfig | null = null;
  private win: BrowserWindow | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 32000; // Max 32 seconds
  private isAuthenticated = false;
  private messageQueue: TunnelMessage[] = [];

  constructor(win: BrowserWindow) {
    this.win = win;
  }

  /**
   * Connect to tunnel server
   */
  async connect(config: TunnelConfig): Promise<boolean> {
    this.config = config;

    try {
      logger.log(`[TUNNEL-CLIENT-ELECTRON] Server URL: ${config.serverUrl}`);

      // Dynamically import of socket.io-client
      logger.log(` [TUNNEL-CLIENT-ELECTRON] Importing socket.io-client...`);
      const { io: socketIO } = await import("socket.io-client");
      logger.log(` [TUNNEL-CLIENT-ELECTRON] socket.io-client imported`);

      logger.log(` [TUNNEL-CLIENT-ELECTRON] Creating Socket.IO instance...`);
      this.socket = socketIO(config.serverUrl, {
        path: "/tunnel",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: this.maxReconnectDelay,
        timeout: 10000,
        autoConnect: false,
        forceNew: true,
        upgrade: true,
      });

      logger.log(` [TUNNEL-CLIENT-ELECTRON] Socket.IO instance created`);

      logger.log(` [TUNNEL-CLIENT-ELECTRON] Setting up event handlers...`);
      this.setupEventHandlers();
      logger.log(` [TUNNEL-CLIENT-ELECTRON] Event handlers set up`);

      // Event listeners for debugging
      this.socket.io.on("error", (error: Error) => {
        logger.error(
          " [TUNNEL-CLIENT-ELECTRON] Socket.IO Manager error:",
          error.message
        );
        logger.error(" [TUNNEL-CLIENT-ELECTRON] Error stack:", error.stack);
      });

      this.socket.io.on("reconnect_attempt", (attempt: number) => {
        logger.log(
          ` [TUNNEL-CLIENT-ELECTRON] Reconnection attempt ${attempt}...`
        );
      });

      this.socket.io.on("ping", () => {
        logger.log(" [TUNNEL-CLIENT-ELECTRON] Socket.IO PING sent");
      });

      this.socket.io.on("pong", (ms: number) => {
        logger.log(
          ` [TUNNEL-CLIENT-ELECTRON] Socket.IO PONG received (${ms}ms)`
        );
      });

      return new Promise((resolve, reject) => {
        logger.log(` [TUNNEL-CLIENT-ELECTRON] Setting up timeout (30s)...`);

        const timeout = setTimeout(() => {
          logger.error(" [TUNNEL-CLIENT-ELECTRON] Connection timeout (30s)");
          logger.error(
            ` [TUNNEL-CLIENT-ELECTRON] Socket connected: ${
              this.socket?.connected || false
            }`
          );
          logger.error(
            ` [TUNNEL-CLIENT-ELECTRON] Socket ID: ${this.socket?.id || "none"}`
          );
          logger.error(
            ` [TUNNEL-CLIENT-ELECTRON] Socket disconnected: ${
              this.socket?.disconnected || false
            }`
          );
          logger.error(
            ` [TUNNEL-CLIENT-ELECTRON] Transport: ${
              this.socket?.io.engine?.transport?.name || "none"
            }`
          );
          this.socket?.disconnect();
          resolve(false);
        }, 15000);

        // successful authentication
        this.socket?.once("server:authenticated", (data: any) => {
          logger.log(
            " [TUNNEL-CLIENT-ELECTRON] Authentication success event received"
          );
          clearTimeout(timeout);
          logger.log(
            " [TUNNEL-CLIENT-ELECTRON] Authenticated:",
            JSON.stringify(data)
          );
          this.isAuthenticated = true;
          resolve(true);
        });

        // Error during authentication
        this.socket?.once("server:error", (data: any) => {
          logger.error(" [TUNNEL-CLIENT-ELECTRON] Server error event received");
          clearTimeout(timeout);
          logger.error(
            " [TUNNEL-CLIENT-ELECTRON] Auth error:",
            data.message || "Unknown error"
          );
          this.socket?.disconnect();
          resolve(false);
        });

        // Ошибка подключения
        this.socket?.on("connect_error", (error: Error) => {
          logger.error(
            " [TUNNEL-CLIENT-ELECTRON] Connection error:",
            error.message
          );
          logger.error(" [TUNNEL-CLIENT-ELECTRON] Error type:", error.name);
          logger.error(
            " [TUNNEL-CLIENT-ELECTRON] Error details:",
            JSON.stringify(error, Object.getOwnPropertyNames(error))
          );
        });

        // Connected
        this.socket?.once("connect", () => {
          logger.log(" [TUNNEL-CLIENT-ELECTRON] Socket.IO connected!");
          logger.log(` [TUNNEL-CLIENT-ELECTRON] Socket ID: ${this.socket?.id}`);
          logger.log(
            ` [TUNNEL-CLIENT-ELECTRON] Transport: ${this.socket?.io.engine?.transport?.name}`
          );
          logger.log(
            ` [TUNNEL-CLIENT-ELECTRON] Connected: ${this.socket?.connected}`
          );
          logger.log(" [TUNNEL-CLIENT-ELECTRON] Sending authentication...");
          this.authenticate();
        });

        // Starting connection
        logger.log(" [TUNNEL-CLIENT-ELECTRON] Calling socket.connect()...");
        logger.log(
          ` [TUNNEL-CLIENT-ELECTRON] Target: ${config.serverUrl}/tunnel`
        );

        try {
          this.socket?.connect();
          logger.log(
            " [TUNNEL-CLIENT-ELECTRON] socket.connect() called successfully"
          );
        } catch (error) {
          logger.error(
            " [TUNNEL-CLIENT-ELECTRON] socket.connect() threw error:",
            error
          );
          clearTimeout(timeout);
          resolve(false);
        }
      });
    } catch (error) {
      logger.error(" [TUNNEL-CLIENT-ELECTRON] Failed to connect:", error);
      logger.error(
        " [TUNNEL-CLIENT-ELECTRON] Error stack:",
        (error as Error).stack
      );
      return false;
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on("connect", () => {
      logger.log("[TUNNEL-CLIENT-ELECTRON] connected to server");
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Authenticate
      this.authenticate();
    });

    // Authentication success
    this.socket.on("server:authenticated", (data: any) => {
      logger.log("✅ Tunnel authenticated:", data);
      this.isAuthenticated = true;

      // Process queued messages
      this.processMessageQueue();

      // Notify renderer
      if (this.win) {
        this.win.webContents.send("tunnel-connected", {
          success: true,
          userId: data.userId,
          deviceHash: data.deviceHash,
          timestamp: Date.now(),
        });
      }
    });

    // Script delivery (ONE TIME after authentication)
    this.socket.on("server:script-delivery", (data: any) => {
      logger.log("📜 Script delivery received from tunnel");

      // Decrypt if needed (using existing encryption module)
      if (data.encrypted && this.config?.deviceData) {
        try {
          // Import encryption utilities
          import("../src/utils/encryption").then((encryptionModule) => {
            const { decryptData, generateDeviceKey } = encryptionModule;

            const cpuModel = this.config?.deviceData?.cpuModel || "unknown";
            const ipAddress = this.config?.deviceData?.ipAddress || "unknown";
            const deviceKey = generateDeviceKey(cpuModel, ipAddress);
            const decryptedData = decryptData(data.encrypted, deviceKey);

            // Forward to renderer as server-ping-received (for compatibility)
            this.forwardToRenderer("server-ping-received", {
              action: "script_data",
              data: decryptedData,
              timestamp: Date.now(),
            });
          });
        } catch (error) {
          logger.error("❌ Failed to decrypt script data:", error);
        }
      } else {
        // Forward unencrypted data
        this.forwardToRenderer("server-ping-received", {
          action: "script_data",
          data: data,
          timestamp: Date.now(),
        });
      }
    });

    // Server updates
    this.socket.on("server:update", (data: any) => {
      logger.log("📡 Server update received");
      this.forwardToRenderer("server-ping-received", {
        action: "ping_data",
        data,
        timestamp: Date.now(),
      });
    });

    // Disconnect from server
    this.socket.on("server:disconnect", (data: any) => {
      logger.log("🔌 Server requested disconnect:", data.reason);
      this.isAuthenticated = false;

      if (this.win) {
        this.win.webContents.send("tunnel-disconnected", {
          reason: data.reason,
          timestamp: Date.now(),
        });
      }
    });

    // Connection errors
    this.socket.on("server:error", (error: any) => {
      logger.error("❌ Tunnel error:", error.message);

      if (this.win) {
        this.win.webContents.send("tunnel-error", {
          error: error.message,
          timestamp: Date.now(),
        });
      }
    });

    // Disconnected
    this.socket.on("disconnect", (reason) => {
      logger.log(`  [TUNNEL-CLIENT-ELECTRON] Tunnel disconnected: ${reason}`);
      this.isAuthenticated = false;

      // Notify renderer
      if (this.win) {
        this.win.webContents.send("tunnel-disconnected", {
          reason,
          timestamp: Date.now(),
        });
      }
    });

    // Reconnecting
    this.socket.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, attempt - 1),
        this.maxReconnectDelay
      );
      logger.log(
        `🔄 Reconnecting to tunnel... (attempt ${attempt}, delay: ${delay}ms)`
      );
    });

    // Reconnected
    this.socket.on("reconnect", (attempt) => {
      logger.log(`✅ Tunnel reconnected after ${attempt} attempts`);
      this.reconnectAttempts = 0;
    });

    // Reconnection failed
    this.socket.on("reconnect_failed", () => {
      logger.error("❌ Tunnel reconnection failed after max attempts");

      if (this.win) {
        this.win.webContents.send("tunnel-reconnect-failed", {
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Authenticate with server
   */
  private authenticate(): void {
    if (!this.socket || !this.config) return;

    logger.log(
      `[TUNNEL-CLIENT-ELECTRON] Authenticating with deviceHash: ${this.config.deviceHash.substring(
        0,
        8
      )}...`
    );

    const authPayload = {
      deviceHash: this.config.deviceHash,
      walletAddress: this.config.walletAddress,
      deviceData: this.config.deviceData,
    };
    this.socket.emit("client:authenticate", authPayload);
  }

  /**
   * Forward message to renderer process
   */
  private forwardToRenderer(channel: string, data: any): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, data);
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(message: TunnelMessage): void {
    this.messageQueue.push(message);
    logger.log(
      `[TUNNEL-CLIENT-ELECTRON] Message queued (${this.messageQueue.length} in queue)`
    );
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    logger.log(
      `[TUNNEL-CLIENT-ELECTRON] Processing ${this.messageQueue.length} queued messages...`
    );

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.forwardToRenderer(message.type, message.payload);
      }
    }
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any): void {
    if (!this.socket || !this.socket.connected) {
      logger.warn(
        "[TUNNEL-CLIENT-ELECTRON] Socket not connected, queuing message"
      );
      this.queueMessage({ type, payload, timestamp: Date.now() });
      return;
    }

    if (!this.isAuthenticated) {
      logger.warn(
        "[TUNNEL-CLIENT-ELECTRON] Not authenticated, queuing message"
      );
      this.queueMessage({ type, payload, timestamp: Date.now() });
      return;
    }

    this.socket.emit(type, payload);
  }

  /**
   * Disconnect from tunnel
   */
  disconnect(): void {
    if (this.socket) {
      logger.log("[TUNNEL-CLIENT-ELECTRON] Disconnecting tunnel...");
      this.socket.disconnect();
      this.socket = null;
    }

    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return Boolean(this.socket?.connected && this.isAuthenticated);
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    authenticated: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
  } {
    return {
      connected: Boolean(this.socket?.connected),
      authenticated: this.isAuthenticated,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }
}

export default TunnelClient;
