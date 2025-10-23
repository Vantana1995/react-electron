/**
 * NFT Display Component
 * React component for displaying NFT images and metadata
 */

import React, { useState, useEffect } from "react";
import { NFTData, UserProfile, ScriptData } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import RamkaPlaceholder from "../../assets/Ramka.png";
import "./NFTDisplay.css";

interface RunningScript {
  scriptId: string;
  profileId: string;
  profileName: string;
  startTime: number;
  headless: boolean;
  nftImage?: string;
  scriptName?: string;
}

interface NFTDisplayProps {
  nft?: NFTData;
  visible?: boolean;
  onImageClick?: (nftData: NFTData) => void;
  profiles?: UserProfile[];
  maxProfiles?: number;
  scriptMaxProfiles?: number; // Max profiles for the specific script
  scriptId?: string; // ID of the current script
  scriptData?: ScriptData; // Script data for free tier (no NFT)
  runningScripts?: string[]; // Array of running script proxy addresses
  onScriptExecute?: (
    nftData: NFTData,
    profile: UserProfile,
    customData: string,
    headless: boolean
  ) => void;
  onProfileActivate?: (profileId: string) => Promise<void>;
  navigationUrl?: string;
  onNavigationUrlChange?: (url: string) => void;
  onOpenSearchBuilder?: () => void;
  onRunningScriptsUpdate?: (scripts: RunningScript[]) => void;
}

export const NFTDisplay: React.FC<NFTDisplayProps> = ({
  nft,
  visible = false,
  onImageClick,
  profiles = [],
  maxProfiles,
  scriptMaxProfiles,
  scriptId,
  scriptData,
  runningScripts: globalRunningScripts = [],
  onScriptExecute,
  onProfileActivate,
  navigationUrl: externalNavigationUrl = "",
  onNavigationUrlChange,
  onOpenSearchBuilder,
  onRunningScriptsUpdate,
}) => {
  const { t } = useLanguage();

  
  const STORAGE_KEY = "nft-display-state";

  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        return state;
      }
    } catch (error) {
      console.error("Failed to load NFT state:", error);
    }
    return null;
  };

  const saveState = (state: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save NFT state:", error);
    }
  };

  const savedState = loadState();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [showNFT, setShowNFT] = useState<boolean>(visible);
  const [isExpanded, setIsExpanded] = useState<boolean>(
    savedState?.isExpanded ?? false
  );
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(
    savedState?.selectedProfile ?? null
  );
  const [headlessMode, setHeadlessMode] = useState<boolean>(
    savedState?.headlessMode ?? true
  );
  const [enableScreenshots, setEnableScreenshots] = useState<boolean>(
    savedState?.enableScreenshots ?? false
  );
  const [notOlderThanHours, setNotOlderThanHours] = useState<number>(
    savedState?.notOlderThanHours ?? 24
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null);

  const [regexTags, setRegexTags] = useState<string[]>(
    savedState?.regexTags ?? ["crypto", "web3", "ticker", "memecoin"]
  );
  const [regexInput, setRegexInput] = useState<string>("");
  const [commentTemplates, setCommentTemplates] = useState<string>(
    savedState?.commentTemplates ?? ""
  );
  const [delayBetweenActions, setDelayBetweenActions] = useState<number>(
    savedState?.delayBetweenActions ?? 3
  );
  const [saveImagesFolder, setSaveImagesFolder] = useState<string>(
    savedState?.saveImagesFolder ?? ""
  );
  const [navigationUrl, setNavigationUrl] = useState<string>(
    savedState?.navigationUrl ?? ""
  );

  const [runningScripts, setRunningScripts] = useState<RunningScript[]>([]);

  // Send running scripts to parent component
  useEffect(() => {
    if (onRunningScriptsUpdate) {
      // Add NFT image and script name to running scripts
      const enrichedScripts = runningScripts.map(script => ({
        ...script,
        nftImage: nft?.image,
        scriptName: scriptData?.name || nft?.metadata?.name,
      }));
      onRunningScriptsUpdate(enrichedScripts);
    }
  }, [runningScripts, onRunningScriptsUpdate, nft, scriptData]);

  useEffect(() => {
    if (nft?.image) {
      setShowNFT(true);
      setImageError(false);
      console.log("🖼️ NFT data received:", nft.address);
    } else if (scriptData) {
      setShowNFT(true);
      console.log("📜 Script data received without NFT:", scriptData.name);
    } else {
      setShowNFT(visible);
    }
  }, [nft, visible, scriptData]);

  // Debug logging for maxProfiles
  useEffect(() => {
    console.log("🔍 NFTDisplay maxProfiles value:", maxProfiles);
  }, [maxProfiles, profiles]);

  useEffect(() => {
    if (externalNavigationUrl && externalNavigationUrl !== navigationUrl) {
      setNavigationUrl(externalNavigationUrl);
    }
  }, [externalNavigationUrl]);

  
  useEffect(() => {
    saveState({
      isExpanded,
      selectedProfile,
      headlessMode,
      enableScreenshots,
      notOlderThanHours,
      regexTags,
      commentTemplates,
      delayBetweenActions,
      saveImagesFolder,
      navigationUrl,
    });
  }, [
    isExpanded,
    selectedProfile,
    headlessMode,
    enableScreenshots,
    notOlderThanHours,
    regexTags,
    commentTemplates,
    delayBetweenActions,
    saveImagesFolder,
    navigationUrl,
  ]);

  useEffect(() => {
    if (savedState?.selectedProfile && profiles.length > 0) {
      const matchingProfile = profiles.find(
        (p) => p.id === savedState.selectedProfile.id
      );
      if (matchingProfile) {
        setSelectedProfile(matchingProfile);
      }
    }
  }, [profiles]);

  // Listening event from scripts
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleScriptOutput = (data: any) => {
      if (data.scriptId === runningScriptId) {
        setScriptLogs((prev) => [...prev, data.output]);
      }
    };

    const handleScriptStopped = (data: any) => {
      setRunningScripts((prev) =>
        prev.filter((s) => s.scriptId !== data.scriptId)
      );

      if (data.scriptId === runningScriptId) {
        setIsExecuting(false);
        setRunningScriptId(null);
        const reason =
          data.reason === "browser-closed"
            ? "Browser closed by user"
            : "Script stopped";
        setScriptLogs((prev) => [...prev, `✅ ${reason}`]);
      }
    };

    const handleScriptFinished = (data: any) => {

      setRunningScripts((prev) =>
        prev.filter((s) => s.scriptId !== data.scriptId)
      );

      if (data.scriptId === runningScriptId) {
        setIsExecuting(false);
        setRunningScriptId(null);
        const message = data.success
          ? "✅ Script completed"
          : "❌ Script failed";
        setScriptLogs((prev) => [...prev, message]);
      }
    };

    window.electronAPI.onScriptOutput?.(handleScriptOutput);
    window.electronAPI.onScriptStopped?.(handleScriptStopped);
    window.electronAPI.onScriptFinished?.(handleScriptFinished);
  }, [runningScriptId, selectedProfile]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
    console.log("🖼️ NFT image loaded successfully");
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
    console.error("❌ Failed to load NFT image");
  };

  const handleContainerClick = () => {
    if (onImageClick && nft) {
      onImageClick(nft);
    }
    // Expand the NFT container to show controls
    setIsExpanded(!isExpanded);
  };

  const handleProfileSelect = (profile: UserProfile) => {
    setSelectedProfile(profile);
  };

  const handleExecuteScript = async () => {
    if ((!nft && !scriptData) || !selectedProfile) return;

    // Check if script is already running with this profile
    const profileAlreadyRunning = runningScripts.some(
      (s) => s.profileId === selectedProfile.id
    );
    if (profileAlreadyRunning) {
      alert(
        `Script is already running with profile "${selectedProfile.name}". Please stop it first or use a different profile.`
      );
      return;
    }

    // Check profile limit before starting script
    const effectiveMaxProfiles = scriptMaxProfiles || maxProfiles || 1;
    const totalRunningProfiles = globalRunningScripts.length;

    if (totalRunningProfiles >= effectiveMaxProfiles) {
      alert(
        `Cannot start script: Maximum ${effectiveMaxProfiles} profile(s) limit reached. Please stop a running script first.`
      );
      console.warn(
        `⚠️ Profile limit reached: ${totalRunningProfiles}/${effectiveMaxProfiles} profiles running`
      );
      return;
    }

    // Validate comment templates JSON array if provided
    if (commentTemplates.trim()) {
      try {
        // Clean trailing commas (common in JS but invalid in JSON)
        const cleanedTemplates = commentTemplates.replace(/,\s*([\]}])/g, "$1");

        const parsed = JSON.parse(cleanedTemplates);
        if (!Array.isArray(parsed)) {
          alert(
            'Comment Templates must be a JSON array (e.g., ["template1", "template2"])'
          );
          return;
        }
        // Check that all elements are strings
        if (!parsed.every((item) => typeof item === "string")) {
          alert("All items in Comment Templates array must be strings");
          return;
        }
      } catch (error) {
        console.error("JSON parse error:", error);
        alert(
          `Invalid JSON format in Comment Templates field.\n\nError: ${
            (error as Error).message
          }\n\nMake sure:\n- Array starts with [ and ends with ]\n- Each string is in double quotes ""`
        );
        return;
      }
    }

    // Get current script from props or window object
    const currentScript =
      scriptData ||
      (typeof window !== "undefined" ? (window as any).currentScript : null);

    if (!currentScript) {
      console.error(
        "❌ No script available. Please wait for script to be loaded from server."
      );
      alert(
        "No script available yet. Please wait for the server to send the script."
      );
      return;
    }

    setIsExecuting(true);
    try {
      // Auto-activate profile if not already active
      if (!selectedProfile.isActive && onProfileActivate) {
        console.log(`🔄 Auto-activating profile: ${selectedProfile.name}`);
        try {
          await onProfileActivate(selectedProfile.id);
          console.log(`✅ Profile activated successfully`);

          // Update local selectedProfile state to reflect activation
          setSelectedProfile({ ...selectedProfile, isActive: true });
        } catch (activationError) {
          console.error("❌ Failed to activate profile:", activationError);
          const errorMsg =
            activationError instanceof Error
              ? activationError.message
              : "Failed to activate profile";
          alert(`Cannot execute script: ${errorMsg}`);
          setIsExecuting(false);
          return;
        }
      }
      if (onScriptExecute && nft) {
        await onScriptExecute(
          nft,
          selectedProfile,
          commentTemplates,
          headlessMode
        );
      }

      // Execute script via Electron IPC
      if (window.electronAPI?.executeScript) {
        // Parse comment templates JSON array
        let commentTemplatesArray: string[] = [];
        if (commentTemplates.trim()) {
          try {
            // Clean trailing commas (same as validation)
            const cleanedTemplates = commentTemplates.replace(
              /,\s*([\]}])/g,
              "$1"
            );
            const parsed = JSON.parse(cleanedTemplates);
            if (Array.isArray(parsed)) {
              commentTemplatesArray = parsed;
            }
          } catch (error) {
            console.error("Failed to parse comment templates JSON:", error);
            // Already validated above, but just in case
          }
        }

        const result = await window.electronAPI.executeScript({
          script: currentScript,
          settings: {
            profile: selectedProfile,
            headless: headlessMode,
            enableScreenshots: enableScreenshots,
            regexPattern: regexTags.join("|"),
            regexTags: regexTags,
            saveImagesFolder: enableScreenshots ? saveImagesFolder : "",
            navigationUrl: navigationUrl || externalNavigationUrl,
            commentTemplates: commentTemplatesArray,
            delayBetweenActions: delayBetweenActions * 1000, // Convert seconds to milliseconds
          },
          nftData: nft || undefined,
        });
        console.log("✅ Script execution result:", result);

        // Check if script started successfully
        if (result.success && result.scriptId) {
          // Add to running scripts list
          const newRunningScript: RunningScript = {
            scriptId: result.scriptId,
            profileId: selectedProfile.id,
            profileName: selectedProfile.name,
            startTime: Date.now(),
            headless: headlessMode,
          };
          setRunningScripts((prev) => [...prev, newRunningScript]);

          setRunningScriptId(result.scriptId);
          setScriptLogs([`✅ Script started: ${currentScript.name}`]);

          // If headless mode, collapse the card automatically
          if (headlessMode) {
            setTimeout(() => {
              setIsExpanded(false);
              setIsExecuting(false);
              setRunningScriptId(null);
            }, 500);
          }
        } else {
          // Script failed to start
          setIsExecuting(false);
          alert(`Script failed to start: ${result.error || "Unknown error"}`);
        }
      } else {
        console.log("📝 Script would execute with:", {
          scriptName: currentScript.name,
          profile: selectedProfile.name,
          headless: headlessMode,
          regexTags: regexTags,
          saveImagesFolder,
        });
        setIsExecuting(false);
      }
    } catch (error) {
      console.error("❌ Script execution failed:", error);
      alert(
        `Script execution failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsExecuting(false);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        setSaveImagesFolder(folderPath);
        console.log("📁 Selected folder:", folderPath);
      }
    }
  };

  const handleStopScript = async () => {
    if (!runningScriptId) return;

    try {
      if (window.electronAPI?.stopScript) {
        await window.electronAPI.stopScript(runningScriptId);
        console.log("🛑 Script stop requested");
      }
    } catch (error) {
      console.error("❌ Failed to stop script:", error);
    }
  };

  const handleAddRegexTag = () => {
    const trimmedInput = regexInput.trim();
    if (trimmedInput && !regexTags.includes(trimmedInput)) {
      setRegexTags([...regexTags, trimmedInput]);
      setRegexInput("");
    }
  };

  const handleRemoveRegexTag = (tagToRemove: string) => {
    setRegexTags(regexTags.filter((tag) => tag !== tagToRemove));
  };

  const handleRegexInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddRegexTag();
    } else if (
      e.key === "Backspace" &&
      regexInput === "" &&
      regexTags.length > 0
    ) {
      // Remove last tag if input is empty and backspace is pressed
      setRegexTags(regexTags.slice(0, -1));
    }
  };

  if (!showNFT) {
    return null;
  }

  // Handler to stop script by scriptId
  const handleStopScriptById = async (scriptId: string) => {
    try {
      if (window.electronAPI?.stopScript) {
        await window.electronAPI.stopScript(scriptId);
        console.log(`🛑 Script ${scriptId} stop requested`);
      }
    } catch (error) {
      console.error("❌ Failed to stop script:", error);
    }
  };

  return (
    <div className="nft-display">
      {nft || scriptData ? (
        <>
          {/* Main NFT Card */}
          <div
            className={`nft-card ${isExpanded ? "expanded" : ""}`}
            onClick={!isExpanded ? handleContainerClick : undefined}
          >
            {/* NFT Image Section */}
            {!isExpanded && (
              <div className="nft-card-collapsed">
                <div className="nft-image-container">
                  {nft?.image ? (
                    <>
                      {isLoading && (
                        <div className="loading-placeholder">Loading...</div>
                      )}

                      {imageError ? (
                        <div className="error-placeholder">
                          ❌ Failed to load image
                        </div>
                      ) : (
                        <img
                          src={nft.image}
                          alt={nft.metadata?.name || "NFT Image"}
                          className="nft-image"
                          onLoad={handleImageLoad}
                          onError={handleImageError}
                          style={{ display: isLoading ? "none" : "block" }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="script-placeholder">
                      <img
                        src={RamkaPlaceholder}
                        alt={scriptData?.name || "Script"}
                        className="nft-image"
                        style={{ display: "block", width: "100%", height: "100%" }}
                      />
                    </div>
                  )}
                </div>

                {(nft?.metadata?.name || scriptData?.name) && (
                  <div className="nft-card-title">
                    {nft?.metadata?.name || scriptData?.name}
                  </div>
                )}

                <div className="click-hint">
                  Click to configure script execution
                </div>
              </div>
            )}

            {/* Expanded Settings View */}
            {isExpanded && (
              <div className="nft-card-expanded">
                {/* Left Column - Settings */}
                <div className="settings-column">
                  <div className="settings-scroll">
                    <h4>Script Configuration</h4>

                    {/* Profile Selection */}
                    <div className="control-section">
                      <label>Select Profile:</label>
                      <select
                        value={selectedProfile?.id || ""}
                        onChange={(e) => {
                          const profile = profiles.find(
                            (p) => p.id === e.target.value
                          );
                          if (profile) handleProfileSelect(profile);
                        }}
                        disabled={profiles.length === 0}
                      >
                        <option value="">{t("nft.chooseProfile")}</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                            {profile.isActive ? " ✓" : ""}
                          </option>
                        ))}
                      </select>
                      <div className="profile-info">
                        Running profiles: {globalRunningScripts.length} /{" "}
                        {scriptMaxProfiles || maxProfiles || 1}
                        {scriptMaxProfiles &&
                          scriptMaxProfiles !== maxProfiles && (
                            <span className="script-specific-limit">
                              {" "}
                              (Script: {scriptMaxProfiles}, Global:{" "}
                              {maxProfiles || 1})
                            </span>
                          )}
                        {globalRunningScripts.length >=
                          (scriptMaxProfiles || maxProfiles || 1) && (
                          <span
                            className="limit-reached"
                            style={{
                              color: "var(--accent-error)",
                              fontWeight: "bold",
                            }}
                          >
                            {" "}
                            ⚠️ Limit reached
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Headless Mode Toggle */}
                    <div className="control-section">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={headlessMode}
                          onChange={(e) => setHeadlessMode(e.target.checked)}
                        />
                        {t("nft.headlessMode")}
                      </label>
                    </div>

                    {/* Screenshots Toggle */}
                    <div className="control-section">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={enableScreenshots}
                          onChange={(e) =>
                            setEnableScreenshots(e.target.checked)
                          }
                        />
                        {t("nft.enableScreenshots")}
                      </label>
                    </div>

                    {/* Content Age Filter */}
                    <div className="control-section">
                      <label>Content Age (hours):</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={notOlderThanHours}
                        onChange={(e) =>
                          setNotOlderThanHours(parseInt(e.target.value) || 24)
                        }
                        placeholder="24"
                        title="Interact with content not older than N hours (1-168)"
                        style={{
                          width: "80px",
                          padding: "4px 8px",
                          marginLeft: "8px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.9em",
                          marginLeft: "8px",
                          opacity: 0.7,
                        }}
                      >
                        (1-168 hours)
                      </span>
                    </div>

                    {/* Regex Tags */}
                    <div className="control-section">
                      <label>Keywords:</label>
                      <div className="regex-tags-container">
                        <div className="regex-tags">
                          {regexTags.map((tag, index) => (
                            <span key={index} className="regex-tag">
                              {tag}
                              <button
                                className="regex-tag-remove"
                                onClick={() => handleRemoveRegexTag(tag)}
                                type="button"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            placeholder="Add keyword..."
                            value={regexInput}
                            onChange={(e) => setRegexInput(e.target.value)}
                            onKeyDown={handleRegexInputKeyDown}
                            onBlur={handleAddRegexTag}
                            className="regex-tag-input"
                          />
                        </div>
                      </div>
                      <small className="input-hint">
                        Press Enter or comma to add
                      </small>
                    </div>

                    {/* Save Images Folder - only show when screenshots enabled */}
                    {enableScreenshots && (
                      <div className="control-section">
                        <label>Save Folder:</label>
                        <div className="folder-selector">
                          <input
                            type="text"
                            placeholder="No folder"
                            value={saveImagesFolder}
                            readOnly
                            className="folder-input"
                          />
                          <button
                            className="select-folder-button"
                            onClick={handleSelectFolder}
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Navigation URL */}
                    <div className="control-section">
                      <label>Navigation URL:</label>
                      {navigationUrl || externalNavigationUrl ? (
                        <div className="url-display-container">
                          <div className="url-display">
                            {navigationUrl || externalNavigationUrl}
                          </div>
                          <button
                            className="clear-url-button"
                            onClick={() => {
                              setNavigationUrl("");
                              onNavigationUrlChange?.("");
                            }}
                            type="button"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          className="open-search-builder-button"
                          onClick={onOpenSearchBuilder}
                          type="button"
                        >
                          Open Builder
                        </button>
                      )}
                    </div>

                    {/* Delay */}
                    <div className="control-section">
                      <label>Delay (seconds):</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        value={delayBetweenActions}
                        onChange={(e) =>
                          setDelayBetweenActions(parseInt(e.target.value) || 3)
                        }
                        className="number-input"
                      />
                    </div>

                    {/* Execute/Stop Buttons */}
                    <div className="control-section">
                      {!isExecuting ? (
                        <button
                          className="execute-button"
                          onClick={handleExecuteScript}
                          disabled={
                            !selectedProfile ||
                            globalRunningScripts.length >=
                              (scriptMaxProfiles || maxProfiles || 1)
                          }
                        >
                          {t("nft.execute")}
                        </button>
                      ) : (
                        <div className="executing-controls">
                          <button className="execute-button executing" disabled>
                            {t("nft.running")}
                          </button>
                          {runningScriptId && (
                            <button
                              className="stop-button"
                              onClick={handleStopScript}
                            >
                              {t("nft.stop")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Back Button */}
                    <div className="control-section">
                      <button
                        className="back-button"
                        onClick={() => setIsExpanded(false)}
                      >
                        ← {t("nft.closeSettings")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - JSON Templates */}
                <div className="json-column">
                  <div className="json-scroll">
                    <h4>Response Templates (JSON)</h4>

                    <div className="control-section">
                      <label>Comment Templates (JSON Array):</label>
                      <textarea
                        placeholder={`[
  "gmski fren, TGIF - #MORICOIN weekend vibes incoming",
  "good morning legend, Friday feels and #MORICOIN weekend reels",
  "mate guMornin, thank god its Friday with #MORICOIN",
  "broski gm, end of week #MORICOIN grind complete"
]`}
                        value={commentTemplates}
                        onChange={(e) => setCommentTemplates(e.target.value)}
                        rows={15}
                        className="json-textarea"
                      />
                      <small className="input-hint">
                        JSON array format: ["template1", "template2", ...].
                        Random selection.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="nft-placeholder">
          <div className="placeholder-content">
            <span>Waiting for script or NFT data from server...</span>
            <p>
              Connect your wallet and wait for server ping to receive script or
              NFT information.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
