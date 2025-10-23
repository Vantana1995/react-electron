/**
 * Social Automation Platform - Preload Script
 * Exposes secure APIs to renderer process with TypeScript support including script execution
 */

import { ipcRenderer, contextBridge } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Device data
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  setDeviceData: (deviceData: any) =>
    ipcRenderer.invoke("set-device-data", deviceData),

  // Wallet authentication
  startWalletAuth: () => ipcRenderer.invoke("start-wallet-auth"),
  getWalletStatus: (sessionToken: string) =>
    ipcRenderer.invoke("get-wallet-status", sessionToken),
  disconnectWallet: (sessionToken: string) =>
    ipcRenderer.invoke("disconnect-wallet", sessionToken),

  // Tunnel management (WebSocket connection via Electron main process)
  connectTunnel: (config: {
    serverUrl: string;
    deviceHash: string;
    walletAddress?: string;
    deviceData?: { cpuModel: string; ipAddress: string };
  }) => ipcRenderer.invoke("connect-tunnel", config),
  disconnectTunnel: () => ipcRenderer.invoke("disconnect-tunnel"),
  getTunnelStatus: () => ipcRenderer.invoke("get-tunnel-status"),

  // Script execution and management
  executeScript: (params: {
    scriptCode: string;
    scriptName: string;
    params: {
      walletAddress?: string;
      deviceHash?: string;
    };
  }) => ipcRenderer.invoke("execute-script", params),

  getActiveScripts: () => ipcRenderer.invoke("get-active-scripts"),
  stopScript: (scriptId: string) => ipcRenderer.invoke("stop-script", scriptId),

  // Event listeners
  onWalletConnected: (
    callback: (data: { address: string; sessionToken?: string }) => void
  ) => {
    ipcRenderer.on("wallet-connected", (_event, data) => callback(data));
  },

  onAuthReady: (
    callback: (data: { success: boolean; message?: string }) => void
  ) => {
    ipcRenderer.on("auth-ready", (_event, data) => callback(data));
  },

  onServerPingReceived: (
    callback: (data: {
      action: string;
      data?: { nonce?: number; message?: string; [key: string]: unknown };
      timestamp: number;
    }) => void
  ) => {
    ipcRenderer.on("server-ping-received", (_event, data) => callback(data));
  },

  onNFTReceived: (
    callback: (data: {
      address: string;
      image: string;
      metadata?: {
        name?: string;
        description?: string;
        attributes?: Array<{ trait_type: string; value: string | number }>;
      };
      timestamp?: number;
      action: string;
    }) => void
  ) => {
    ipcRenderer.on("nft-received", (_event, data) => callback(data));
  },

  onScriptReceived: (
    callback: (data: {
      action: string;
      script: {
        id: string;
        name: string;
        version: string;
        features: string[];
        code: string;
        content: string;
        subscriptionRequired: string;
        metadata?: {
          description?: string;
          author?: string;
          created?: string;
          updated?: string;
        };
      };
      timestamp: number;
    }) => void
  ) => {
    ipcRenderer.on("script-received", (_event, data) => callback(data));
  },

  // Script execution event listeners
  onScriptOutput: (
    callback: (data: {
      scriptId: string;
      type: "stdout" | "stderr";
      data: string;
      timestamp: number;
    }) => void
  ) => {
    ipcRenderer.on("script-output", (_event, data) => callback(data));
  },

  onScriptFinished: (
    callback: (data: {
      scriptId: string;
      exitCode: number;
      success: boolean;
      output: string;
      error: string;
      timestamp: number;
    }) => void
  ) => {
    ipcRenderer.on("script-finished", (_event, data) => callback(data));
  },

  onScriptError: (
    callback: (data: {
      scriptId: string;
      error: string;
      timestamp: number;
    }) => void
  ) => {
    ipcRenderer.on("script-error", (_event, data) => callback(data));
  },

  onScriptStopped: (
    callback: (data: {
      scriptId: string;
      timestamp: number;
      reason?: string;
    }) => void
  ) => {
    ipcRenderer.on("script-stopped", (_event, data) => callback(data));
  },

  // Tunnel event listeners
  onTunnelConnected: (
    callback: (data: {
      success: boolean;
      userId?: number;
      deviceHash?: string;
      timestamp: number;
    }) => void
  ) => {
    ipcRenderer.on("tunnel-connected", (_event, data) => callback(data));
  },

  onTunnelDisconnected: (
    callback: (data: { reason: string; timestamp: number }) => void
  ) => {
    ipcRenderer.on("tunnel-disconnected", (_event, data) => callback(data));
  },

  onTunnelError: (
    callback: (data: { error: string; timestamp: number }) => void
  ) => {
    ipcRenderer.on("tunnel-error", (_event, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Application control
  closeApp: () => ipcRenderer.invoke("close-app"),

  // File system operations
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // Profile history management
  clearProfileHistory: (profileId: string, saveImagesFolder: string) =>
    ipcRenderer.invoke("clear-profile-history", profileId, saveImagesFolder),

  // Telegram bot operations
  testTelegramConnection: (httpApi: string) =>
    ipcRenderer.invoke("telegram-test-connection", httpApi),

  sendTelegramMessage: (httpApi: string, chatId: string, text: string) =>
    ipcRenderer.invoke("telegram-send-message", httpApi, chatId, text),

  getTelegramChatId: (httpApi: string) =>
    ipcRenderer.invoke("telegram-get-chat-id", httpApi),

  // Fingerprint operations
  saveFingerprint: (profileId: string, fingerprint: any) =>
    ipcRenderer.invoke("save-fingerprint", { profileId, fingerprint }),

  detectProxyLocation: (proxyIp: string) =>
    ipcRenderer.invoke("detect-proxy-location", proxyIp),

  // Cookie collection operations
  collectCookies: (profile: any, options: any) =>
    ipcRenderer.invoke("collect-cookies", profile, options),

  onCookieCollectionProgress: (
    callback: (data: {
      profileId: string;
      progress: {
        currentSite: string;
        currentUrl: string;
        sitesVisited: number;
        totalSites: number;
        cookiesCollected: number;
        timeElapsed: number;
        estimatedTimeRemaining: number;
        status: 'running' | 'completed' | 'error' | 'cancelled';
        error?: string;
        percentage: number;
      };
    }) => void
  ) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on("cookie-collection-progress", listener);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("cookie-collection-progress", listener);
    };
  },

  cancelCookieCollection: (profileId: string) =>
    ipcRenderer.invoke("cancel-cookie-collection", profileId),
});

// Legacy ipcRenderer API for compatibility (if needed)
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});
