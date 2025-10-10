/**
 * Twitter Automation Platform - Electron Main Process
 * TypeScript version with Puppeteer script execution support
 */

import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express, { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { AddressInfo } from "net";
import { Server } from "http";
import { spawn, execSync } from "child_process";
import fs from "fs";
import os from "os";
import { logger } from "./logger";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let authFlow: AuthFlow | null = null;
let callbackServer: CallbackServer | null = null;

// Хранилище активных скриптов
interface ActiveScript {
  id: string;
  name: string;
  process: import("child_process").ChildProcess;
  startTime: number;
  status: "running" | "completed" | "error";
  profileId?: string; // ID профиля для связи скрипта с профилем
}

const activeScripts = new Map<string, ActiveScript>();

/**
 * Wallet Authentication Flow Manager
 */
interface SessionData {
  createdAt: number;
  status: "pending" | "connected";
  walletAddress?: string;
  connectedAt?: number;
}

class AuthFlow {
  private sessionTokens: Map<string, SessionData> = new Map();
  private walletAddresses: Map<string, string> = new Map();
  private app: express.Application | null = null;
  private server: Server | null = null;
  private port: number | null = null;

  async startAuth(): Promise<{
    success: boolean;
    sessionToken?: string;
    authUrl?: string;
    error?: string;
  }> {
    try {
      logger.log("🔐 Starting wallet authentication flow...");

      // Start local HTTP server
      await this.startLocalServer();

      // Generate unique session token
      const sessionToken = this.generateSessionToken();

      // Open system browser to auth page
      const authUrl = `http://localhost:${this.port}/auth?session=${sessionToken}`;
      logger.log(`🌐 Opening browser to: ${authUrl}`);

      await shell.openExternal(authUrl);

      return { success: true, sessionToken, authUrl };
    } catch (error) {
      logger.error("❌ Authentication flow failed:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async startLocalServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app = express();

        // Security middleware
        this.app.use(express.json({ limit: "1mb" }));
        this.app.use(express.urlencoded({ extended: true, limit: "1mb" }));

        // Security headers
        this.app.use((_req: Request, res: Response, next: NextFunction) => {
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("X-Frame-Options", "DENY");
          res.setHeader("X-XSS-Protection", "1; mode=block");
          res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
          next();
        });

        // Serve authentication page
        this.app.get("/auth", (req: Request, res: Response) => {
          const sessionToken = req.query.session as string;
          if (!sessionToken) {
            return res.status(400).send("Missing session token");
          }

          // Store session token
          this.sessionTokens.set(sessionToken, {
            createdAt: Date.now(),
            status: "pending",
          });

          // Serve a basic auth page (you can create a proper HTML file)
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Wallet Authentication</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .container { max-width: 400px; margin: 0 auto; padding: 20px; }
                button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🔗 Connect Wallet</h1>
                <p>Connect your MetaMask wallet to continue</p>
                <button onclick="connectWallet()">Connect MetaMask</button>
              </div>
              <script>
                async function connectWallet() {
                  if (typeof window.ethereum !== 'undefined') {
                    try {
                      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                      const address = accounts[0];
                      
                      // Send wallet address to Electron app
                      await fetch('/wallet-connected', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          address: address, 
                          session: '${sessionToken}' 
                        })
                      });
                      
                      document.body.innerHTML = '<div class="container"><h1>✅ Success!</h1><p>Wallet connected successfully. You can close this window.</p></div>';
                    } catch (error) {
                      alert('Failed to connect wallet: ' + error.message);
                    }
                  } else {
                    alert('MetaMask is not installed!');
                  }
                }
              </script>
            </body>
            </html>
          `);
        });

        // Receive wallet address from browser
        this.app.post("/wallet-connected", (req: Request, res: Response) => {
          try {
            const { address, session: sessionToken } = req.body;

            if (!address || !sessionToken) {
              return res
                .status(400)
                .json({ success: false, error: "Missing address or session" });
            }

            // Validate session token
            if (!this.isValidSessionToken(sessionToken)) {
              return res.status(400).json({
                success: false,
                error: "Invalid or expired session token",
              });
            }

            // Validate Ethereum address format
            if (!this.isValidEthereumAddress(address)) {
              return res.status(400).json({
                success: false,
                error: "Invalid Ethereum address format",
              });
            }

            // Store wallet address
            this.walletAddresses.set(sessionToken, address);
            const existingSession = this.sessionTokens.get(sessionToken);
            this.sessionTokens.set(sessionToken, {
              createdAt: existingSession?.createdAt || Date.now(),
              status: "connected",
              walletAddress: address,
              connectedAt: Date.now(),
            });

            logger.log(
              `💰 Wallet connected: ${address.substring(
                0,
                6
              )}...${address.substring(address.length - 4)}`
            );

            // Notify renderer process
            if (win) {
              win.webContents.send("wallet-connected", {
                address,
                sessionToken,
              });
            }

            res.json({ success: true, message: "Wallet address received" });
          } catch (error) {
            logger.error("❌ Wallet connection error:", error);
            res
              .status(500)
              .json({ success: false, error: "Internal server error" });
          }
        });

        // Start server on random port
        this.server = this.app.listen(0, "localhost", () => {
          this.port = (this.server?.address() as AddressInfo)?.port || null;
          logger.log(`🚀 Auth server started on port ${this.port}`);
          resolve();
        });

        this.server?.on("error", (error: Error) => {
          logger.error("❌ Server error:", error);
          reject(error);
        });
      } catch (error) {
        logger.error("❌ Failed to start server:", error);
        reject(error);
      }
    });
  }

  private generateSessionToken(): string {
    return uuidv4();
  }

  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidSessionToken(token: string): boolean {
    if (!token || typeof token !== "string") return false;

    const session = this.sessionTokens.get(token);
    if (!session) return false;

    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    return now - session.createdAt <= maxAge;
  }

  getWalletAddress(sessionToken: string): string | undefined {
    return this.walletAddresses.get(sessionToken);
  }

  isSessionConnected(sessionToken: string): boolean {
    const session = this.sessionTokens.get(sessionToken);
    return Boolean(session && session.status === "connected");
  }

  cleanup(): void {
    try {
      if (this.server) {
        this.server.close();
        this.server = null;
        logger.log("🧹 Auth server closed");
      }

      if (this.app) {
        this.app = null;
      }

      this.sessionTokens.clear();
      this.walletAddresses.clear();

      logger.log("🧹 All sessions cleared");
    } catch (error) {
      logger.error("❌ Cleanup error:", error);
    }
  }
}

/**
 * Callback Server Manager
 */
class CallbackServer {
  private app: express.Application | null = null;
  private server: Server | null = null;
  private port: number = 3001;

  async startCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app = express();

        this.app.use(express.json({ limit: "1mb" }));
        this.app.use(express.urlencoded({ extended: true, limit: "1mb" }));

        // CORS headers
        this.app.use((req: Request, res: Response, next: NextFunction) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
          );

          if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
          }
          next();
        });

        // API endpoint to receive server callbacks/pings
        this.app.post(
          "/api/server-callback",
          async (req: Request, res: Response) => {
            try {
              const data = req.body;
              logger.log(
                "📞 Server callback received:",
                data.instruction?.action
              );

              if (data.instruction?.data) {
                if (data.instruction.data.encrypted) {
                  try {
                    const encryptionModule = await import(
                      "../src/utils/encryption"
                    );
                    const { decryptData, generateDeviceKey, verifyData } =
                      encryptionModule;

                    const cpuModel =
                      globalDeviceData?.fingerprint?.cpu?.model || "unknown";

                    const realIPv4 =
                      globalDeviceData?.clientIPv4 || "192.168.1.1"; // !! what is here
                    const deviceKey = generateDeviceKey(cpuModel, realIPv4);
                    const decryptedData = decryptData(
                      data.instruction.data.encrypted,
                      deviceKey
                    );
                    // Log only summary data without full script code
                    const dataSummary = {
                      ...decryptedData,
                      script: decryptedData.script
                        ? {
                            ...decryptedData.script,
                            code: decryptedData.script.code
                              ? `${decryptedData.script.code.substring(
                                  0,
                                  20
                                )}... (${
                                  decryptedData.script.code.length
                                } chars)`
                              : undefined,
                            content: decryptedData.script.content
                              ? `${decryptedData.script.content.substring(
                                  0,
                                  20
                                )}... (${
                                  decryptedData.script.content.length
                                } chars)`
                              : undefined,
                          }
                        : undefined,
                      scripts: decryptedData.scripts
                        ? decryptedData.scripts.map((s: any) => ({
                            ...s,
                            code: s.code
                              ? `${s.code.substring(0, 20)}... (${
                                  s.code.length
                                } chars)`
                              : undefined,
                            content: s.content
                              ? `${s.content.substring(0, 20)}... (${
                                  s.content.length
                                } chars)`
                              : undefined,
                          }))
                        : undefined,
                      nftScriptPairs: decryptedData.nftScriptPairs
                        ? decryptedData.nftScriptPairs.map((pair: any) => ({
                            ...pair,
                            script: pair.script
                              ? {
                                  ...pair.script,
                                  code: pair.script.code
                                    ? `${pair.script.code.substring(
                                        0,
                                        20
                                      )}... (${pair.script.code.length} chars)`
                                    : undefined,
                                  content: pair.script.content
                                    ? `${pair.script.content.substring(
                                        0,
                                        20
                                      )}... (${
                                        pair.script.content.length
                                      } chars)`
                                    : undefined,
                                }
                              : undefined,
                          }))
                        : undefined,
                    };
                    logger.log(JSON.stringify(dataSummary, null, 2));
                    logger.log("=".repeat(50));

                    data.instruction.data = {
                      ...data.instruction.data,
                      ...decryptedData,
                    };
                  } catch (decryptError) {
                    logger.error("❌ DECRYPTION FAILED:", decryptError);
                    logger.log("⚠️ Data remains encrypted");
                  }
                }

                if (data.instruction.data.nonce !== undefined) {
                  logger.log("- Nonce:", data.instruction.data.nonce);
                }

                if (data.instruction.data.script) {
                  logger.log("- Script data present:");
                  logger.log(
                    "  - Script name:",
                    data.instruction.data.script.name
                  );
                  logger.log(
                    "  - Script version:",
                    data.instruction.data.script.version
                  );
                  logger.log(
                    "  - Script features:",
                    data.instruction.data.script.features
                  );
                  logger.log(
                    "  - Has code:",
                    !!data.instruction.data.script.code
                  );
                  logger.log(
                    "  - Code length:",
                    data.instruction.data.script.code?.length || 0
                  );
                  logger.log(
                    "  - Code preview:",
                    data.instruction.data.script.code?.substring(0, 20) +
                      "..." || "No code"
                  );

                  // Forward script data to React component
                  if (win && data.instruction.data.script.code) {
                    logger.log("📜 Forwarding script to React component");
                    win.webContents.send("script-received", {
                      action: "script_data",
                      script: {
                        id: data.instruction.data.script.id,
                        name: data.instruction.data.script.name,
                        version: data.instruction.data.script.version,
                        features: data.instruction.data.script.features || [],
                        code: data.instruction.data.script.code,
                        content: data.instruction.data.script.code, // For compatibility
                        metadata: {
                          description: data.instruction.data.script.description,
                          author: "Twitter Automation Platform",
                        },
                      },
                      timestamp: Date.now(),
                    });
                  }
                }
              }

              logger.log("=".repeat(50));

              // Handle server callbacks and notify renderer (matching frontend pattern)
              if (win) {
                // Handle counter updates first
                if (data.instruction?.data?.nonce !== undefined) {
                  win.webContents.send("ping-counter-update", {
                    action: "update_counter",
                    nonce: data.instruction.data.nonce,
                    timestamp: Date.now(),
                  });
                }

                // Then notify about ping data
                win.webContents.send("server-ping-received", {
                  action: "ping_data",
                  data: data.instruction?.data,
                  timestamp: Date.now(),
                });

                // Handle NFT data if present (check both nft object and separate nftImage)
                if (data.instruction?.data?.nft) {
                  win.webContents.send("nft-received", {
                    action: "nft_data",
                    image: data.instruction.data.nft.image,
                    metadata: data.instruction.data.nft.metadata,
                    subscription: data.instruction.data.nft.subscription,
                    timestamp: Date.now(),
                  });
                }
              }

              res.json({
                success: true,
                verified: true,
                timestamp: Date.now(),
                message: "Connection verified",
              });
            } catch (error) {
              logger.error("❌ Callback processing error:", error);
              res
                .status(500)
                .json({ success: false, error: "Internal server error" });
            }
          }
        );

        // API endpoint to set session data from frontend
        this.app.post("/api/set-session", (_req: Request, res: Response) => {
          try {
            logger.log("📱 Session data updated from frontend");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            logger.error("❌ Set session error:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ success: false, error: "Internal server error" })
            );
          }
        });

        // API endpoint to check for new callbacks
        this.app.get("/api/callback-status", (_req: Request, res: Response) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              hasNewCallback: false, // Simplified for now
              lastCallback: null,
            })
          );
        });

        // API endpoint to clear callback flag
        this.app.post("/api/clear-callback", (_req: Request, res: Response) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        });

        // API endpoint to check for counter updates
        this.app.get("/api/counter-status", (_req: Request, res: Response) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              hasCounterUpdate: false, // Simplified for now
              lastCounterUpdate: null,
            })
          );
        });

        // API endpoint to clear counter update flag
        this.app.post("/api/clear-counter", (_req: Request, res: Response) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        });

        // Start server
        this.server = this.app.listen(this.port, "localhost", () => {
          logger.log(`🚀 Callback server started on port ${this.port}`);
          resolve();
        });

        this.server.on("error", (error: Error) => {
          logger.error("❌ Callback server error:", error);
          reject(error);
        });
      } catch (error) {
        logger.error("❌ Failed to start callback server:", error);
        reject(error);
      }
    });
  }

  stopCallbackServer(): void {
    try {
      if (this.server) {
        this.server.close();
        this.server = null;
        logger.log("🛑 Callback server stopped");
      }

      if (this.app) {
        this.app = null;
      }
    } catch (error) {
      logger.error("❌ Error stopping callback server:", error);
    }
  }

  getPort(): number {
    return this.port;
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hide menu bar (File, Edit, View, Window, Help)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, "preload.mjs"),
      partition: "persist:main",
      devTools: process.env.NODE_ENV === "development",
      experimentalFeatures: false,
      allowRunningInsecureContent: false,
      sandbox: false,
      webviewTag: false,
      plugins: false,
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, "..", "src", "assets", "logo.png"),
    title: "Twitter Automation Platform",
  });

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // Handle window closed
  win.on("closed", () => {
    win = null;
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Send auth ready status to renderer
  win.webContents.once("did-finish-load", () => {
    win?.webContents.send("auth-ready", {
      success: true,
      message: "Wallet authentication system ready",
    });
  });
}

// App initialization
app.whenReady().then(async () => {
  createWindow();

  // Initialize auth flow and callback server
  authFlow = new AuthFlow();
  callbackServer = new CallbackServer();

  // Start callback server for receiving pings from backend
  try {
    await callbackServer.startCallbackServer();
    logger.log("✅ Callback server ready for backend pings");
  } catch (error) {
    logger.error("❌ Failed to start callback server:", error);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup on app quit
app.on("before-quit", () => {
  if (authFlow) {
    authFlow.cleanup();
  }
  if (callbackServer) {
    callbackServer.stopCallbackServer();
  }

  activeScripts.forEach((script) => {
    if (script.process && !script.process.killed) {
      script.process.kill();
    }
  });
  activeScripts.clear();
});

// Global device data storage
let globalDeviceData: any = null;

// IPC handlers

// Get real system info from Node.js (CPU, memory, platform, etc.)
ipcMain.handle("get-system-info", async () => {
  try {
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || "Unknown CPU";
    const cpuCores = cpus.length;
    const totalMemory = os.totalmem();
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();

    const systemInfo = {
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        architecture: arch,
      },
      memory: {
        total: totalMemory,
      },
      os: {
        platform: platform,
        release: release,
        architecture: arch,
      },
    };

    logger.log("💻 Real system info:", systemInfo);

    return {
      success: true,
      ...systemInfo,
    };
  } catch (error) {
    logger.error("Failed to get system info:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("set-device-data", async (_event, deviceData) => {
  globalDeviceData = deviceData;
  return { success: true };
});

ipcMain.handle("start-wallet-auth", async () => {
  try {
    if (!authFlow) {
      return { success: false, error: "Auth flow not initialized" };
    }
    const result = await authFlow.startAuth();
    return result;
  } catch (error) {
    logger.error("❌ Wallet auth failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("get-wallet-status", async (_event, sessionToken) => {
  try {
    if (!authFlow) {
      return { success: false, error: "Auth flow not initialized" };
    }

    const isConnected = authFlow.isSessionConnected(sessionToken);
    const walletAddress = authFlow.getWalletAddress(sessionToken);

    return {
      success: true,
      isConnected,
      walletAddress,
      sessionToken,
    };
  } catch (error) {
    logger.error("❌ Get wallet status failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("disconnect-wallet", async (_event, sessionToken) => {
  try {
    if (!authFlow) {
      return { success: false, error: "Auth flow not initialized" };
    }

    // Properly cleanup authentication and cache
    authFlow.cleanup();

    // Clear global device data
    globalDeviceData = null;

    logger.log("🧹 Wallet disconnected and all cache cleared");

    return { success: true, message: "Wallet disconnected and cache cleared" };
  } catch (error) {
    logger.error("❌ Disconnect wallet failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

// Callback server IPC handlers
ipcMain.handle("get-callback-server-status", async () => {
  try {
    return {
      success: true,
      isRunning: callbackServer !== null,
      port: callbackServer ? callbackServer.getPort() : null,
    };
  } catch (error) {
    logger.error("❌ Get callback server status failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("start-callback-server", async () => {
  try {
    if (callbackServer) {
      return {
        success: true,
        message: "Callback server already running",
        port: callbackServer.getPort(),
      };
    }

    callbackServer = new CallbackServer();
    await callbackServer.startCallbackServer();
    return {
      success: true,
      message: "Callback server started",
      port: callbackServer.getPort(),
    };
  } catch (error) {
    logger.error("❌ Start callback server failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("stop-callback-server", async () => {
  try {
    if (callbackServer) {
      callbackServer.stopCallbackServer();
      callbackServer = null;
    }
    return { success: true, message: "Callback server stopped" };
  } catch (error) {
    logger.error("❌ Stop callback server failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

// Close application handler
ipcMain.handle("close-app", async () => {
  try {
    logger.log(
      "🔒 Closing application due to ping timeout or security violation"
    );

    // Close all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      window.close();
    });

    // Stop servers
    if (callbackServer) {
      callbackServer.stopCallbackServer();
    }
    if (authFlow) {
      authFlow.cleanup();
    }

    // Quit the application
    app.quit();

    return { success: true, message: "Application closed" };
  } catch (error) {
    logger.error("❌ Close app failed:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("execute-script", async (_event, params) => {
  try {
    logger.log(
      "🚀 Executing Puppeteer script:",
      params.script?.name || "Unknown"
    );

    const tmpDir = os.tmpdir();
    const scriptsDir = path.join(tmpDir, "twitter-app-scripts");
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    const scriptId = `script-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const scriptPath = path.join(scriptsDir, `${scriptId}.js`);
    logger.log("📄 Script path:", scriptPath);

    const scriptContent = params.script?.content || params.script?.code || "";
    const profile = params.settings?.profile || {};
    const customData = params.settings?.customData || "";
    const headless = params.settings?.headless !== false; // default true

    let parsedCustomData = {};
    try {
      if (customData && customData.trim()) {
        parsedCustomData = JSON.parse(customData);
      }
    } catch (e) {
      logger.warn("⚠️ Failed to parse customData as JSON, using as string");
    }

    const puppeteerScript = `
      const puppeteer = require('puppeteer-extra');
      const StealthPlugin = require('puppeteer-extra-plugin-stealth');

      puppeteer.use(StealthPlugin());

      const profile = ${JSON.stringify(profile)};
      const customData = ${JSON.stringify(parsedCustomData)};
      const headlessMode = ${headless};
      const telegramConfig = ${JSON.stringify(profile.telegram || null)};

      logger.log('[SCRIPT] Starting Puppeteer script execution...');
      logger.log('[SCRIPT] Profile:', profile.name);
      logger.log('[SCRIPT] Headless mode:', headlessMode);
      logger.log('[SCRIPT] Telegram bot:', telegramConfig ? 'Connected' : 'Not configured');

      // ============================================
      // TELEGRAM NOTIFICATION HELPER
      // ============================================
      /**
       * Send a notification to Telegram if bot is configured
       * @param {string} message - Message to send
       * @returns {Promise<boolean>} - Success status
       */
      async function sendTelegramNotification(message) {
        if (!telegramConfig || !telegramConfig.connected) {
          logger.log('[TELEGRAM] Bot not configured, skipping notification');
          return false;
        }

        try {
          const url = \`https://api.telegram.org/\${telegramConfig.httpApi}/sendMessage\`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: telegramConfig.chatId,
              text: message,
              parse_mode: 'HTML'
            }),
          });

          const data = await response.json();

          if (!data.ok) {
            logger.error('[TELEGRAM] Failed to send message:', data.description);
            return false;
          }

          logger.log('[TELEGRAM] Notification sent successfully');
          return true;
        } catch (error) {
          logger.error('[TELEGRAM] Error sending notification:', error.message);
          return false;
        }
      }

      // ============================================
      // BROWSER WITH PROFILE
      // ============================================
      async function launchBrowserWithProfile() {
        const browserArgs = [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ];

        // ADDING PROXY
        // profile.proxy its an object: {login, password, ip, port}
        if (profile.proxy && profile.proxy.ip && profile.proxy.port) {
          const proxyServer = \`\${profile.proxy.ip}:\${profile.proxy.port}\`;
          browserArgs.push(\`--proxy-server=\${proxyServer}\`);
          logger.log(\`[PROXY] Proxy server: \${proxyServer}\`);
        }

        // If not headless start maximized
        if (!headlessMode) {
          browserArgs.push("--start-maximized");
        }

        logger.log('[BROWSER] Launching browser with args:', browserArgs);

        const browser = await puppeteer.launch({
          headless: headlessMode,
          args: browserArgs,
          userDataDir: \`./puppeteer_profile_\${profile.id}\`,
        });

        const page = await browser.newPage();

        // Auth for proxy
        if (profile.proxy && profile.proxy.login && profile.proxy.password) {
          await page.authenticate({
            username: profile.proxy.login,
            password: profile.proxy.password
          });
          logger.log(\`[AUTH] Proxy auth: \${profile.proxy.login}\`);
        }

        // Cache cleaning
        const client = await page.createCDPSession();
        await client.send("Network.clearBrowserCache");
        logger.log('[CACHE] Browser cache cleared');

        // Viewport setting - auto-detect from profile or use defaults
        const viewport = profile.viewport || {
          width: 1920,
          height: 1080
        };
        await page.setViewport(viewport);
        logger.log(\`[VIEWPORT] Set to \${viewport.width}x\${viewport.height}\`);

        // Cookie 
        if (profile.cookies && profile.cookies.length > 0) {
          try {
            await page.setCookie(...profile.cookies);
            logger.log(\`[COOKIES] Set \${profile.cookies.length} cookies from profile\`);
          } catch (error) {
            logger.warn('[COOKIES] Failed to set some cookies:', error.message);
          }
        }

        return { browser, page };
      }

      // ============================================
      // SCRIPT CONFIG NFTDISPLAY
      // ============================================
      const config = {
        // URL to navigate
        navigationUrl: ${JSON.stringify(
          params.settings?.navigationUrl || ""
        )} || "https://x.com",

        // Regex
        regexPattern: ${JSON.stringify(
          params.settings?.regexPattern || ""
        )} || "\\b(crypto|web3|ticker|memecoin)\\b",

        // Templates
        commentTemplates: ${JSON.stringify(
          params.settings?.commentTemplates || []
        )},
        regexTags: ${JSON.stringify(params.settings?.regexTags || [])},
        saveImagesFolder: ${JSON.stringify(
          params.settings?.saveImagesFolder || ""
        )},
        enableScreenshots: ${JSON.stringify(
          params.settings?.enableScreenshots || false
        )},
        delayBetweenActions: ${JSON.stringify(
          params.settings?.delayBetweenActions || 3000
        )},

        // Custom data
        ...customData
      };

      logger.log('[CONFIG] Script config:', JSON.stringify(config, null, 2));

      // ============================================
      // Main func
      // ============================================
      async function main() {
        let browser, page;

        try {
          logger.log('[MAIN] Starting script execution...');

          // Send startup notification
          await sendTelegramNotification(
            \`🚀 <b>Script Started</b>\\n\\n\` +
            \`📋 Profile: <code>\${profile.name}</code>\\n\` +
            \`⏰ Time: \${new Date().toLocaleString()}\\n\` +
            \`🔧 Mode: \${headlessMode ? 'Headless' : 'Visible'}\`
          );

          // Запускаем браузер с настройками профиля
          ({ browser, page } = await launchBrowserWithProfile());

          // Сохраняем инстанс браузера для graceful shutdown
          browserInstance = browser;

          // Отслеживаем закрытие браузера пользователем
          browser.on('disconnected', () => {
            logger.log('[BROWSER] Browser was closed by user');
            process.send && process.send({ type: 'browser-closed', scriptId: '${scriptId}' });
            process.exit(0);
          });

          // Импортируем и выполняем функцию из backend скрипта
          ${scriptContent}

          // Передаем page и config в backend скрипт
          const scriptContext = {
            page,
            browser,
            config,
            profile,
            telegram: {
              sendNotification: sendTelegramNotification,
              isConfigured: telegramConfig && telegramConfig.connected,
              config: telegramConfig
            }
          };

          // Use executeScript from an external function
          if (typeof executeScript === 'function') {
            const result = await executeScript(scriptContext);
            logger.log('[SUCCESS] Backend script result:', result);

            // Send success notification
            await sendTelegramNotification(
              \`✅ <b>Script Completed Successfully</b>\\n\\n\` +
              \`📋 Profile: <code>\${profile.name}</code>\\n\` +
              \`⏰ Time: \${new Date().toLocaleString()}\`
            );

            return result;
          }
          // module.exports
          else if (typeof module !== 'undefined' && module.exports && typeof module.exports === 'function') {
            const result = await module.exports(scriptContext);
            logger.log('[SUCCESS] Backend script result:', result);

            // Send success notification
            await sendTelegramNotification(
              \`✅ <b>Script Completed Successfully</b>\\n\\n\` +
              \`📋 Profile: <code>\${profile.name}</code>\\n\` +
              \`⏰ Time: \${new Date().toLocaleString()}\`
            );

            return result;
          }
          else {
            logger.log('[WARNING] Script does not export expected function, running as standalone');
          }

        } catch (error) {
          logger.error('[ERROR] Script execution error:', error.message);

          // Send error notification
          await sendTelegramNotification(
            \`❌ <b>Script Error</b>\\n\\n\` +
            \`📋 Profile: <code>\${profile.name}</code>\\n\` +
            \`⚠️ Error: <code>\${error.message}</code>\\n\` +
            \`⏰ Time: \${new Date().toLocaleString()}\`
          );

          throw error;
        } finally {
          // Закрываем браузер в любом случае
          if (browser) {
            await browser.close();
            logger.log('[CLEANUP] Browser closed');
            browserInstance = null;
          }
        }
      }

      // Graceful shutdown handler
      let browserInstance = null;

      // Safe close
      async function cleanup() {
        logger.log('[CLEANUP] Shutting down gracefully...');
        if (browserInstance) {
          try {
            await browserInstance.close();
            logger.log('[CLEANUP] Browser closed successfully');
          } catch (error) {
            logger.error('[CLEANUP] Error closing browser:', error.message);
          }
        }
      }

      // PROCESSING SIGNALS
      process.on('SIGTERM', async () => {
        logger.log('[SIGNAL] Received SIGTERM, shutting down...');
        await cleanup();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.log('[SIGNAL] Received SIGINT, shutting down...');
        await cleanup();
        process.exit(0);
      });

      // new function start
      main().then(() => {
        logger.log('[SUCCESS] Script completed successfully');
        process.exit(0);
      }).catch((error) => {
        logger.error('[ERROR] Script failed:', error.message);
        process.exit(1);
      });
    `;

    fs.writeFileSync(scriptPath, puppeteerScript, { encoding: "utf-8" });

    const profileId =
      params.settings?.profileId || params.settings?.profile?.id;
    const result = await executePuppeteerScript(
      scriptPath,
      scriptId,
      params.scriptName,
      profileId
    );

    setTimeout(() => {
      try {
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
      } catch (cleanupError) {
        logger.error("⚠️ Failed to cleanup script file:", cleanupError);
      }
    }, 10000);

    return { success: true, result, scriptId };
  } catch (error) {
    logger.error("❌ Script execution failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Script execution failed",
    };
  }
});


function executePuppeteerScript(
  scriptPath: string,
  scriptId: string,
  scriptName: string,
  profileId?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const nodeCommand = process.platform === "win32" ? "node.exe" : "node";

      const child = spawn(nodeCommand, [scriptPath], {
        cwd: path.join(__dirname, ".."),
        env: {
          ...process.env,
          NODE_PATH: [
            path.join(__dirname, "..", "node_modules"),
            path.join(__dirname, "..", "..", "node_modules"),
          ].join(process.platform === "win32" ? ";" : ":"),
        },
        stdio: ["pipe", "pipe", "pipe", "ipc"],
        shell: process.platform === "win32",
      });

      let output = "";
      let error = "";

      const scriptInfo: ActiveScript = {
        id: scriptId,
        name: scriptName,
        process: child,
        startTime: Date.now(),
        status: "running",
        profileId: profileId, 
      };

      activeScripts.set(scriptId, scriptInfo);

      child.on("message", (message: any) => {
        if (message.type === "browser-closed") {
          logger.log(`🔴 Browser closed manually for script ${scriptId}`);

          const script = activeScripts.get(scriptId);
          if (script) {
            script.status = "completed";
            activeScripts.set(scriptId, script);
          }

          if (win) {
            win.webContents.send("script-stopped", {
              scriptId,
              profileId: script?.profileId,
              reason: "browser-closed",
              timestamp: Date.now(),
            });

            win.webContents.send("script-finished", {
              scriptId,
              profileId: script?.profileId,
              exitCode: 0,
              success: true,
              output: "Browser was closed by user",
              error: "",
              timestamp: Date.now(),
            });
          }

          setTimeout(() => {
            activeScripts.delete(scriptId);
          }, 1000);
        }
      });

      child.stdout?.on("data", (data) => {
        const text = data.toString();
        output += text;
        logger.log(`[${scriptName}] ${text.trim()}`);

        if (win) {
          win.webContents.send("script-output", {
            scriptId,
            type: "stdout",
            data: text.trim(),
            timestamp: Date.now(),
          });
        }
      });

      child.stderr?.on("data", (data) => {
        const text = data.toString();
        error += text;
        logger.error(`[${scriptName}] ERROR: ${text.trim()}`);

        if (win) {
          win.webContents.send("script-output", {
            scriptId,
            type: "stderr",
            data: text.trim(),
            timestamp: Date.now(),
          });
        }
      });

      child.on("close", (code) => {
        const script = activeScripts.get(scriptId);
        if (script) {
          script.status = code === 0 ? "completed" : "error";
          activeScripts.set(scriptId, script);
        }
        if (win) {
          const script = activeScripts.get(scriptId);
          win.webContents.send("script-finished", {
            scriptId,
            profileId: script?.profileId,
            exitCode: code,
            success: code === 0,
            output: output,
            error: error,
            timestamp: Date.now(),
          });
        }

        if (code === 0) {
          resolve(output || "Script executed successfully");
        } else {
          reject(new Error(error || `Script exited with code ${code}`));
        }
      });

      child.on("error", (err) => {
        const script = activeScripts.get(scriptId);
        if (script) {
          script.status = "error";
          activeScripts.set(scriptId, script);
        }

        logger.error(`❌ Script process error: ${err.message}`);

        if (win) {
          const script = activeScripts.get(scriptId);
          win.webContents.send("script-error", {
            scriptId,
            profileId: script?.profileId,
            error: err.message,
            timestamp: Date.now(),
          });
        }

        reject(err);
      });

      setTimeout(() => {
        if (child.pid && !child.killed) {
          logger.log(
            `✅ Script ${scriptName} started successfully (PID: ${child.pid})`
          );
          resolve(`Script started successfully with PID: ${child.pid}`);
        }
      }, 5000);
    } catch (error) {
      logger.error("❌ Failed to start script process:", error);
      reject(error);
    }
  });
}

ipcMain.handle("get-active-scripts", async () => {
  try {
    const scripts = Array.from(activeScripts.values()).map((script) => ({
      id: script.id,
      name: script.name,
      startTime: script.startTime,
      status: script.status,
      pid: script.process?.pid,
      running: script.process && !script.process.killed,
    }));

    return { success: true, scripts };
  } catch (error) {
    logger.error("❌ Failed to get active scripts:", error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle("stop-script", async (_event, scriptId) => {
  try {
    const script = activeScripts.get(scriptId);

    if (!script) {
      return { success: false, error: "Script not found" };
    }

    if (script.process && !script.process.killed) {
      logger.log(
        `🛑 Stopping script ${script.name} (PID: ${script.process.pid})...`
      );

    
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${script.process.pid} /T /F`, {
            windowsHide: true,
          });
          logger.log(`✅ Killed process tree for PID ${script.process.pid}`);
        } catch (killError) {
          logger.error(
            `⚠️ taskkill failed, using fallback method:`,
            killError
          );
          script.process.kill("SIGKILL");
        }
      } else {
        script.process.kill("SIGTERM");
        setTimeout(() => {
          if (script.process && !script.process.killed) {
            script.process.kill("SIGKILL");
          }
        }, 3000);
      }

      script.status = "completed";
      activeScripts.set(scriptId, script);

      logger.log(`🛑 Script ${script.name} stopped`);
      setTimeout(() => {
        activeScripts.delete(scriptId);
        logger.log(`🧹 Cleaned up script ${scriptId} from active scripts`);
      }, 1000);

      if (win) {
        const script = activeScripts.get(scriptId);
        win.webContents.send("script-stopped", {
          scriptId,
          profileId: script?.profileId,
          timestamp: Date.now(),
        });
      }

      return { success: true, message: "Script stopped" };
    } else {
      return { success: false, error: "Script is not running" };
    }
  } catch (error) {
    logger.error("❌ Failed to stop script:", error);
    return { success: false, error: (error as Error).message };
  }
});

// ===== TELEGRAM BOT IPC HANDLERS =====

/**
 * Test Telegram bot connection
 * Validates token and fetches bot info and chat ID
 */
ipcMain.handle("telegram-test-connection", async (_event, httpApi: string) => {
  try {
    logger.log("🤖 Testing Telegram bot connection...");

    // Validate token format
    const tokenPattern = /^bot\d+:[A-Za-z0-9_-]+$/;
    if (!tokenPattern.test(httpApi.trim())) {
      return {
        success: false,
        error: "Invalid bot token format. Expected: bot123456:ABC-DEF...",
      };
    }

    // Test connection with getUpdates
    const updatesResponse = await fetch(
      `https://api.telegram.org/${httpApi}/getUpdates`,
      { method: "GET" }
    );

    if (!updatesResponse.ok) {
      return {
        success: false,
        error: `HTTP error: ${updatesResponse.status}`,
      };
    }

    const updatesData = await updatesResponse.json();

    if (!updatesData.ok) {
      return {
        success: false,
        error: "Invalid bot token or bot not found",
      };
    }

    // Get bot info
    const botInfoResponse = await fetch(
      `https://api.telegram.org/${httpApi}/getMe`,
      { method: "GET" }
    );

    if (!botInfoResponse.ok) {
      return {
        success: false,
        error: "Failed to get bot information",
      };
    }

    const botInfoData = await botInfoResponse.json();

    // Extract chat ID from updates if available
    let chatId: string | undefined;
    if (updatesData.result && updatesData.result.length > 0) {
      const firstMessage = updatesData.result[0];
      if (firstMessage.message && firstMessage.message.chat) {
        chatId = firstMessage.message.chat.id.toString();
      }
    }

    return {
      success: true,
      chatId,
      botName: botInfoData.result.first_name,
      username: botInfoData.result.username,
    };
  } catch (error) {
    logger.error("❌ Telegram connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

/**
 * Send message via Telegram bot
 */
ipcMain.handle(
  "telegram-send-message",
  async (_event, httpApi: string, chatId: string, text: string) => {
    try {
      logger.log(`📤 Sending Telegram message to chat ${chatId}...`);

      const response = await fetch(
        `https://api.telegram.org/${httpApi}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
          }),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error: ${response.status}`,
        };
      }

      const data = await response.json();

      if (!data.ok) {
        return {
          success: false,
          error: data.description || "Failed to send message",
        };
      }

      logger.log("✅ Telegram message sent successfully");

      return {
        success: true,
      };
    } catch (error) {
      logger.error("❌ Failed to send Telegram message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Get chat ID from Telegram bot updates
 */
ipcMain.handle("telegram-get-chat-id", async (_event, httpApi: string) => {
  try {
    logger.log("🔍 Fetching Telegram chat ID...");

    const response = await fetch(
      `https://api.telegram.org/${httpApi}/getUpdates`,
      { method: "GET" }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.ok) {
      return {
        success: false,
        error: "Failed to get updates",
      };
    }

    // Get the most recent message
    if (!data.result || data.result.length === 0) {
      return {
        success: false,
        error:
          "No messages found. Please send a message to your bot first (e.g., /start)",
      };
    }

    const firstMessage = data.result[0];
    if (!firstMessage.message || !firstMessage.message.chat) {
      return {
        success: false,
        error: "Invalid message format",
      };
    }

    const chatId = firstMessage.message.chat.id.toString();

    logger.log(`✅ Found chat ID: ${chatId}`);

    return {
      success: true,
      chatId,
    };
  } catch (error) {
    logger.error("❌ Failed to get chat ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Handle folder selection
ipcMain.handle("select-folder", async () => {
  try {
    if (!win) {
      return null;
    }

    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Select folder to save images",
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    logger.log("📁 Folder selected:", selectedPath);

    return selectedPath;
  } catch (error) {
    logger.error("❌ Folder selection failed:", error);
    return null;
  }
});

// Handle clearing profile history (delete processed tweets JSON file)
ipcMain.handle(
  "clear-profile-history",
  async (_event, profileId: string, saveImagesFolder: string) => {
    try {
      if (!saveImagesFolder || !profileId) {
        return {
          success: false,
          message: "Missing profileId or saveImagesFolder",
        };
      }

      const tweetsFile = path.join(
        saveImagesFolder,
        `processed_tweets_${profileId}.json`
      );

      if (fs.existsSync(tweetsFile)) {
        fs.unlinkSync(tweetsFile);
        logger.log(`✅ Deleted processed tweets file: ${tweetsFile}`);
        return { success: true, message: "History cleared successfully" };
      }

      return { success: true, message: "No history file found" };
    } catch (error) {
      logger.error("❌ Error clearing profile history:", error);
      return { success: false, message: (error as Error).message };
    }
  }
);

// Handle app activation (macOS)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
