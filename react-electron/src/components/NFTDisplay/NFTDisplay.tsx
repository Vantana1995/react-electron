/**
 * NFT Display Component
 * React component for displaying NFT images and metadata
 */

import React, { useState, useEffect } from "react";
import { NFTData, UserProfile } from "../../types";
import "./NFTDisplay.css";

interface NFTDisplayProps {
  nft?: NFTData;
  visible?: boolean;
  onImageClick?: (nftData: NFTData) => void;
  profiles?: UserProfile[];
  maxProfiles?: number;
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
}

export const NFTDisplay: React.FC<NFTDisplayProps> = ({
  nft,
  visible = false,
  onImageClick,
  profiles = [],
  maxProfiles,
  onScriptExecute,
  onProfileActivate,
  navigationUrl: externalNavigationUrl = "",
  onNavigationUrlChange,
  onOpenSearchBuilder,
}) => {
  // Ключ для сохранения состояния в localStorage
  const STORAGE_KEY = 'nft-display-state';

  // Функция загрузки состояния из localStorage
  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        return state;
      }
    } catch (error) {
      console.error('Failed to load NFT state:', error);
    }
    return null;
  };

  // Функция сохранения состояния в localStorage
  const saveState = (state: any) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save NFT state:', error);
    }
  };

  const savedState = loadState();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [showNFT, setShowNFT] = useState<boolean>(visible);
  const [isExpanded, setIsExpanded] = useState<boolean>(savedState?.isExpanded ?? false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(
    savedState?.selectedProfile ?? null
  );
  const [customJsonData, setCustomJsonData] = useState<string>(savedState?.customJsonData ?? "");
  const [headlessMode, setHeadlessMode] = useState<boolean>(savedState?.headlessMode ?? true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState<boolean>(false);

  // Конфигурационные поля
  const [regexTags, setRegexTags] = useState<string[]>(
    savedState?.regexTags ?? ["crypto", "web3", "ticker", "memecoin"]
  );
  const [regexInput, setRegexInput] = useState<string>("");
  const [commentTemplates, setCommentTemplates] = useState<string>(savedState?.commentTemplates ?? "");
  const [delayBetweenActions, setDelayBetweenActions] = useState<number>(savedState?.delayBetweenActions ?? 3000);
  const [saveImagesFolder, setSaveImagesFolder] = useState<string>(savedState?.saveImagesFolder ?? "");

  // Множественные запущенные скрипты
  interface RunningScript {
    scriptId: string;
    profileId: string;
    profileName: string;
    startTime: number;
    headless: boolean;
  }
  const [runningScripts, setRunningScripts] = useState<RunningScript[]>([]);

  useEffect(() => {
    if (nft?.image) {
      setShowNFT(true);
      setImageError(false);
      console.log("🖼️ NFT data received:", nft.address);
    } else {
      setShowNFT(visible);
    }
  }, [nft, visible]);

  // Debug logging for maxProfiles
  useEffect(() => {
    console.log("🔍 NFTDisplay maxProfiles value:", maxProfiles);
  }, [maxProfiles, profiles]);

  // Сохраняем состояние при изменении
  useEffect(() => {
    saveState({
      isExpanded,
      selectedProfile,
      customJsonData,
      headlessMode,
      regexTags,
      commentTemplates,
      delayBetweenActions,
      saveImagesFolder
    });
  }, [isExpanded, selectedProfile, customJsonData, headlessMode, regexTags, commentTemplates, delayBetweenActions, saveImagesFolder]);

  // Синхронизируем выбранный профиль с актуальным списком
  useEffect(() => {
    if (savedState?.selectedProfile && profiles.length > 0) {
      const matchingProfile = profiles.find(p => p.id === savedState.selectedProfile.id);
      if (matchingProfile) {
        setSelectedProfile(matchingProfile);
      }
    }
  }, [profiles]);

  // Слушаем события скрипта (логи, остановка)
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleScriptOutput = (data: any) => {
      if (data.scriptId === runningScriptId) {
        setScriptLogs(prev => [...prev, data.output]);
      }
    };

    const handleScriptStopped = (data: any) => {
      // Удаляем из списка запущенных скриптов
      setRunningScripts(prev => prev.filter(s => s.scriptId !== data.scriptId));

      // Если это текущий выполняющийся скрипт
      if (data.scriptId === runningScriptId) {
        setIsExecuting(false);
        setRunningScriptId(null);
        const reason = data.reason === 'browser-closed' ? 'Browser closed by user' : 'Script stopped';
        setScriptLogs(prev => [...prev, `✅ ${reason}`]);
      }
    };

    const handleScriptFinished = (data: any) => {
      // Удаляем из списка запущенных скриптов
      setRunningScripts(prev => prev.filter(s => s.scriptId !== data.scriptId));

      // Если это текущий выполняющийся скрипт
      if (data.scriptId === runningScriptId) {
        setIsExecuting(false);
        setRunningScriptId(null);
        const message = data.success ? '✅ Script completed' : '❌ Script failed';
        setScriptLogs(prev => [...prev, message]);
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
    if (!nft || !selectedProfile) return;

    // Check if script is already running with this profile
    const profileAlreadyRunning = runningScripts.some(s => s.profileId === selectedProfile.id);
    if (profileAlreadyRunning) {
      alert(`Script is already running with profile "${selectedProfile.name}". Please stop it first or use a different profile.`);
      return;
    }

    // Validate custom JSON data if provided
    if (customJsonData.trim()) {
      try {
        JSON.parse(customJsonData);
      } catch (error) {
        alert("Invalid JSON format in custom data field");
        return;
      }
    }

    // Get current script from window object
    const currentScript = typeof window !== "undefined" ? (window as any).currentScript : null;

    if (!currentScript) {
      console.error("❌ No script available. Please wait for script to be loaded from server.");
      alert("No script available yet. Please wait for the server to send the script.");
      return;
    }

    console.log(`🚀 Executing script: ${currentScript.name}`);
    console.log(`📋 Profile: ${selectedProfile.name}`);
    console.log(`⚙️ Headless: ${headlessMode}`);

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
          const errorMsg = activationError instanceof Error ? activationError.message : "Failed to activate profile";
          alert(`Cannot execute script: ${errorMsg}`);
          setIsExecuting(false);
          return;
        }
      }
      if (onScriptExecute) {
        await onScriptExecute(
          nft,
          selectedProfile,
          customJsonData,
          headlessMode
        );
      }

      // Execute script via Electron IPC
      if (window.electronAPI?.executeScript) {
        const result = await window.electronAPI.executeScript({
          script: currentScript,
          settings: {
            profileId: selectedProfile.id, // Add profileId for tracking
            profile: selectedProfile,
            customData: customJsonData,
            headless: headlessMode,
            regexPattern: regexTags.join('|'),
            regexTags: regexTags,
            saveImagesFolder: saveImagesFolder,
            navigationUrl: externalNavigationUrl,
            commentTemplates: commentTemplates.split('\n').filter(t => t.trim()),
            delayBetweenActions: delayBetweenActions
          },
          nftData: nft
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
            headless: headlessMode
          };
          setRunningScripts(prev => [...prev, newRunningScript]);

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
          alert(`Script failed to start: ${result.error || 'Unknown error'}`);
        }
      } else {
        console.log("📝 Script would execute with:", {
          scriptName: currentScript.name,
          profile: selectedProfile.name,
          headless: headlessMode,
          regexTags: regexTags,
          saveImagesFolder
        });
        setIsExecuting(false);
      }
    } catch (error) {
      console.error("❌ Script execution failed:", error);
      alert(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExecuting(false);
    }
  };

  const getActiveProfilesCount = () => {
    return profiles.filter((p) => p.isActive).length;
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
    setRegexTags(regexTags.filter(tag => tag !== tagToRemove));
  };

  const handleRegexInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRegexTag();
    } else if (e.key === 'Backspace' && regexInput === '' && regexTags.length > 0) {
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
      {nft ? (
        <>
          {/* Main NFT Card */}
          <div className={`nft-card ${isExpanded ? "expanded" : ""}`} onClick={!isExpanded ? handleContainerClick : undefined}>
            {/* NFT Image Section */}
            {!isExpanded && (
              <div className="nft-card-collapsed">
                <div className="nft-image-container">
                  {isLoading && (
                    <div className="loading-placeholder">Loading...</div>
                  )}

                  {imageError ? (
                    <div className="error-placeholder">❌ Failed to load image</div>
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
                </div>

                {nft.metadata?.name && (
                  <div className="nft-card-title">{nft.metadata.name}</div>
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
                  <h4>⚙️ Script Configuration</h4>

                  {/* Profile Selection */}
                  <div className="control-section">
                    <label>👤 Select Profile:</label>
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
                      <option value="">Choose a profile...</option>
                      {profiles.map((profile) => (
                        <option
                          key={profile.id}
                          value={profile.id}
                        >
                          {profile.name}{profile.isActive ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="profile-info">
                      Active profiles: {getActiveProfilesCount()} /{" "}
                      {maxProfiles || 0}
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
                      🔇 Headless Mode
                    </label>
                  </div>

                  {/* Regex Tags */}
                  <div className="control-section">
                    <label>🔍 Keywords:</label>
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

                  {/* Save Images Folder */}
                  <div className="control-section">
                    <label>📁 Save Folder:</label>
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
                        📂
                      </button>
                    </div>
                  </div>

                  {/* Navigation URL */}
                  <div className="control-section">
                    <label>🌐 Navigation URL:</label>
                    {externalNavigationUrl ? (
                      <div className="url-display-container">
                        <div className="url-display">
                          {externalNavigationUrl}
                        </div>
                        <button
                          className="clear-url-button"
                          onClick={() => onNavigationUrlChange?.("")}
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
                        🔍 Open Builder
                      </button>
                    )}
                  </div>

                  {/* Delay */}
                  <div className="control-section">
                    <label>⏱️ Delay (ms):</label>
                    <input
                      type="number"
                      min="1000"
                      max="60000"
                      step="500"
                      value={delayBetweenActions}
                      onChange={(e) =>
                        setDelayBetweenActions(parseInt(e.target.value) || 1000)
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
                        disabled={!selectedProfile}
                      >
                        ▶️ Execute Script
                      </button>
                    ) : (
                      <div className="executing-controls">
                        <button
                          className="execute-button executing"
                          disabled
                        >
                          🔄 Running...
                        </button>
                        {runningScriptId && (
                          <button
                            className="stop-button"
                            onClick={handleStopScript}
                          >
                            ⏹️ Stop
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
                      ← Close Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - JSON Templates */}
              <div className="json-column">
                <div className="json-scroll">
                  <h4>💬 Response Templates (JSON)</h4>

                  <div className="control-section">
                    <label>Comment Templates:</label>
                    <textarea
                      placeholder='Great project!\nLooking forward to this!\nAmazing work!'
                      value={commentTemplates}
                      onChange={(e) => setCommentTemplates(e.target.value)}
                      rows={8}
                      className="templates-textarea"
                    />
                    <small className="input-hint">
                      One per line. Random selection.
                    </small>
                  </div>

                  <div className="control-section">
                    <label>📝 Custom JSON Data:</label>
                    <textarea
                      placeholder='{
  "customSetting": "value",
  "anotherSetting": true
}'
                      value={customJsonData}
                      onChange={(e) => setCustomJsonData(e.target.value)}
                      rows={10}
                      className="json-textarea"
                    />
                    <small className="input-hint">
                      Optional script configuration
                    </small>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Running Scripts - Display as NFT Cards */}
          {runningScripts.map((runningScript) => (
            <div
              key={runningScript.scriptId}
              className="nft-card running-script-card"
              onClick={() => handleStopScriptById(runningScript.scriptId)}
            >
              <div className="nft-card-collapsed">
                <div className="nft-image-container">
                  {!imageError && nft.image ? (
                    <img
                      src={nft.image}
                      alt={`Running: ${runningScript.profileName}`}
                      className="nft-image"
                    />
                  ) : (
                    <div className="error-placeholder">❌ No image</div>
                  )}

                  {/* STOP Overlay */}
                  <div className="stop-overlay">
                    <div className="stop-text">STOP</div>
                    <div className="stop-subtitle">{runningScript.profileName}</div>
                  </div>
                </div>

                <div className="nft-card-title">
                  Running: {runningScript.profileName}
                </div>

                <div className="click-hint running-hint">
                  Click to stop script
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="nft-placeholder">
          <div className="placeholder-content">
            <span>🔄 Waiting for NFT data from server...</span>
            <p>
              Connect your wallet and wait for server ping to receive NFT
              information.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
