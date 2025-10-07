import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  // Device data
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  setDeviceData: (deviceData) => ipcRenderer.invoke("set-device-data", deviceData),
  // Wallet authentication
  startWalletAuth: () => ipcRenderer.invoke("start-wallet-auth"),
  getWalletStatus: (sessionToken) => ipcRenderer.invoke("get-wallet-status", sessionToken),
  disconnectWallet: (sessionToken) => ipcRenderer.invoke("disconnect-wallet", sessionToken),
  // Callback server management
  getCallbackServerStatus: () => ipcRenderer.invoke("get-callback-server-status"),
  startCallbackServer: () => ipcRenderer.invoke("start-callback-server"),
  stopCallbackServer: () => ipcRenderer.invoke("stop-callback-server"),
  // Script execution and management
  executeScript: (params) => ipcRenderer.invoke("execute-script", params),
  getActiveScripts: () => ipcRenderer.invoke("get-active-scripts"),
  stopScript: (scriptId) => ipcRenderer.invoke("stop-script", scriptId),
  // Event listeners
  onWalletConnected: (callback) => {
    ipcRenderer.on("wallet-connected", (_event, data) => callback(data));
  },
  onAuthReady: (callback) => {
    ipcRenderer.on("auth-ready", (_event, data) => callback(data));
  },
  onServerPingReceived: (callback) => {
    ipcRenderer.on("server-ping-received", (_event, data) => callback(data));
  },
  onPingCounterUpdate: (callback) => {
    ipcRenderer.on("ping-counter-update", (_event, data) => callback(data));
  },
  onNFTReceived: (callback) => {
    ipcRenderer.on("nft-received", (_event, data) => callback(data));
  },
  onScriptReceived: (callback) => {
    ipcRenderer.on("script-received", (_event, data) => callback(data));
  },
  // Script execution event listeners
  onScriptOutput: (callback) => {
    ipcRenderer.on("script-output", (_event, data) => callback(data));
  },
  onScriptFinished: (callback) => {
    ipcRenderer.on("script-finished", (_event, data) => callback(data));
  },
  onScriptError: (callback) => {
    ipcRenderer.on("script-error", (_event, data) => callback(data));
  },
  onScriptStopped: (callback) => {
    ipcRenderer.on("script-stopped", (_event, data) => callback(data));
  },
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  // Application control
  closeApp: () => ipcRenderer.invoke("close-app"),
  // Browser management
  createBrowser: (config) => ipcRenderer.invoke("create-browser", config),
  closeBrowser: (browserId) => ipcRenderer.invoke("close-browser", browserId),
  executeBrowserScript: (params) => ipcRenderer.invoke("execute-browser-script", params),
  navigateBrowser: (params) => ipcRenderer.invoke("navigate-browser", params),
  getBrowserStatus: (browserId) => ipcRenderer.invoke("get-browser-status", browserId),
  // File system operations
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  // Profile history management
  clearProfileHistory: (profileId, saveImagesFolder) => ipcRenderer.invoke("clear-profile-history", profileId, saveImagesFolder),
  // Telegram bot operations
  testTelegramConnection: (httpApi) => ipcRenderer.invoke("telegram-test-connection", httpApi),
  sendTelegramMessage: (httpApi, chatId, text) => ipcRenderer.invoke("telegram-send-message", httpApi, chatId, text),
  getTelegramChatId: (httpApi) => ipcRenderer.invoke("telegram-get-chat-id", httpApi)
});
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  }
});
