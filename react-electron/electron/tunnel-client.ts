import { io, Socket } from 'socket.io-client';
import { BrowserWindow } from 'electron';
import { logger } from './logger';

/**
 * Tunnel Client - WebSocket client for persistent connection to backend
 * Replaces HTTP callback polling with bidirectional tunnel
 */

interface TunnelConfig {
  serverUrl: string;
  deviceHash: string;
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
  private maxReconnectDelay = 30000; // Max 30 seconds
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
      logger.log(`🔌 Connecting to tunnel server: ${config.serverUrl}`);

      this.socket = io(config.serverUrl, {
        path: '/tunnel',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: this.maxReconnectDelay,
        timeout: 10000,
        autoConnect: true,
      });

      this.setupEventHandlers();

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.error('❌ Tunnel connection timeout');
          resolve(false);
        }, 10000);

        this.socket?.once('server:authenticated', () => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
    } catch (error) {
      logger.error('❌ Failed to connect to tunnel:', error);
      return false;
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      logger.log('✅ Tunnel connected to server');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Authenticate
      this.authenticate();
    });

    // Authentication success
    this.socket.on('server:authenticated', (data: any) => {
      logger.log('✅ Tunnel authenticated:', data);
      this.isAuthenticated = true;

      // Process queued messages
      this.processMessageQueue();

      // Notify renderer
      if (this.win) {
        this.win.webContents.send('tunnel-connected', {
          success: true,
          userId: data.userId,
          deviceHash: data.deviceHash,
          timestamp: Date.now(),
        });
      }
    });

    // Ping from server
    this.socket.on('server:ping', (data: any) => {
      logger.log(`💓 Ping from server (nonce: ${data.nonce})`);

      // Send pong response
      this.socket?.emit('client:pong', {
        nonce: data.nonce,
        timestamp: Date.now(),
      });

      // Update ping counter in UI
      if (this.win) {
        this.win.webContents.send('ping-counter-update', {
          action: 'update_counter',
          nonce: data.nonce,
          timestamp: Date.now(),
        });
      }
    });

    // Script delivery
    this.socket.on('server:script-delivery', (data: any) => {
      logger.log('📜 Script delivery received');

      // Decrypt if needed (using existing encryption module)
      if (data.encrypted && this.config?.deviceData) {
        try {
          // Import encryption utilities
          import('../src/utils/encryption').then((encryptionModule) => {
            const { decryptData, generateDeviceKey } = encryptionModule;

            const cpuModel = this.config?.deviceData?.cpuModel || 'unknown';
            const ipAddress = this.config?.deviceData?.ipAddress || 'unknown';
            const deviceKey = generateDeviceKey(cpuModel, ipAddress);
            const decryptedData = decryptData(data.encrypted, deviceKey);

            // Forward to renderer
            this.forwardToRenderer('script-received', {
              action: 'script_data',
              ...decryptedData,
              timestamp: Date.now(),
            });
          });
        } catch (error) {
          logger.error('❌ Failed to decrypt script data:', error);
        }
      } else {
        // Forward unencrypted data
        this.forwardToRenderer('script-received', {
          action: 'script_data',
          ...data,
          timestamp: Date.now(),
        });
      }
    });

    // Server updates
    this.socket.on('server:update', (data: any) => {
      logger.log('📡 Server update received');
      this.forwardToRenderer('server-ping-received', {
        action: 'ping_data',
        data,
        timestamp: Date.now(),
      });
    });

    // Disconnect from server
    this.socket.on('server:disconnect', (data: any) => {
      logger.log('🔌 Server requested disconnect:', data.reason);
      this.isAuthenticated = false;

      if (this.win) {
        this.win.webContents.send('tunnel-disconnected', {
          reason: data.reason,
          timestamp: Date.now(),
        });
      }
    });

    // Connection errors
    this.socket.on('server:error', (error: any) => {
      logger.error('❌ Tunnel error:', error.message);

      if (this.win) {
        this.win.webContents.send('tunnel-error', {
          error: error.message,
          timestamp: Date.now(),
        });
      }
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      logger.log(`❌ Tunnel disconnected: ${reason}`);
      this.isAuthenticated = false;

      // Notify renderer
      if (this.win) {
        this.win.webContents.send('tunnel-disconnected', {
          reason,
          timestamp: Date.now(),
        });
      }
    });

    // Reconnecting
    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, attempt - 1), this.maxReconnectDelay);
      logger.log(`🔄 Reconnecting to tunnel... (attempt ${attempt}, delay: ${delay}ms)`);
    });

    // Reconnected
    this.socket.on('reconnect', (attempt) => {
      logger.log(`✅ Tunnel reconnected after ${attempt} attempts`);
      this.reconnectAttempts = 0;
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      logger.error('❌ Tunnel reconnection failed after max attempts');

      if (this.win) {
        this.win.webContents.send('tunnel-reconnect-failed', {
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

    logger.log(`🔐 Authenticating with deviceHash: ${this.config.deviceHash.substring(0, 8)}...`);

    this.socket.emit('client:authenticate', {
      deviceHash: this.config.deviceHash,
      deviceData: this.config.deviceData,
    });
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
    logger.log(`📦 Message queued (${this.messageQueue.length} in queue)`);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    logger.log(`📤 Processing ${this.messageQueue.length} queued messages...`);

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
      logger.warn('⚠️ Socket not connected, queuing message');
      this.queueMessage({ type, payload, timestamp: Date.now() });
      return;
    }

    if (!this.isAuthenticated) {
      logger.warn('⚠️ Not authenticated, queuing message');
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
      logger.log('🔌 Disconnecting tunnel...');
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
