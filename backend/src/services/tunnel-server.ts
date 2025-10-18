import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getDBConnection } from '@/config/database';
import { UserModel } from '@/database/models/User';
import {
  generateDeviceKey,
  encryptData,
  createVerificationHash,
} from '@/utils/encryption';
import type { NFTOwnership } from '@/services/subscription-manager';

/**
 * Tunnel Server - WebSocket-based bidirectional communication
 * New architecture: Scripts sent ONCE after authentication
 */

interface DeviceData {
  cpuModel: string;
  ipAddress: string;
}

interface TunnelConnection {
  userId: number;
  deviceHash: string;
  socketId: string;
  ipAddress: string;
  nonce: number;
  deviceData?: DeviceData;
  connectedAt?: number; // Timestamp when connection was established
}

interface NFTScriptPair {
  nft: {
    address: string;
    image: string;
    metadata: {
      name: string;
      description: string;
      attributes: Array<{ trait_type: string; value: string | number }>;
    };
    timestamp: number;
  } | null;
  script: {
    id: number;
    name: string;
    description: string | null;
    version: string;
    category: string | null;
    features: unknown[];
    usage: Record<string, unknown>;
    security: Record<string, unknown>;
    entryPoint: string;
    path: string;
    code: string;
    content: string;
  };
  maxProfiles: number;
  nftInfo: NFTOwnership | null;
}

interface TunnelMessage {
  type: 'script-delivery' | 'update' | 'disconnect' | 'authenticate';
  payload: {
    encrypted?: string;
    hash?: string;
    nonce?: number;
    timestamp: number;
    [key: string]: unknown;
  };
  signature?: string;
}

class TunnelServer {
  private io: SocketIOServer | null = null;
  private activeConnections: Map<string, TunnelConnection> = new Map(); // deviceHash -> connection
  private socketToDevice: Map<string, string> = new Map(); // socketId -> deviceHash

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
      pingTimeout: 120000, // 120 seconds (2 minutes) - increased for stability
      pingInterval: 25000, // 25 seconds - keep checking connection
      transports: ['websocket', 'polling'],
      connectTimeout: 45000, // 45 seconds for initial connection
      upgradeTimeout: 30000, // 30 seconds for transport upgrade
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    console.log('🚀 Tunnel Server initialized on /tunnel endpoint');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const clientIp = socket.handshake.address;
    const timestamp = new Date().toISOString();
    console.log(`🔌 [${timestamp}] New tunnel connection from ${clientIp} (socket: ${socket.id.substring(0, 8)}...)`);

    // Authentication event - client sends deviceHash
    socket.on('client:authenticate', async (data: { deviceHash: string; deviceData?: DeviceData }) => {
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
          // Only disconnect if it's a DIFFERENT socket (not the current one)
          if (existingConnection.socketId !== socket.id) {
            const oldSocket = this.io?.sockets.sockets.get(existingConnection.socketId);
            if (oldSocket && oldSocket.connected) {
              console.log(`🔄 Disconnecting old socket ${existingConnection.socketId.substring(0, 8)} for ${deviceHash.substring(0, 8)}... (new socket: ${socket.id.substring(0, 8)})`);
              oldSocket.disconnect();
            }
            // Remove old mappings
            this.socketToDevice.delete(existingConnection.socketId);
          } else {
            console.log(`♻️ Same socket reconnecting: ${socket.id.substring(0, 8)} for ${deviceHash.substring(0, 8)}`);
          }
        }

        // Register new connection
        const connection: TunnelConnection = {
          userId: user.id,
          deviceHash,
          socketId: socket.id,
          ipAddress: clientIp,
          nonce: user.nonce || 0,
          deviceData: deviceData || { cpuModel: 'unknown', ipAddress: clientIp },
          connectedAt: Date.now(), // Track when connection was established
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

        console.log(`✅ Client authenticated: ${deviceHash.substring(0, 8)}... (user: ${user.id}, socket: ${socket.id.substring(0, 8)})`);

        // Update last active
        await userModel.updateLastActive(user.id);

        // Send scripts to client immediately (no delay needed)
        try {
          await this.sendScriptsToClient(deviceHash, connection);
        } catch (error) {
          console.error('❌ Error sending scripts after auth:', error);
        }

      } catch (error) {
        console.error('❌ Authentication error:', error);
        socket.emit('server:error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      const deviceHash = this.socketToDevice.get(socket.id);
      const timestamp = new Date().toISOString();
      if (deviceHash) {
        console.log(`❌ [${timestamp}] Client disconnected: ${deviceHash.substring(0, 8)}... (socket: ${socket.id.substring(0, 8)}, reason: ${reason})`);
        this.handleDisconnection(deviceHash);
      } else {
        console.log(`❌ [${timestamp}] Unknown socket disconnected: ${socket.id.substring(0, 8)} (reason: ${reason})`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }

  /**
   * Send scripts to client (ONE TIME after authentication)
   */
  private async sendScriptsToClient(deviceHash: string, connection: TunnelConnection): Promise<void> {
    try {
      const db = getDBConnection();
      const userModel = new UserModel(db);

      // Get user
      const user = await userModel.findByDeviceHash(deviceHash);
      if (!user) {
        console.error('❌ User not found');
        return;
      }

      // Get subscription summary
      const { SubscriptionManager } = await import('@/services/subscription-manager');
      const subscriptionManager = new SubscriptionManager(db);
      const subscription = await subscriptionManager.getSubscriptionSummary(user.id);

      console.log(`📊 User subscription: ${subscription.subscriptionLevel} (${subscription.maxProfiles} profiles, ${subscription.accessibleScripts.length} scripts)`);

      // Get accessible scripts
      const { ScriptModel } = await import('@/database/models/Script');
      const scriptModel = new ScriptModel(db);

      const scripts = await Promise.all(
        subscription.accessibleScripts.map((scriptId) =>
          scriptModel.findByScriptId(scriptId)
        )
      );

      const validScripts = scripts.filter((s) => s !== null);

      if (validScripts.length === 0) {
        console.error('❌ No scripts available for user');
        return;
      }

      // Get NFT image for the first NFT (all images will be the same)
      let nftImageUrl = 'https://via.placeholder.com/300x300/4CAF50/white?text=NFT';

      if (subscription.ownedNFTs.length > 0) {
        try {
          const { getNFTMetadata } = await import('@/services/blockchain');
          const firstNFT = subscription.ownedNFTs[0];
          const nftMetadata = await getNFTMetadata(
            firstNFT.contractAddress,
            '1'
          );

          if (nftMetadata && nftMetadata.image) {
            nftImageUrl = nftMetadata.image;
            console.log(`🖼️ NFT image loaded: ${nftImageUrl}`);
          }
        } catch (error) {
          console.error('❌ Failed to load NFT image:', error);
        }
      }

      // Create NFT+Script pairs for ALL scripts
      const nftScriptPairs: NFTScriptPair[] = [];

      // Step 1: Create pairs for scripts that REQUIRE specific NFTs
      validScripts.forEach((script) => {
        const nftForThisScript = subscription.ownedNFTs.find((nft) =>
          script.nft_addresses?.includes(nft.contractAddress)
        );

        if (nftForThisScript) {
          nftScriptPairs.push({
            nft: {
              address: nftForThisScript.contractAddress,
              image: nftImageUrl,
              metadata: {
                name: `NFT #${nftForThisScript.count}`,
                description: `Owned NFT from ${nftForThisScript.networkName}`,
                attributes: [
                  { trait_type: 'Network', value: nftForThisScript.networkName },
                  { trait_type: 'Count', value: nftForThisScript.count },
                  { trait_type: 'Contract', value: nftForThisScript.contractAddress.substring(0, 8) + '...' },
                ],
              },
              timestamp: Date.now(),
            },
            script: {
              id: script.id,
              name: script.name,
              description: script.description,
              version: script.version,
              category: script.category,
              features: (script.config?.features as unknown[]) || [],
              usage: (script.config?.usage as Record<string, unknown>) || {},
              security: (script.config?.security as Record<string, unknown>) || {},
              entryPoint: (script.config?.entry_point as string) || 'index.js',
              path: script.script_id,
              code: script.script_content,
              content: script.script_content,
            },
            maxProfiles: subscription.maxProfiles,
            nftInfo: nftForThisScript,
          });
        }
      });

      // Step 2: Add remaining scripts WITHOUT NFT (will show placeholder)
      const assignedScriptIds = nftScriptPairs.map((p) => p.script.id);
      const scriptsWithoutNFT = validScripts.filter(
        (s) => !assignedScriptIds.includes(s.id)
      );

      scriptsWithoutNFT.forEach((script) => {
        nftScriptPairs.push({
          nft: null, // No NFT - frontend will show Ramka.png
          script: {
            id: script.id,
            name: script.name,
            description: script.description,
            version: script.version,
            category: script.category,
            features: (script.config?.features as unknown[]) || [],
            usage: (script.config?.usage as Record<string, unknown>) || {},
            security: (script.config?.security as Record<string, unknown>) || {},
            entryPoint: (script.config?.entry_point as string) || 'index.js',
            path: script.script_id,
            code: script.script_content,
            content: script.script_content,
          },
          maxProfiles: subscription.maxProfiles,
          nftInfo: null,
        });
      });

      console.log(`📦 Created ${nftScriptPairs.length} pairs: ${nftScriptPairs.filter(p => p.nft).length} with NFT, ${nftScriptPairs.filter(p => !p.nft).length} without NFT`);

      // Increment nonce
      connection.nonce = (connection.nonce || 0) + 1;

      // Prepare data to encrypt
      const pingData: Record<string, unknown> = {
        timestamp: Date.now(),
        serverTime: new Date().toISOString(),
        nonce: connection.nonce,
        nftScriptPairs: nftScriptPairs,
        subscription: {
          level: subscription.subscriptionLevel,
          maxProfiles: subscription.maxProfiles,
          ownedNFTs: subscription.ownedNFTs,
          accessibleScripts: subscription.accessibleScripts,
          nftCount: subscription.ownedNFTs.length,
          scriptCount: subscription.accessibleScripts.length,
        },
        type: 'user_scripts_with_nft',
      };

      // Generate encryption key from device data
      const cpuModelForKey = connection.deviceData?.cpuModel || 'unknown';
      const ipAddressForKey = connection.deviceData?.ipAddress || connection.ipAddress;

      console.log('🔑 BACKEND ENCRYPTION KEY GENERATION:');
      console.log('- CPU Model:', cpuModelForKey);
      console.log('- IP Address:', ipAddressForKey);

      const deviceKey = generateDeviceKey(cpuModelForKey, ipAddressForKey);

      // Encrypt the data
      const encryptedData = encryptData(pingData, deviceKey);

      // Create verification hash
      const verificationHash = createVerificationHash(pingData, deviceKey);

      console.log(`🔐 Sending ${validScripts.length} script(s) to client: ${deviceHash.substring(0, 8)}...`);

      console.log('📊 Subscription data:', {
        level: subscription.subscriptionLevel,
        maxProfiles: subscription.maxProfiles,
        nftCount: subscription.ownedNFTs.length,
        scriptCount: subscription.accessibleScripts.length,
      });

      // Send through tunnel
      const success = await this.sendToClient(deviceHash, {
        type: 'script-delivery',
        payload: {
          encrypted: encryptedData,
          hash: verificationHash,
          type: 'encrypted_ping',
          nonce: connection.nonce,
          timestamp: Date.now(),
        },
      });

      if (success) {
        console.log(`📡 Scripts sent to ${deviceHash.substring(0, 8)}... via tunnel`);
      } else {
        console.log(`⚠️ Failed to send scripts to ${deviceHash.substring(0, 8)}...`);
      }

    } catch (error) {
      console.error('Failed to send user scripts:', error);
    }
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
      console.log(`❌ Socket not available: ${deviceHash.substring(0, 8)}... (socket: ${connection.socketId.substring(0, 8)})`);
      return false;
    }

    // Check if connection is too fresh (just established, might not be fully ready)
    const connectionAge = Date.now() - (connection.connectedAt || 0);
    if (connectionAge < 100) {
      console.log(`⏱️ Connection very fresh (${connectionAge}ms), waiting for stabilization...`);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Recheck socket availability after waiting
      if (!socket.connected) {
        console.log(`❌ Socket disconnected during stabilization wait: ${deviceHash.substring(0, 8)}...`);
        return false;
      }
    }

    try {
      // Send message
      socket.emit(`server:${message.type}`, message.payload);

      console.log(`📤 Sent ${message.type} to ${deviceHash.substring(0, 8)}... (socket: ${connection.socketId.substring(0, 8)}, age: ${connectionAge}ms)`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${deviceHash.substring(0, 8)}...`, error);
      return false;
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(deviceHash: string): void {
    const connection = this.activeConnections.get(deviceHash);
    if (connection) {
      const connectionDuration = connection.connectedAt ? Date.now() - connection.connectedAt : 0;
      this.socketToDevice.delete(connection.socketId);
      this.activeConnections.delete(deviceHash);
      console.log(`🗑️ Connection removed: ${deviceHash.substring(0, 8)}... (socket: ${connection.socketId.substring(0, 8)}, duration: ${connectionDuration}ms)`);
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
   * Shutdown tunnel server
   */
  shutdown(): void {
    // Disconnect all clients
    for (const [deviceHash] of this.activeConnections) {
      const connection = this.activeConnections.get(deviceHash);
      if (connection) {
        const socket = this.io?.sockets.sockets.get(connection.socketId);
        if (socket) {
          socket.disconnect();
        }
      }
    }

    this.activeConnections.clear();
    this.socketToDevice.clear();

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
