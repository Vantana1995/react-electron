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
import { timerService } from "./services/timerService";
import "./App.css";

function App() {
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
  const [nftScriptMapping, setNftScriptMapping] = useState<
    Map<string, ScriptData>
  >(new Map());

  // Search Query Builder state
  const [navigationUrl, setNavigationUrl] = useState<string>("");
  const [showSearchBuilder, setShowSearchBuilder] = useState<boolean>(false);
  const [mainPageScrollPosition, setMainPageScrollPosition] =
    useState<number>(0);

  // Expose currentNFT and currentScript to window object for component access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).currentNFT = currentNFT;
      (window as any).currentScript = currentScript;
    }
  }, [currentNFT, currentScript]);

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
    [isInitialized, appState.wallet.status.walletAddress]
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

      onServerPing: (callback) => {},

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
        // Connect script with current NFT if available
        if (currentNFT) {
          setNftScriptMapping((prev) => {
            const newMapping = new Map(prev);
            newMapping.set(currentNFT.address, script);
            return newMapping;
          });
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
      });

      // Listen for script execution events
      if (window.electronAPI.onScriptFinished) {
        window.electronAPI.onScriptFinished((data: any) => {
          console.log(
            "✅ Script finished:",
            data.scriptId,
            "Profile:",
            data.profileId
          );
          // Remove profile from running scripts using profileId
          if (data.profileId) {
            setAppState((prev) => ({
              ...prev,
              profiles: {
                ...prev.profiles,
                runningScripts: prev.profiles.runningScripts.filter(
                  (id) => id !== data.profileId
                ),
              },
            }));
          }
        });
      }

      if (window.electronAPI.onScriptError) {
        window.electronAPI.onScriptError((data: any) => {
          console.log(
            "❌ Script error:",
            data.scriptId,
            "Profile:",
            data.profileId,
            data.error
          );
          // Remove profile from running scripts using profileId
          if (data.profileId) {
            setAppState((prev) => ({
              ...prev,
              profiles: {
                ...prev.profiles,
                runningScripts: prev.profiles.runningScripts.filter(
                  (id) => id !== data.profileId
                ),
              },
            }));
          }
        });
      }

      if (window.electronAPI.onScriptStopped) {
        window.electronAPI.onScriptStopped((data: any) => {
          console.log(
            "⏹️ Script stopped:",
            data.scriptId,
            "Profile:",
            data.profileId
          );
          // Remove profile from running scripts using profileId
          if (data.profileId) {
            setAppState((prev) => ({
              ...prev,
              profiles: {
                ...prev.profiles,
                runningScripts: prev.profiles.runningScripts.filter(
                  (id) => id !== data.profileId
                ),
              },
            }));
          }
        });
      }
    }
  };

  useEffect(() => {
    setupServerCallbacks();

    // Listen for custom script-started event from ScriptManager
    const handleScriptStarted = (event: CustomEvent) => {
      const { profileId, scriptId } = event.detail;
      console.log("▶️ Script started for profile:", profileId);
      setAppState((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          runningScripts: [
            ...new Set([...prev.profiles.runningScripts, profileId]),
          ], // Use Set to avoid duplicates
        },
      }));
    };

    window.addEventListener(
      "script-started",
      handleScriptStarted as EventListener
    );

    return () => {
      // Cleanup IPC listeners
      if (window.electronAPI) {
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
  }, []); // setupServerCallbacks не добавляем в зависимости, чтобы избежать бесконечного цикла

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
   * Handle NFT image click
   */
  const handleNFTImageClick = (nftData: NFTData) => {};

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
        return;
      }

      // Here we would implement the actual script execution
      // This connects with the Puppeteer execution system
      try {
        // The actual execution will be handled by the ScriptManager
        // This is just logging for now
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.log(errorMessage);
      }
    },
    [currentScript]
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
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to toggle profile activation";
      }
    },
    [appState.profiles.maxProfiles]
  );

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

  return (
    <div className="app-container">
      <ThemeToggle />
      {!showSearchBuilder ? (
        <div className="main-content">
          <div className="app-header">
            <h1>🚀 Twitter Automation Platform</h1>
            <p>
              Secure crypto wallet authentication with Puppeteer script
              execution
            </p>
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
                  onProfileActivate={handleProfileToggleActivation}
                  navigationUrl={navigationUrl}
                  onNavigationUrlChange={handleNavigationUrlChange}
                  onOpenSearchBuilder={handleOpenSearchBuilder}
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
                  runningScripts={appState.profiles.runningScripts}
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
          <SearchQueryBuilder onUseInScript={handleUseSearchUrl} />
        </div>
      )}
    </div>
  );
}

export default App;
