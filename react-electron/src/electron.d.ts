/**
 * Electron API types for renderer process
 */

interface ElectronAPI {
  // Device data
  setDeviceData: (deviceData: any) => Promise<{ success: boolean }>;

  // Wallet authentication
  startWalletAuth: () => Promise<{
    success: boolean;
    sessionToken?: string;
    authUrl?: string;
    error?: string;
  }>;
  getWalletStatus: (sessionToken: string) => Promise<any>;
  disconnectWallet: (sessionToken: string) => Promise<any>;

  // Callback server management
  getCallbackServerStatus: () => Promise<any>;
  startCallbackServer: () => Promise<any>;
  stopCallbackServer: () => Promise<any>;

  // Script execution and management
  executeScript: (params: {
    script: any;
    settings: {
      profile: any;
      customData: string;
      headless: boolean;
      regexPattern?: string;
      saveImagesFolder?: string;
      navigationUrl?: string;
      commentTemplates?: string[];
      maxTweetsToProcess?: number;
      delayBetweenActions?: number;
    };
    nftData: any;
  }) => Promise<any>;

  getActiveScripts: () => Promise<any>;
  stopScript: (scriptId: string) => Promise<any>;

  // Profile history management
  clearProfileHistory: (profileId: string, saveImagesFolder: string) => Promise<{ success: boolean; message: string }>;

  // Event listeners
  onWalletConnected?: (
    callback: (data: { address: string; sessionToken?: string }) => void
  ) => void;

  onAuthReady?: (
    callback: (data: { success: boolean; message?: string }) => void
  ) => void;

  onServerPingReceived?: (
    callback: (data: {
      action: string;
      data?: { nonce?: number; message?: string; [key: string]: unknown };
      timestamp: number;
    }) => void
  ) => void;

  onPingCounterUpdate?: (
    callback: (data: { nonce: number; timestamp: number }) => void
  ) => void;

  onNFTReceived?: (
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
  ) => void;

  onScriptReceived?: (
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
  ) => void;

  onScriptOutput?: (
    callback: (data: {
      scriptId: string;
      type: "stdout" | "stderr";
      data: string;
      timestamp: number;
    }) => void
  ) => void;

  onScriptFinished?: (
    callback: (data: {
      scriptId: string;
      exitCode: number;
      success: boolean;
      output: string;
      error: string;
      timestamp: number;
    }) => void
  ) => void;

  onScriptError?: (
    callback: (data: {
      scriptId: string;
      error: string;
      timestamp: number;
    }) => void
  ) => void;

  onScriptStopped?: (
    callback: (data: { scriptId: string; timestamp: number; reason?: string }) => void
  ) => void;

  removeAllListeners?: (channel: string) => void;

  // Application control
  closeApp: () => Promise<any>;

  // Browser management
  createBrowser: (config: {
    profile: any;
    headless: boolean;
    active: boolean;
  }) => Promise<any>;

  closeBrowser: (browserId: string) => Promise<any>;

  executeBrowserScript: (params: {
    browserId: string;
    script: any;
    executeParams?: Record<string, unknown>;
  }) => Promise<any>;

  navigateBrowser: (params: { browserId: string; url: string }) => Promise<any>;

  getBrowserStatus: (browserId: string) => Promise<any>;

  // File system operations
  selectFolder: () => Promise<string | null>;
}

interface Window {
  electronAPI: ElectronAPI;
  ipcRenderer: {
    on: (
      channel: string,
      listener: (event: any, ...args: any[]) => void
    ) => void;
    off: (
      channel: string,
      listener: (event: any, ...args: any[]) => void
    ) => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}