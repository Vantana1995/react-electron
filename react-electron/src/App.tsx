/**
 * Social Automation Platform - Main App Component
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
import { LanguageProvider } from "./contexts/LanguageContext";
import { logger } from "./utils/logger";
import "./App.css";

// Internal component that uses hooks
const AppContent: React.FC = () => {
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

  // Track if app has been initialized to prevent multiple inits
  const [isInitialized, setIsInitialized] = useState(false);

  const [currentNFT, setCurrentNFT] = useState<NFTData | undefined>();
  const [currentScript, setCurrentScript] = useState<ScriptData | undefined>();

  // NFT+Script pairs state
  const [nftScriptPairs, setNftScriptPairs] = useState<
    Array<{
      nft: NFTData | null; // NFT can be null for scripts without NFT image
      script: ScriptData;
      maxProfiles: number;
      nftInfo: Record<string, unknown> | null;
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

  // Handle NFT+Script pairs from server callbacks (no more window synchronization)
  const handleNFTScriptPairs = useCallback(
    (
      pairs: Array<{
        nft: NFTData | null; // Can be null for scripts without NFT
        script: ScriptData;
        maxProfiles: number;
        nftInfo: Record<string, unknown> | null;
      }>
    ) => {
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return;
      }

      logger.log("🔄 Processing NFT+Script pairs:", pairs.length);
      logger.log(`  - With NFT: ${pairs.filter((p) => p.nft).length}`);
      logger.log(`  - Without NFT: ${pairs.filter((p) => !p.nft).length}`);

      // Update NFT+Script pairs state
      setNftScriptPairs(pairs);

      // Update max profiles for each script
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

          logger.log(
            `📊 Script ${scriptId} (${
              pair.script.name
            }): maxProfiles = ${finalMax}, hasNFT = ${!!pair.nft}`
          );
        }
      });

      setScriptMaxProfiles(newScriptMaxProfiles);

      // Set first pair as current for backward compatibility
      if (pairs[0]) {
        setCurrentNFT(pairs[0].nft || undefined); // Convert null to undefined
        setCurrentScript(pairs[0].script);
        setAppState((prev) => ({
          ...prev,
          profiles: {
            ...prev.profiles,
            maxProfiles: globalMaxProfiles, // Use global max for backward compatibility
          },
        }));
      }

      // Load profiles when pairs are received
      loadProfiles();
    },
    []
  );

  /**
   * Initialize the application
   */
  const initializeApp = useCallback(
    async (walletAddress?: string) => {
      // Prevent multiple initializations
      if (isInitialized) {
        logger.log("🚫 App already initialized, skipping...");
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
            logger.warn("Failed to get real IP:", error);
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

          // If no NFT+Script pairs, fallback to single NFT/script handling
          setAppState((prev) => ({
            ...prev,
            profiles: {
              ...prev.profiles,
              maxProfiles: prev.profiles.maxProfiles || 1, // Minimum 1 profile for free tier
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

      onServerPing: () => {},

      onNFTReceived: (nft: NFTData) => {
        logger.log("🖼️ NFT data received from SERVER API SERVICE:", nft);
        logger.log("📊 Subscription data from SERVER API:", nft.subscription);

        // Check if we already have this NFT to avoid duplicates
        const isSameNFT =
          currentNFT &&
          (currentNFT.address === nft.address ||
            (currentNFT.image === nft.image && nft.image && nft.image !== ""));

        if (isSameNFT) {
          logger.log("🖼️ NFT already received, skipping duplicate");
          return;
        }

        // For legacy single NFT handling (when no pairs are available)
        if (nftScriptPairs.length === 0) {
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
        }
      },

      onScriptReceived: (script: ScriptData) => {
        // For legacy single script handling (when no pairs are available)
        if (nftScriptPairs.length === 0) {
          setCurrentScript(script);
          setAppState((prev) => ({
            ...prev,
            script: {
              data: script,
              available: true,
            },
          }));
        }
      },

      // NEW: Direct callback for NFT+Script pairs
      onNFTScriptPairs: (pairs) => {
        logger.log("🔗 NFT+Script pairs received via callback:", pairs.length);
        handleNFTScriptPairs(pairs);
      },
    });

    // Setup IPC listeners if available
    if (window.electronAPI?.removeAllListeners) {
      // Clear previous listeners before adding new ones
      window.electronAPI.removeAllListeners("server-ping-received");
      window.electronAPI.removeAllListeners("nft-received");
      window.electronAPI.removeAllListeners("script-received");

      window.electronAPI.onServerPingReceived?.((data) => {
        logger.log("📡 Scripts received from tunnel via IPC");

        // Process NFT+Script pairs (already decrypted in main.ts)
        if (
          data.data?.nftScriptPairs &&
          Array.isArray(data.data.nftScriptPairs) &&
          data.data.nftScriptPairs.length > 0
        ) {
          logger.log(
            `🔗 Processing ${data.data.nftScriptPairs.length} NFT+Script pairs from tunnel`
          );
          handleNFTScriptPairs(data.data.nftScriptPairs);
        }
        // Process scripts without NFT
        else if (
          data.data?.scripts &&
          Array.isArray(data.data.scripts) &&
          data.data.scripts.length > 0
        ) {
          logger.log(
            `📜 Processing ${data.data.scripts.length} scripts without NFT from tunnel`
          );
          const maxProfiles =
            typeof data.data.maxProfiles === "number"
              ? data.data.maxProfiles
              : 1;

          // Use first script
          if (data.data.scripts[0]) {
            const script = data.data.scripts[0];
            setCurrentScript({
              id: script.id || "",
              name: script.name || "",
              version: script.version || "1.0.0",
              features: script.features || [],
              code: script.code || script.content || "",
              content: script.content || script.code || "",
              maxProfiles: maxProfiles,
              metadata: {
                description: script.description,
                entryPoint: script.entryPoint,
                category: script.category,
              },
            });

            setAppState((prev) => ({
              ...prev,
              script: {
                available: true,
              },
              profiles: {
                ...prev.profiles,
                maxProfiles: maxProfiles,
              },
            }));

            // Load profiles when script is received
            loadProfiles();
          }
        }
      });

      window.electronAPI.onNFTReceived?.((data) => {
        const nftData: NFTData = {
          address: data.address,
          image: data.image,
          metadata: data.metadata,
          timestamp: data.timestamp || Date.now(),
          subscription: (data as any).subscription as NFTData["subscription"], // Include subscription data from IPC
        };

        // Check if we already have this NFT to avoid duplicates
        const isSameNFT =
          currentNFT &&
          currentNFT.image === nftData.image &&
          nftData.image &&
          nftData.image !== "";

        if (isSameNFT) {
          logger.log(
            "🖼️ NFT already received via Electron, skipping duplicate"
          );
          return;
        }

        // For legacy single NFT handling (when no pairs are available)
        if (nftScriptPairs.length === 0) {
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
        }
      });

      window.electronAPI.onScriptReceived?.((data) => {
        logger.log("📜 Script received via Electron:", data.script.name);
        const scriptData: ScriptData = {
          id: data.script.id,
          name: data.script.name,
          version: data.script.version,
          features: data.script.features,
          code: data.script.code,
          content: data.script.content,
          metadata: data.script.metadata,
        };

        // For legacy single script handling (when no pairs are available)
        if (nftScriptPairs.length === 0) {
          setCurrentScript(scriptData);
          setAppState((prev) => ({
            ...prev,
            script: {
              data: scriptData,
              available: true,
            },
          }));
        }
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
            logger.log(
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
            logger.log(
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
            logger.log(
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
      logger.log(
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

        logger.log(
          `📊 Script ${scriptId} max profiles: ${scriptMaxProfilesForScript}, Global max: ${globalMaxProfiles}, Effective: ${effectiveMaxProfiles}`
        );

        const newRunningScripts = [
          ...new Set([...prev.profiles.runningScripts, proxyAddress]),
        ];

        // Check if exceeds effective maxProfiles limit
        if (newRunningScripts.length > effectiveMaxProfiles) {
          logger.warn(
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
        window.electronAPI.removeAllListeners("nft-received");
        window.electronAPI.removeAllListeners("script-received");
      }
      window.removeEventListener(
        "script-started",
        handleScriptStarted as EventListener
      );
      logger.log("🧹 App cleanup");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptMaxProfiles, handleNFTScriptPairs]); // Include dependencies

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
        logger.log(
          `📁 Loaded ${profiles.length} profiles from storage on mount`
        );
      } catch (error) {
        logger.error("Error loading profiles on mount:", error);
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

      // Initialize app only if wallet address and session token are present
      if (status.walletAddress && status.sessionToken && !isInitialized) {
        try {
          await initializeApp(status.walletAddress);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          logger.log(errorMessage);
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

    // Reset initialization state
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
      logger.error("Error loading profiles:", error);
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
        logger.log(errorMessage);
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
      logger.log(errorMessage);
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
        logger.log(errorMessage);
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
            logger.error("Failed to parse saved state:", error);
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
            logger.log(
              `✅ Cleared processed tweets history for profile: ${profile.name}`
            );
            alert(`History cleared for profile "${profile.name}"`);
          } else {
            logger.warn("Failed to clear history:", result.message);
            alert(`Failed to clear history: ${result.message}`);
          }
        } else {
          logger.warn("clearProfileHistory IPC not available");
        }
      } catch (error) {
        logger.error("Error clearing profile history:", error);
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
          <div className="app-main">
            <div className="main-grid">
              {/* Wallet Section */}
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
                  key={`${pair.nft?.address || pair.script.id}-${index}`}
                  className="card nft-section"
                >
                  <div className="pair-header">
                    <h3>
                      {pair.nft
                        ? `NFT+Script Pair #${index + 1}`
                        : `Script #${index + 1}`}
                    </h3>
                    <div className="pair-info">
                      {pair.nft && (
                        <span className="nft-name">
                          {pair.nft.metadata?.name || "Unnamed NFT"}
                        </span>
                      )}
                      <span className="script-name">{pair.script.name}</span>
                      <span className="max-profiles">
                        {pair.maxProfiles} profiles
                      </span>
                    </div>
                  </div>
                  <NFTDisplay
                    nft={pair.nft || undefined}
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

            {/* Profile Manager - only visible if connected to server */}
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
                    logger.log(
                      `🤖 Adding Telegram bot for profile: ${profile.name}`
                    );
                  }}
                />
              </div>
            )}

            {/* Script Manager  */}
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
