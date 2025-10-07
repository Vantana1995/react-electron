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
import { ScriptManager } from "./components/ScriptManager/ScriptManager";
import { ProfileManager } from "./components/ProfileManager";
import { SearchQueryBuilder } from "./components/SearchQueryBuilder/SearchQueryBuilder";
import { ThemeToggle } from "./components/ThemeToggle";
import LanguageSwitcher from "./components/LanguageSwitcher/LanguageSwitcher";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { timerService } from "./services/timerService";
import "./App.css";

// Internal component that uses hooks
const AppContent: React.FC = () => {
  const { t } = useLanguage();
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
      runningScripts: [], // Track which profiles have running scripts
    },
  });

  // Флаг для предотвращения повторной инициализации
  const [isInitialized, setIsInitialized] = useState(false);

  const [currentNFT, setCurrentNFT] = useState<NFTData | undefined>();
  const [currentScript, setCurrentScript] = useState<ScriptData | undefined>();

  // NFT+Script pairs state
  const [nftScriptPairs, setNftScriptPairs] = useState<
    Array<{
      nft: NFTData;
      script: ScriptData;
      maxProfiles: number;
      nftInfo: Record<string, unknown>;
    }>
  >([]);

  // Track max profiles per script
  const [scriptMaxProfiles, setScriptMaxProfiles] = useState<
    Map<string, number>
  >(new Map());

  // Search Query Builder state
  const [navigationUrl, setNavigationUrl] = useState<string>("");
  const [showSearchBuilder, setShowSearchBuilder] = useState<boolean>(false);
  const [mainPageScrollPosition, setMainPageScrollPosition] =
    useState<number>(0);

  // Expose currentNFT and currentScript to window object for component access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as typeof window & {
          currentNFT?: NFTData;
          currentScript?: ScriptData;
        }
      ).currentNFT = currentNFT;
      (
        window as typeof window & {
          currentNFT?: NFTData;
          currentScript?: ScriptData;
        }
      ).currentScript = currentScript;
    }
  }, [currentNFT, currentScript]);

  // Sync with window.nftScriptPairs from serverApiService
  useEffect(() => {
    const checkForNFTPairs = () => {
      if (
        typeof window !== "undefined" &&
        (window as typeof window & { nftScriptPairs?: Array<unknown> })
          .nftScriptPairs
      ) {
        const windowWithNFT = window as typeof window & {
          nftScriptPairs: Array<{
            nft: NFTData;
            script: ScriptData;
            maxProfiles: number;
            nftInfo: Record<string, unknown>;
          }>;
        };
        const pairs = windowWithNFT.nftScriptPairs;
        if (Array.isArray(pairs)) {
          console.log("🔄 Syncing NFT+Script pairs from window:", pairs.length);

          // Always update with latest pairs (they may have been added dynamically)
          console.log("🔄 Updating NFT+Script pairs state");
          setNftScriptPairs(pairs);

          // Update max profiles for each script and calculate global max
          const newScriptMaxProfiles = new Map<string, number>();
          let globalMaxProfiles = 0;

          pairs.forEach((pair) => {
            if (pair.script && pair.script.id) {
              const scriptId = pair.script.id;
              const currentMax = newScriptMaxProfiles.get(scriptId) || 0;
              const newMax = pair.maxProfiles || 0;

              // Use the higher value
              const finalMax = Math.max(currentMax, newMax);
              newScriptMaxProfiles.set(scriptId, finalMax);

              // Update global max profiles (use the highest value from all scripts)
              globalMaxProfiles = Math.max(globalMaxProfiles, finalMax);

              console.log(
                `📊 Script ${scriptId}: maxProfiles = ${finalMax} (was ${currentMax}, new ${newMax})`
              );
            }
          });

          setScriptMaxProfiles(newScriptMaxProfiles);

          // Set global max profiles for the application
          if (globalMaxProfiles > 0) {
            console.log(
              `🌍 Setting global maxProfiles to ${globalMaxProfiles}`
            );
            setAppState((prev) => ({
              ...prev,
              profiles: {
                ...prev.profiles,
                maxProfiles: globalMaxProfiles,
              },
            }));
          }

          // Set first pair as current for backward compatibility
          if (pairs[0]) {
            setCurrentNFT(pairs[0].nft);
            setCurrentScript(pairs[0].script);
          }
        }
      }
    };

    // Check immediately
    checkForNFTPairs();

    // Set up interval to check for updates (more frequent for dynamic updates)
    const interval = setInterval(checkForNFTPairs, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, []);

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

        updateSystemStatus("initializing", "Collecting device information...");

        // Collect device information
        const deviceData = await collectDeviceInfo();

        // Get real IPv4 BEFORE connecting to server using same method as serverApiService
        updateSystemStatus("initializing", "Getting device IP address...");

        const getRealIPv4 = async (): Promise<string> => {
          try {
            const pc = new RTCPeerConnection({ iceServers: [] });
            pc.createDataChannel("");

            const ipPromise = new Promise<string>((resolve) => {
              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
                  const ipMatch = event.candidate.candidate.match(ipRegex);
                  if (ipMatch && ipMatch[0] && !ipMatch[0].startsWith("127.")) {
                    resolve(ipMatch[0]);
                    pc.close();
                  }
                }
              };
            });

            await pc
              .createOffer()
              .then((offer) => pc.setLocalDescription(offer));

            const ip = await Promise.race([
              ipPromise,
              new Promise<string>((resolve) =>
                setTimeout(() => resolve("192.168.1.1"), 2000)
              ),
            ]);

            pc.close();
            return ip;
          } catch (error) {
            console.warn("Failed to get real IP:", error);
            return "192.168.1.1";
          }
        };

        const realIPv4 = await getRealIPv4();

        // Add IP to device data and send to main process BEFORE server connection
        const deviceDataWithIP = { ...deviceData, clientIPv4: realIPv4 };

        if (window.electronAPI?.setDeviceData) {
          await window.electronAPI.setDeviceData(deviceDataWithIP);
        }

        updateSystemStatus("initializing", "Connecting to server...");

        // Use provided wallet address or get from current state
        const addressToUse =
          walletAddress || appState.wallet.status.walletAddress;

        // Connect to server with device data that includes IP
        const serverResult = await connectToServer(
          deviceDataWithIP,
          addressToUse
        );

        if (serverResult.success) {
          updateSystemStatus("ready", "Connected and ready");

          if (serverResult.deviceHash) {
            setAppState((prev) => ({
              ...prev,
              system: {
                ...prev.system,
                deviceHash: serverResult.deviceHash,
              },
            }));
          }

          // Показываем секцию профилей сразу после успешного подключения
          // even if there's no NFT - user can get script without NFT
          // Check for global maxProfiles because it can be setup early from NFT+Script pairs
          const currentMaxProfiles = appState.profiles.maxProfiles;
          const newMaxProfiles =
            currentMaxProfiles > 0 ? currentMaxProfiles : 1; // Minimum 1 profile for free tier

          setAppState((prev) => ({
            ...prev,
            profiles: {
              ...prev.profiles,
              maxProfiles: newMaxProfiles,
            },
          }));
        } else {
          updateSystemStatus(
            "error",
            `Connection failed: ${serverResult.error}`
          );
          setIsInitialized(false);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        updateSystemStatus("error", `Initialization failed: ${errorMessage}`);
        setIsInitialized(false);
      }
    },
    [
      isInitialized,
      appState.wallet.status.walletAddress,
      appState.profiles.maxProfiles,
    ]
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
      },

      onServerPing: () => {},

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

        // Load profiles when NFT is received (verification complete)
        loadProfiles();
      },

      onScriptReceived: (script: ScriptData) => {
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
    if (window.electronAPI?.removeAllListeners) {
      // Очищаем предыдущие слушатели перед добавлением новых
      window.electronAPI.removeAllListeners("server-ping-received");
      window.electronAPI.removeAllListeners("ping-counter-update");
      window.electronAPI.removeAllListeners("nft-received");
      window.electronAPI.removeAllListeners("script-received");

      window.electronAPI.onServerPingReceived?.((data) => {
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

      window.electronAPI.onPingCounterUpdate?.((data) => {
        setAppState((prev) => ({
          ...prev,
          system: {
            ...prev.system,
            nonce: data.nonce,
            lastPing: data.timestamp,
          },
        }));
      });

      window.electronAPI.onNFTReceived?.((data) => {
        console.log(
          "🖼️ NFT IPC data received from ELECTRON MAIN PROCESS:",
          data
        );
        console.log(
          "📊 Subscription data from ELECTRON:",
          (data as Record<string, unknown>).subscription
        );

        const nftData: NFTData = {
          address: data.address,
          image: data.image,
          metadata: data.metadata,
          timestamp: data.timestamp || Date.now(),
          subscription: (data as Record<string, unknown>)
            .subscription as NFTData["subscription"], // Include subscription data from IPC
        };

        // More robust duplicate detection - check if it's the same NFT data
        const isSameNFT =
          currentNFT &&
          currentNFT.image === nftData.image &&
          nftData.image &&
          nftData.image !== "";

        if (isSameNFT) {
          console.log(
            "🖼️ NFT already received via Electron, skipping duplicate"
          );
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

        // Load profiles when NFT is received (verification complete)
        loadProfiles();
      });

      window.electronAPI.onScriptReceived?.((data) => {
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
      });

      // Listen for script execution events
      if (window.electronAPI.onScriptFinished) {
        window.electronAPI.onScriptFinished(
          (data: {
            scriptId: string;
            exitCode: number;
            success: boolean;
            output: string;
            error: string;
            timestamp: number;
            proxyAddress?: string;
          }) => {
            console.log(
              "✅ Script finished:",
              data.scriptId,
              "Proxy:",
              data.proxyAddress
            );
            // Remove profile from running scripts using proxyAddress
            if (data.proxyAddress) {
              setAppState((prev) => ({
                ...prev,
                profiles: {
                  ...prev.profiles,
                  runningScripts: prev.profiles.runningScripts.filter(
                    (proxyAddr) => proxyAddr !== data.proxyAddress
                  ),
                },
              }));
            }
          }
        );
      }

      if (window.electronAPI.onScriptError) {
        window.electronAPI.onScriptError(
          (data: {
            scriptId: string;
            error: string;
            timestamp: number;
            proxyAddress?: string;
          }) => {
            console.log(
              "❌ Script error:",
              data.scriptId,
              "Proxy:",
              data.proxyAddress,
              data.error
            );
            // Remove profile from running scripts using proxyAddress
            if (data.proxyAddress) {
              setAppState((prev) => ({
                ...prev,
                profiles: {
                  ...prev.profiles,
                  runningScripts: prev.profiles.runningScripts.filter(
                    (proxyAddr) => proxyAddr !== data.proxyAddress
                  ),
                },
              }));
            }
          }
        );
      }

      if (window.electronAPI.onScriptStopped) {
        window.electronAPI.onScriptStopped(
          (data: {
            scriptId: string;
            timestamp: number;
            reason?: string;
            proxyAddress?: string;
          }) => {
            console.log(
              "⏹️ Script stopped:",
              data.scriptId,
              "Proxy:",
              data.proxyAddress
            );
            // Remove profile from running scripts using proxyAddress
            if (data.proxyAddress) {
              setAppState((prev) => ({
                ...prev,
                profiles: {
                  ...prev.profiles,
                  runningScripts: prev.profiles.runningScripts.filter(
                    (proxyAddr) => proxyAddr !== data.proxyAddress
                  ),
                },
              }));
            }
          }
        );
      }
    }
  };

  useEffect(() => {
    setupServerCallbacks();

    // Listen for custom script-started event from ScriptManager
    const handleScriptStarted = (event: CustomEvent) => {
      const { proxyAddress, scriptId } = event.detail;
      console.log(
        "▶️ Script started for proxy:",
        proxyAddress,
        "script:",
        scriptId
      );

      setAppState((prev) => {
        // Get max profiles for this specific script
        const scriptMaxProfilesForScript = scriptMaxProfiles.get(scriptId) || 0;
        const globalMaxProfiles = prev.profiles.maxProfiles;

        // Use the higher value between script-specific and global max
        const effectiveMaxProfiles = Math.max(
          scriptMaxProfilesForScript,
          globalMaxProfiles
        );

        console.log(
          `📊 Script ${scriptId} max profiles: ${scriptMaxProfilesForScript}, Global max: ${globalMaxProfiles}, Effective: ${effectiveMaxProfiles}`
        );

        const newRunningScripts = [
          ...new Set([...prev.profiles.runningScripts, proxyAddress]),
        ];

        // Check if exceeds effective maxProfiles limit
        if (newRunningScripts.length > effectiveMaxProfiles) {
          console.warn(
            `⚠️ Cannot start script: Maximum ${effectiveMaxProfiles} profiles limit reached (script: ${scriptMaxProfilesForScript}, global: ${globalMaxProfiles})`
          );
          return prev;
        }

        return {
          ...prev,
          profiles: {
            ...prev.profiles,
            runningScripts: newRunningScripts,
          },
        };
      });
    };

    window.addEventListener(
      "script-started",
      handleScriptStarted as EventListener
    );

    return () => {
      // Cleanup IPC listeners
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners("server-ping-received");
        window.electronAPI.removeAllListeners("ping-counter-update");
        window.electronAPI.removeAllListeners("nft-received");
        window.electronAPI.removeAllListeners("script-received");
      }
      window.removeEventListener(
        "script-started",
        handleScriptStarted as EventListener
      );
      console.log("🧹 App cleanup");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptMaxProfiles]); // Include scriptMaxProfiles to update when script limits change

  // Load profiles from localStorage once on mount
  useEffect(() => {
    const initProfiles = async () => {
      try {
        const profiles = await profileStorage.getProfiles();
        setAppState((prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            profiles,
          },
        }));
        console.log(
          `📁 Loaded ${profiles.length} profiles from storage on mount`
        );
      } catch (error) {
        console.error("Error loading profiles on mount:", error);
      }
    };
    initProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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

      // После подключения кошелька сразу отправляем запрос в сервер (только один раз)
      if (status.walletAddress && status.sessionToken && !isInitialized) {
        try {
          await initializeApp(status.walletAddress);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.log(errorMessage);
        }
      }
    },
    [initializeApp, isInitialized]
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
    setIsInitialized(false);
    setCurrentNFT(undefined);
    setCurrentScript(undefined);
  }, []);

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
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  }, []);

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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create profile";
        console.log(errorMessage);
        throw error;
      }
    },
    []
  );

  /**
   * Handle profile update
   */
  const handleProfileUpdate = useCallback(async (profile: UserProfile) => {
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      console.log(errorMessage);
      throw error;
    }
  }, []);

  /**
   * Handle profile deletion
   */
  const handleProfileDelete = useCallback(
    async (profileId: string) => {
      try {
        const profile = appState.profiles.profiles.find(
          (p) => p.id === profileId
        );
        const proxyAddress = profile
          ? `${profile.proxy.ip}:${profile.proxy.port}`
          : null;

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
            // Remove from running scripts by proxy address
            runningScripts: proxyAddress
              ? prev.profiles.runningScripts.filter(
                  (addr) => addr !== proxyAddress
                )
              : prev.profiles.runningScripts,
          },
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete profile";
        console.log(errorMessage);
      }
    },
    [appState.profiles.profiles]
  );

  /**
   * Handle profile selection
   */
  const handleProfileSelect = useCallback((profile: UserProfile) => {
    setAppState((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        selectedProfile: profile,
      },
    }));
  }, []);

  /**
   * Handle navigation URL change from Search Builder
   */
  const handleNavigationUrlChange = useCallback((url: string) => {
    setNavigationUrl(url);
  }, []);

  /**
   * Handle opening Search Query Builder
   */
  const handleOpenSearchBuilder = useCallback(() => {
    setMainPageScrollPosition(window.scrollY);
    setShowSearchBuilder(true);
  }, []);

  /**
   * Handle using search URL in script
   */
  const handleUseSearchUrl = useCallback(
    (url: string) => {
      setNavigationUrl(url);
      setShowSearchBuilder(false);
      setTimeout(() => window.scrollTo(0, mainPageScrollPosition), 0);
    },
    [mainPageScrollPosition]
  );

  /**
   * State for profile query builder
   */
  const [buildingQueryForProfile, setBuildingQueryForProfile] =
    useState<UserProfile | null>(null);

  /**
   * Handle building query for a profile
   */
  const handleBuildQueryForProfile = useCallback((profile: UserProfile) => {
    setBuildingQueryForProfile(profile);
    setMainPageScrollPosition(window.scrollY);
    setShowSearchBuilder(true);
  }, []);

  /**
   * Handle saving query to profile
   */
  const handleSaveQueryToProfile = useCallback(
    async (url: string) => {
      if (buildingQueryForProfile) {
        const updatedProfile: UserProfile = {
          ...buildingQueryForProfile,
          navigationUrl: url,
          updatedAt: Date.now(),
        };
        await handleProfileUpdate(updatedProfile);
        setBuildingQueryForProfile(null);
      }
      setShowSearchBuilder(false);
      setTimeout(() => window.scrollTo(0, mainPageScrollPosition), 0);
    },
    [buildingQueryForProfile, mainPageScrollPosition, handleProfileUpdate]
  );

  /**
   * Handle clearing profile history (processed tweets)
   */
  const handleClearProfileHistory = useCallback(
    async (profile: UserProfile) => {
      try {
        const profileId = `${profile.proxy.ip}_${profile.proxy.port}`;

        // Get saveImagesFolder from localStorage (same key as NFTDisplay uses)
        const savedState = localStorage.getItem("nft-display-state");
        let saveImagesFolder = "";

        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            saveImagesFolder = state.saveImagesFolder || "";
          } catch (error) {
            console.error("Failed to parse saved state:", error);
          }
        }

        if (!saveImagesFolder) {
          alert(
            "Please select a folder for saving images first (in the script execution panel)"
          );
          return;
        }

        // Call electron IPC to delete the processed tweets file
        if (window.electronAPI?.clearProfileHistory) {
          const result = await window.electronAPI.clearProfileHistory(
            profileId,
            saveImagesFolder
          );
          if (result.success) {
            console.log(
              `✅ Cleared processed tweets history for profile: ${profile.name}`
            );
            alert(`History cleared for profile "${profile.name}"`);
          } else {
            console.warn("Failed to clear history:", result.message);
            alert(`Failed to clear history: ${result.message}`);
          }
        } else {
          console.warn("clearProfileHistory IPC not available");
        }
      } catch (error) {
        console.error("Error clearing profile history:", error);
        alert(`Error clearing history: ${(error as Error).message}`);
      }
    },
    []
  );

  return (
    <div className="app-container">
      <div className="app-controls">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      {!showSearchBuilder ? (
        <div className="main-content">
          <div className="app-header">
            <h1>{t("app.title")}</h1>
            <p>{t("app.subtitle")}</p>
          </div>

          <div className="app-main">
            <div className="main-grid">
              {/* Wallet Section - скрывается после успешного подключения */}
              {!appState.system.connected && (
                <div className="card">
                  <WalletConnection
                    onWalletConnected={handleWalletConnected}
                    onWalletDisconnected={handleWalletDisconnected}
                  />
                </div>
              )}
            </div>

            {/* NFT+Script Pairs Display */}
            {nftScriptPairs.length > 0 ? (
              nftScriptPairs.map((pair, index) => (
                <div
                  key={`${pair.nft.address || "unknown"}-${index}`}
                  className="card nft-section"
                >
                  <div className="pair-header">
                    <h3>NFT+Script Pair #{index + 1}</h3>
                    <div className="pair-info">
                      <span className="nft-name">
                        {pair.nft.metadata?.name || "Unnamed NFT"}
                      </span>
                      <span className="script-name">{pair.script.name}</span>
                      <span className="max-profiles">
                        {pair.maxProfiles} profiles
                      </span>
                    </div>
                  </div>
                  <NFTDisplay
                    nft={pair.nft}
                    visible={appState.nft.visible}
                    profiles={appState.profiles.profiles}
                    maxProfiles={appState.profiles.maxProfiles}
                    scriptMaxProfiles={pair.maxProfiles}
                    scriptId={pair.script.id}
                    scriptData={pair.script}
                    runningScripts={appState.profiles.runningScripts}
                    navigationUrl={navigationUrl}
                    onNavigationUrlChange={handleNavigationUrlChange}
                    onOpenSearchBuilder={handleOpenSearchBuilder}
                  />
                  <div className="script-info">
                    <h4>Associated Script: {pair.script.name}</h4>
                    <p>Version: {pair.script.version}</p>
                    <p>Features: {pair.script.features.join(", ")}</p>
                  </div>
                </div>
              ))
            ) : currentNFT ? (
              /* Legacy single NFT display for backward compatibility */
              <div className="card nft-section">
                <NFTDisplay
                  nft={currentNFT}
                  visible={appState.nft.visible}
                  profiles={appState.profiles.profiles}
                  maxProfiles={appState.profiles.maxProfiles}
                  scriptData={currentScript}
                  runningScripts={appState.profiles.runningScripts}
                  navigationUrl={navigationUrl}
                  onNavigationUrlChange={handleNavigationUrlChange}
                  onOpenSearchBuilder={handleOpenSearchBuilder}
                />
              </div>
            ) : currentScript ? (
              /* Free tier script display without NFT */
              <div className="card nft-section">
                <NFTDisplay
                  scriptData={currentScript}
                  visible={true}
                  profiles={appState.profiles.profiles}
                  maxProfiles={appState.profiles.maxProfiles}
                  runningScripts={appState.profiles.runningScripts}
                  navigationUrl={navigationUrl}
                  onNavigationUrlChange={handleNavigationUrlChange}
                  onOpenSearchBuilder={handleOpenSearchBuilder}
                />
              </div>
            ) : null}

            {/* Profile Manager - показывается после подключения к серверу */}
            {appState.system.connected && (
              <div className="card profile-section">
                <ProfileManager
                  profiles={appState.profiles.profiles}
                  onProfileCreate={handleProfileCreate}
                  onProfileUpdate={handleProfileUpdate}
                  onProfileDelete={handleProfileDelete}
                  onProfileSelect={handleProfileSelect}
                  selectedProfile={appState.profiles.selectedProfile}
                  maxProfiles={appState.profiles.maxProfiles}
                  onBuildQuery={handleBuildQueryForProfile}
                  onClearHistory={handleClearProfileHistory}
                  onAddTelegramBot={(profile) => {
                    console.log(
                      `🤖 Adding Telegram bot for profile: ${profile.name}`
                    );
                  }}
                />
              </div>
            )}

            {/* Script Manager - отображается всегда если есть подключенный кошелек */}
            {appState.wallet.status.isConnected && (
              <div className="card script-section">
                <ScriptManager scriptData={currentScript} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="search-builder-view">
          <div className="search-builder-header">
            <button
              className="back-button"
              onClick={() => {
                setShowSearchBuilder(false);
                setTimeout(() => window.scrollTo(0, mainPageScrollPosition), 0);
              }}
            >
              ← Back to Main
            </button>
          </div>
          <SearchQueryBuilder
            onUseInScript={
              buildingQueryForProfile
                ? handleSaveQueryToProfile
                : handleUseSearchUrl
            }
            profileContext={
              buildingQueryForProfile
                ? {
                    profileName: buildingQueryForProfile.name,
                    existingUrl: buildingQueryForProfile.navigationUrl,
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
};

// Main App component with LanguageProvider
const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
