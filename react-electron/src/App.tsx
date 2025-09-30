/**
 * Twitter Automation Platform - Main App Component
 * React + TypeScript + Electron application
 */

import { useState, useEffect, useCallback } from "react";
import {
  AppState,
  SystemState,
  WalletConnectionStatus,
  NFTData,
  ScriptData,
  UserProfile,
} from "./types";
import { collectDeviceInfo } from "./services/deviceFingerprint";
import {
  connectToServer,
  setServerCallbacks,
} from "./services/serverApiService";
import { profileStorage } from "./services/profileStorage";
import { WalletConnection } from "./components/WalletConnection/WalletConnection";
import { NFTDisplay } from "./components/NFTDisplay/NFTDisplay";
import {
  ActivityLog,
  useActivityLog,
} from "./components/ActivityLog/ActivityLog";
import { ScriptManager } from "./components/ScriptManager/ScriptManager";
import { ProfileManager } from "./components/ProfileManager";
import { timerService } from "./services/timerService";
import "./App.css";

function App() {
  const { logs, addLog } = useActivityLog();

  const [appState, setAppState] = useState<AppState>({
    wallet: {
      status: { isConnected: false },
      connecting: false,
    },
    system: {
      connected: false,
      status: "disconnected",
      message: "Please connect your wallet to continue",
    },
    logs: [],
    nft: {
      visible: false,
      loading: false,
    },
    timer: {
      value: 0,
      running: false,
      timeout: 40,
    },
    script: {
      available: false,
      executing: false,
    },
    profiles: {
      profiles: [],
      showAddModal: false,
      maxProfiles: 0, // Will be set from server when NFT is received
    },
  });

  // Флаг для предотвращения повторной инициализации
  const [isInitialized, setIsInitialized] = useState(false);

  const [currentNFT, setCurrentNFT] = useState<NFTData | undefined>();
  const [currentScript, setCurrentScript] = useState<ScriptData | undefined>();
  const [nftScriptMapping, setNftScriptMapping] = useState<
    Map<string, ScriptData>
  >(new Map());

  // Expose currentNFT to window object for ScriptManager access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).currentNFT = currentNFT;
    }
  }, [currentNFT]);

  /**
   * Initialize the application
   */
  const initializeApp = useCallback(
    async (walletAddress?: string) => {
      // Предотвращаем повторную инициализацию
      if (isInitialized) {
        console.log("🚫 App already initialized, skipping...");
        return;
      }

      try {
        setIsInitialized(true);
        addLog("🚀 Twitter Automation Platform starting...", "info");

        updateSystemStatus("initializing", "Collecting device information...");

        // Collect device information
        const deviceData = await collectDeviceInfo();
        addLog("✅ Device information collected successfully", "success");

        // Send device data to main process for encryption key generation
        if (window.electronAPI?.setDeviceData) {
          await window.electronAPI.setDeviceData(deviceData);
          addLog("📱 Device data sent to main process", "info");
        }

        updateSystemStatus("initializing", "Connecting to server...");

        // Use provided wallet address or get from current state
        const addressToUse =
          walletAddress || appState.wallet.status.walletAddress;

        // Connect to server with wallet address
        const serverResult = await connectToServer(deviceData, addressToUse);

        if (serverResult.success) {
          updateSystemStatus("ready", "Connected and ready");
          addLog("✅ Successfully connected to server", "success");

          if (serverResult.deviceHash) {
            setAppState((prev) => ({
              ...prev,
              system: {
                ...prev.system,
                deviceHash: serverResult.deviceHash,
              },
            }));
          }
        } else {
          updateSystemStatus(
            "error",
            `Connection failed: ${serverResult.error}`
          );
          addLog(`❌ Server connection failed: ${serverResult.error}`, "error");
          setIsInitialized(false);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        updateSystemStatus("error", `Initialization failed: ${errorMessage}`);
        addLog(`❌ App initialization failed: ${errorMessage}`, "error");
        setIsInitialized(false);
      }
    },
    [addLog, isInitialized, appState.wallet.status.walletAddress]
  );

  /**
   * Setup server callback handlers
   */
  const setupServerCallbacks = () => {
    setServerCallbacks({
      onConnectionStatusChange: (connected: boolean) => {
        updateSystemStatus(
          connected ? "ready" : "disconnected",
          connected ? "Connected to server" : "Disconnected from server"
        );

        addLog(
          `📡 Server connection: ${connected ? "Connected" : "Disconnected"}`,
          connected ? "success" : "warning"
        );
      },

      onServerPing: (callback) => {
        addLog(`📞 Server ping: ${callback.instruction.action}`, "info");
      },

      onNFTReceived: (nft: NFTData) => {
        console.log("🖼️ NFT data received from SERVER API SERVICE:", nft);
        console.log("📊 Subscription data from SERVER API:", nft.subscription);
        // More robust duplicate detection - check if it's the same NFT data
        const isSameNFT =
          currentNFT &&
          (currentNFT.address === nft.address ||
            (currentNFT.image === nft.image && nft.image && nft.image !== ""));
        if (isSameNFT) {
          console.log("🖼️ NFT already received, skipping duplicate");
          console.log("- Current address:", currentNFT?.address);
          console.log("- New address:", nft.address);
          return;
        }

        setCurrentNFT(nft);
        setAppState((prev) => ({
          ...prev,
          nft: {
            data: nft,
            visible: true,
            loading: false,
          },
          profiles: {
            ...prev.profiles,
            maxProfiles: nft.subscription?.maxProfiles || 0,
          },
        }));

        addLog("🖼️ NFT data received from server", "success");

        if (nft.subscription?.maxProfiles) {
          addLog(
            `📊 Profile limit: ${nft.subscription.maxProfiles} profiles (${nft.subscription.subscriptionLevel})`,
            "info"
          );
        }

        // Load profiles when NFT is received (verification complete)
        loadProfiles();
      },

      onScriptReceived: (script: ScriptData) => {
        addLog(`📜 Script received: ${script.name} v${script.version}`, "info");

        // Connect script with current NFT if available
        if (currentNFT) {
          setNftScriptMapping((prev) => {
            const newMapping = new Map(prev);
            newMapping.set(currentNFT.address, script);
            return newMapping;
          });
          addLog(
            `🔗 Script "${script.name}" connected to NFT ${currentNFT.address}`,
            "info"
          );
        }

        // Сохраняем скрипт в состояние для отображения кнопки
        setCurrentScript(script);
        setAppState((prev) => ({
          ...prev,
          script: {
            data: script,
            available: true,
          },
        }));
      },
    });

    // Добавляем обработчики IPC событий от Electron (только один раз)
    if (window.electronAPI) {
      // Очищаем предыдущие слушатели перед добавлением новых
      window.electronAPI.removeAllListeners("server-ping-received");
      window.electronAPI.removeAllListeners("ping-counter-update");
      window.electronAPI.removeAllListeners("nft-received");
      window.electronAPI.removeAllListeners("script-received");

      window.electronAPI.onServerPingReceived((data) => {
        addLog(`📞 Server ping: ${data.action}`, "info");

        // Обработка ping данных
        if (
          data.data &&
          typeof data.data === "object" &&
          "nonce" in data.data &&
          typeof data.data.nonce === "number"
        ) {
          timerService.updateNonce(data.data.nonce);
          timerService.resetPingTimer();
        }
      });

      window.electronAPI.onPingCounterUpdate((data) => {
        setAppState((prev) => ({
          ...prev,
          system: {
            ...prev.system,
            nonce: data.nonce,
            lastPing: data.timestamp,
          },
        }));
      });

      window.electronAPI.onNFTReceived((data) => {
        console.log(
          "🖼️ NFT IPC data received from ELECTRON MAIN PROCESS:",
          data
        );
        console.log("📊 Subscription data from ELECTRON:", data.subscription);

        const nftData: NFTData = {
          image: data.image,
          metadata: data.metadata,
          timestamp: data.timestamp || Date.now(),
          subscription: data.subscription, // Include subscription data from IPC
        };

        // More robust duplicate detection - check if it's the same NFT data
        const isSameNFT =
          currentNFT &&
          (currentNFT.image === nftData.image &&
            nftData.image &&
            nftData.image !== "");

        if (isSameNFT) {
          console.log(
            "🖼️ NFT already received via Electron, skipping duplicate"
          );
          console.log("- Current address:", currentNFT?.address);
          console.log("- New address:", nftData.address);
          return;
        }

        setCurrentNFT(nftData);
        setAppState((prev) => ({
          ...prev,
          nft: {
            data: nftData,
            visible: true,
            loading: false,
          },
          profiles: {
            ...prev.profiles,
            maxProfiles: nftData.subscription?.maxProfiles || 0,
          },
        }));

        addLog("🖼️ NFT data received from Electron", "success");

        if (nftData.subscription?.maxProfiles) {
          addLog(
            `📊 Profile limit: ${nftData.subscription.maxProfiles} profiles (${nftData.subscription.subscriptionLevel})`,
            "info"
          );
        } else {
          addLog(
            "⚠️ No subscription data found in NFT - maxProfiles will be 0",
            "warning"
          );
        }

        // Load profiles when NFT is received (verification complete)
        loadProfiles();
      });

      window.electronAPI.onScriptReceived((data) => {
        console.log("📜 Script received via Electron:", data.script.name);
        const scriptData: ScriptData = {
          id: data.script.id,
          name: data.script.name,
          version: data.script.version,
          features: data.script.features,
          code: data.script.code,
          content: data.script.content,
          metadata: data.script.metadata,
        };

        setCurrentScript(scriptData);
        setAppState((prev) => ({
          ...prev,
          script: {
            data: scriptData,
            available: true,
          },
        }));

        addLog(
          `📜 Script received via Electron: ${data.script.name} v${data.script.version}`,
          "success"
        );
      });
    }
  };

  useEffect(() => {
    setupServerCallbacks();

    return () => {
      // Cleanup IPC listeners
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners("server-ping-received");
        window.electronAPI.removeAllListeners("ping-counter-update");
        window.electronAPI.removeAllListeners("nft-received");
        window.electronAPI.removeAllListeners("script-received");
      }
      console.log("🧹 App cleanup");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setupServerCallbacks не добавляем в зависимости, чтобы избежать бесконечного цикла

  /**
   * Update system status
   */
  const updateSystemStatus = (
    status: SystemState["status"],
    message: string
  ) => {
    setAppState((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        status,
        message,
        connected: status === "ready",
      },
    }));
  };

  /**
   * Handle wallet connection
   */
  const handleWalletConnected = useCallback(
    async (status: WalletConnectionStatus) => {
      setAppState((prev) => ({
        ...prev,
        wallet: {
          status,
          connecting: false,
        },
      }));

      addLog(
        `💰 Wallet connected: ${status.walletAddress?.substring(0, 6)}...`,
        "success"
      );

      // После подключения кошелька сразу отправляем запрос в сервер (только один раз)
      if (status.walletAddress && status.sessionToken && !isInitialized) {
        try {
          addLog("🚀 Initializing app with wallet data...", "info");
          await initializeApp(status.walletAddress);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          addLog(`❌ Failed to initialize app: ${errorMessage}`, "error");
        }
      }
    },
    [addLog, initializeApp, isInitialized]
  );

  /**
   * Handle wallet disconnection
   */
  const handleWalletDisconnected = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      wallet: {
        status: { isConnected: false },
        connecting: false,
      },
    }));

    // Сбрасываем флаг инициализации при отключении кошелька
    // Here we need to add exit from an app if users wants disconnect wallet
    setIsInitialized(false);
    setCurrentNFT(undefined);
    setCurrentScript(undefined);
    addLog("🔌 Wallet disconnected", "info");
  }, [addLog]);

  /**
   * Handle NFT image click
   */
  const handleNFTImageClick = (nftData: NFTData) => {
    addLog(`🖼️ NFT card flipped: ${nftData.address}`, "info");
  };

  /**
   * Handle script execution from NFT
   */
  const handleScriptExecute = useCallback(
    async (
      nftData: NFTData,
      profile: UserProfile,
      customData: string,
      headless: boolean
    ) => {
      if (!currentScript) {
        addLog("❌ No script available for execution", "error");
        return;
      }

      addLog(
        `🚀 Executing script "${currentScript.name}" for NFT ${nftData.address}`,
        "info"
      );
      addLog(`👤 Using profile: ${profile.name}`, "info");
      addLog(`🔇 Headless mode: ${headless ? "enabled" : "disabled"}`, "info");

      if (customData.trim()) {
        addLog(
          `📝 Custom data provided: ${customData.length} characters`,
          "info"
        );
      }

      // Here we would implement the actual script execution
      // This connects with the Puppeteer execution system
      try {
        // The actual execution will be handled by the ScriptManager
        // This is just logging for now
        addLog(`✅ Script execution initiated successfully`, "success");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        addLog(`❌ Script execution failed: ${errorMessage}`, "error");
      }
    },
    [currentScript, addLog]
  );

  /**
   * Load profiles from storage
   */
  const loadProfiles = useCallback(async () => {
    try {
      const profiles = await profileStorage.getProfiles();
      setAppState((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          profiles,
        },
      }));
      addLog(`📁 Loaded ${profiles.length} profiles from storage`, "info");
    } catch (error) {
      console.error("Error loading profiles:", error);
      addLog("❌ Failed to load profiles from storage", "error");
    }
  }, [addLog]);

  /**
   * Handle profile creation
   */
  const handleProfileCreate = useCallback(
    async (
      profileData: Omit<
        UserProfile,
        "id" | "createdAt" | "updatedAt" | "isActive"
      >
    ) => {
      try {
        const newProfile = await profileStorage.saveProfile(profileData);
        setAppState((prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            profiles: [...prev.profiles.profiles, newProfile],
          },
        }));
        addLog(
          `✅ Profile "${newProfile.name}" created successfully`,
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create profile";
        addLog(`❌ Failed to create profile: ${errorMessage}`, "error");
        throw error;
      }
    },
    [addLog]
  );

  /**
   * Handle profile update
   */
  const handleProfileUpdate = useCallback(
    async (profile: UserProfile) => {
      try {
        const updatedProfile = await profileStorage.updateProfile(
          profile.id,
          profile
        );
        setAppState((prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            profiles: prev.profiles.profiles.map((p) =>
              p.id === profile.id ? updatedProfile : p
            ),
          },
        }));
        addLog(
          `✅ Profile "${updatedProfile.name}" updated successfully`,
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update profile";
        addLog(`❌ Failed to update profile: ${errorMessage}`, "error");
        throw error;
      }
    },
    [addLog]
  );

  /**
   * Handle profile deletion
   */
  const handleProfileDelete = useCallback(
    async (profileId: string) => {
      try {
        const profile = appState.profiles.profiles.find(
          (p) => p.id === profileId
        );
        await profileStorage.deleteProfile(profileId);
        setAppState((prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            profiles: prev.profiles.profiles.filter((p) => p.id !== profileId),
            selectedProfile:
              prev.profiles.selectedProfile?.id === profileId
                ? undefined
                : prev.profiles.selectedProfile,
          },
        }));
        addLog(
          `🗑️ Profile "${profile?.name || profileId}" deleted successfully`,
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete profile";
        addLog(`❌ Failed to delete profile: ${errorMessage}`, "error");
      }
    },
    [addLog, appState.profiles.profiles]
  );

  /**
   * Handle profile selection
   */
  const handleProfileSelect = useCallback(
    (profile: UserProfile) => {
      setAppState((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          selectedProfile: profile,
        },
      }));
      addLog(`🔄 Profile "${profile.name}" selected for automation`, "info");
    },
    [addLog]
  );

  /**
   * Handle profile activation/deactivation
   */
  const handleProfileToggleActivation = useCallback(
    async (profileId: string) => {
      try {
        const maxActiveProfiles = appState.profiles.maxProfiles;
        const updatedProfile = await profileStorage.toggleProfileActivation(
          profileId,
          maxActiveProfiles
        );

        setAppState((prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            profiles: prev.profiles.profiles.map((p) =>
              p.id === profileId ? updatedProfile : p
            ),
          },
        }));

        const action = updatedProfile.isActive ? "activated" : "deactivated";
        addLog(
          `✅ Profile "${updatedProfile.name}" ${action} successfully`,
          "success"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to toggle profile activation";
        addLog(`❌ ${errorMessage}`, "error");
      }
    },
    [addLog, appState.profiles.maxProfiles]
  );

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>🚀 Twitter Automation Platform</h1>
        <p>
          Secure crypto wallet authentication with Puppeteer script execution
        </p>
      </div>

      <div className="app-main">
        <div className="main-grid">
          {/* Wallet Section */}
          <div className="card">
            <WalletConnection
              onWalletConnected={handleWalletConnected}
              onWalletDisconnected={handleWalletDisconnected}
            />
          </div>
        </div>

        {/* NFT Display */}
        {currentNFT && (
          <div className="card nft-section">
            <NFTDisplay
              nft={currentNFT}
              visible={appState.nft.visible}
              onImageClick={handleNFTImageClick}
              profiles={appState.profiles.profiles}
              maxProfiles={appState.profiles.maxProfiles}
              onScriptExecute={handleScriptExecute}
            />
          </div>
        )}

        {/* Profile Manager - показывается только после получения NFT */}
        {currentNFT && (
          <div className="card profile-section">
            <ProfileManager
              profiles={appState.profiles.profiles}
              onProfileCreate={handleProfileCreate}
              onProfileUpdate={handleProfileUpdate}
              onProfileDelete={handleProfileDelete}
              onProfileSelect={handleProfileSelect}
              onProfileToggleActivation={handleProfileToggleActivation}
              selectedProfile={appState.profiles.selectedProfile}
              maxProfiles={appState.profiles.maxProfiles}
            />
          </div>
        )}

        {/* Script Manager - отображается всегда если есть подключенный кошелек */}
        {appState.wallet.status.isConnected && (
          <div className="card script-section">
            <ScriptManager scriptData={currentScript} />
          </div>
        )}

        {/* Activity Log */}
        <div className="log-section">
          <ActivityLog logs={logs} maxEntries={100} autoScroll={true} />
        </div>
      </div>
    </div>
  );
}

export default App;
