import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getDBConnection } from '@/config/database';
import { UserModel } from '@/database/models/User';

/**
 * Tunnel Server - WebSocket-based bidirectional communication
 * Replaces direct HTTP callback system with persistent tunnel connections
 */

interface TunnelConnection {
  userId: number;
  deviceHash: string;
  socketId: string;
  ipAddress: string;
  nonce: number;
  lastPing: number;
  missedPings: number;
  deviceData?: {
    cpuModel: string;
    ipAddress: string;
  };
}

interface TunnelMessage {
  type: 'script-delivery' | 'ping' | 'update' | 'disconnect' | 'authenticate';
  payload: {
    encrypted?: string;
    hash?: string;
    nonce?: number;
    timestamp: number;
    [key: string]: any;
  };
  signature?: string;
}

class TunnelServer {
  private io: SocketIOServer | null = null;
  private activeConnections: Map<string, TunnelConnection> = new Map(); // deviceHash -> connection
  private socketToDevice: Map<string, string> = new Map(); // socketId -> deviceHash
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly PING_TIMEOUT = 40000; // 40 seconds

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      path: '/tunnel',
      cors: {
        origin: '*', // In production, specify exact origins
        methods: ['GET', 'POST'],
      },
      pingTimeout: this.PING_TIMEOUT,
      pingInterval: this.PING_INTERVAL,
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    this.startPingService();

    console.log('🚀 Tunnel Server initialized on /tunnel endpoint');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const clientIp = socket.handshake.address;
    console.log(`🔌 New tunnel connection from ${clientIp} (socket: ${socket.id})`);

    // Authentication event - client sends deviceHash
    socket.on('client:authenticate', async (data: { deviceHash: string; deviceData?: any }) => {
      try {
        const { deviceHash, deviceData } = data;

        if (!deviceHash) {
          socket.emit('server:error', { message: 'Device hash required' });
          socket.disconnect();
          return;
        }

        // Verify device hash exists in database
        const db = getDBConnection();
        const userModel = new UserModel(db);
        const user = await userModel.findByDeviceHash(deviceHash);

        if (!user) {
          socket.emit('server:error', { message: 'Invalid device hash' });
          socket.disconnect();
          return;
        }

        // Check if device already connected (reconnection scenario)
        const existingConnection = this.activeConnections.get(deviceHash);
        if (existingConnection) {
          // Disconnect old socket
          const oldSocket = this.io?.sockets.sockets.get(existingConnection.socketId);
          if (oldSocket) {
            console.log(`🔄 Disconnecting old socket for ${deviceHash.substring(0, 8)}...`);
            oldSocket.disconnect();
          }
          // Remove old mappings
          this.socketToDevice.delete(existingConnection.socketId);
        }

        // Register new connection
        const connection: TunnelConnection = {
          userId: user.id,
          deviceHash,
          socketId: socket.id,
          ipAddress: clientIp,
          nonce: user.nonce || 0,
          lastPing: Date.now(),
          missedPings: 0,
          deviceData: deviceData || { cpuModel: 'unknown', ipAddress: clientIp },
        };

        this.activeConnections.set(deviceHash, connection);
        this.socketToDevice.set(socket.id, deviceHash);

        // Send authentication confirmation
        socket.emit('server:authenticated', {
          success: true,
          userId: user.id,
          deviceHash,
          nonce: connection.nonce,
          timestamp: Date.now(),
        });

        console.log(`✅ Client authenticated: ${deviceHash.substring(0, 8)}... (user: ${user.id})`);

        // Update last active
        await userModel.updateLastActive(user.id);

        // Send scripts to client NOW (after tunnel is established)
        try {
          const { clientConnectionManager } = await import('./client-connection');

          // Small delay to ensure tunnel is fully ready
          setTimeout(async () => {
            try {
              const sent = await clientConnectionManager.sendUserScripts(deviceHash);
              if (sent) {
                console.log(`📡 Scripts sent to client after tunnel authentication`);
              } else {
                console.log(`⚠️ Failed to send scripts (client may not have any)`);
              }
            } catch (error) {
              console.error('❌ Error sending scripts after auth:', error);
            }
          }, 500); // 500ms delay to ensure everything is ready
        } catch (error) {
          console.error('❌ Failed to import clientConnectionManager:', error);
        }
      } catch (error) {
        console.error('❌ Authentication error:', error);
        socket.emit('server:error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });

    // Pong response from client
    socket.on('client:pong', (data: { nonce: number; timestamp: number }) => {
      const deviceHash = this.socketToDevice.get(socket.id);
      if (!deviceHash) return;

      const connection = this.activeConnections.get(deviceHash);
      if (!connection) return;

      // Verify nonce matches
      if (data.nonce === connection.nonce) {
        connection.lastPing = Date.now();
        connection.missedPings = 0;
        console.log(`💓 Pong received from ${deviceHash.substring(0, 8)}... (nonce: ${data.nonce})`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      const deviceHash = this.socketToDevice.get(socket.id);
      if (deviceHash) {
        console.log(`❌ Client disconnected: ${deviceHash.substring(0, 8)}... (reason: ${reason})`);
        this.handleDisconnection(deviceHash);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }

  /**
   * Send message to client through tunnel
   */
  async sendToClient(deviceHash: string, message: TunnelMessage): Promise<boolean> {
    const connection = this.activeConnections.get(deviceHash);

    if (!connection) {
      console.log(`❌ Client not connected: ${deviceHash.substring(0, 8)}...`);
      return false;
    }

    const socket = this.io?.sockets.sockets.get(connection.socketId);
    if (!socket || !socket.connected) {
      console.log(`❌ Socket not available: ${deviceHash.substring(0, 8)}...`);
      return false;
    }

    try {
      // Increment nonce for this message
      connection.nonce = (connection.nonce || 0) + 1;
      message.payload.nonce = connection.nonce;

      // Send message
      socket.emit(`server:${message.type}`, message.payload);

      console.log(`📤 Sent ${message.type} to ${deviceHash.substring(0, 8)}... (nonce: ${connection.nonce})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${deviceHash.substring(0, 8)}...`, error);
      return false;
    }
  }

  /**
   * Send ping to all active connections
   */
  private async pingActiveConnections(): Promise<void> {
    const currentTime = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [deviceHash, connection] of this.activeConnections) {
      try {
        const timeSinceLastPing = currentTime - connection.lastPing;

        // Check for timeout
        if (timeSinceLastPing > this.PING_TIMEOUT) {
          console.log(`⏱️ Ping timeout for ${deviceHash.substring(0, 8)}...`);
          await this.handleConnectionLost(connection);
          connectionsToRemove.push(deviceHash);
          continue;
        }

        // Send ping
        const success = await this.sendToClient(deviceHash, {
          type: 'ping',
          payload: {
            timestamp: currentTime,
            serverTime: new Date().toISOString(),
          },
        });

        if (!success) {
          console.log(`❌ Failed to ping ${deviceHash.substring(0, 8)}...`);
          await this.handleConnectionLost(connection);
          connectionsToRemove.push(deviceHash);
        }
      } catch (error) {
        console.error(`❌ Error pinging ${deviceHash.substring(0, 8)}...`, error);
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
   * Handle connection lost - increment nonce
   */
  private async handleConnectionLost(connection: TunnelConnection): Promise<void> {
    try {
      const db = getDBConnection();
      const query = `
        UPDATE users
        SET nonce = nonce + 1,
            last_active = NOW()
        WHERE device_hash = $1
      `;

      await db.query(query, [connection.deviceHash]);

      console.log(`🔄 Nonce incremented for ${connection.deviceHash.substring(0, 8)}...`);
    } catch (error) {
      console.error('Failed to increment nonce:', error);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(deviceHash: string): void {
    const connection = this.activeConnections.get(deviceHash);
    if (connection) {
      this.socketToDevice.delete(connection.socketId);
      this.activeConnections.delete(deviceHash);
    }
  }

  /**
   * Remove connection
   */
  private removeConnection(deviceHash: string): void {
    const connection = this.activeConnections.get(deviceHash);
    if (connection) {
      // Disconnect socket
      const socket = this.io?.sockets.sockets.get(connection.socketId);
      if (socket) {
        socket.disconnect();
      }

      this.socketToDevice.delete(connection.socketId);
      this.activeConnections.delete(deviceHash);
      console.log(`🗑️ Connection removed: ${deviceHash.substring(0, 8)}...`);
    }
  }

  /**
   * Get connection info
   */
  getConnection(deviceHash: string): TunnelConnection | null {
    return this.activeConnections.get(deviceHash) || null;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): TunnelConnection[] {
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

    console.log(`🚀 Tunnel ping service started (${this.PING_INTERVAL}ms interval)`);
  }

  /**
   * Stop ping service
   */
  stopPingService(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    console.log('🛑 Tunnel ping service stopped');
  }

  /**
   * Shutdown tunnel server
   */
  shutdown(): void {
    this.stopPingService();

    // Disconnect all clients
    for (const [deviceHash] of this.activeConnections) {
      this.removeConnection(deviceHash);
    }

    if (this.io) {
      this.io.close();
      this.io = null;
    }

    console.log('🛑 Tunnel server shut down');
  }
}

// Singleton instance
export const tunnelServer = new TunnelServer();

export default tunnelServer;
