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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [showNFT, setShowNFT] = useState<boolean>(visible);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(
    null
  );
  const [customJsonData, setCustomJsonData] = useState<string>("");
  const [headlessMode, setHeadlessMode] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState<boolean>(false);

  // Конфигурационные поля
  const [regexTags, setRegexTags] = useState<string[]>(["crypto", "web3", "ticker", "memecoin"]);
  const [regexInput, setRegexInput] = useState<string>("");
  const [commentTemplates, setCommentTemplates] = useState<string>("");
  const [delayBetweenActions, setDelayBetweenActions] = useState<number>(3000);
  const [saveImagesFolder, setSaveImagesFolder] = useState<string>("");

  // Отслеживание запущенных скриптов по профилям
  const [activeScriptsByProfile, setActiveScriptsByProfile] = useState<Map<string, string>>(new Map());

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

  // Слушаем события скрипта (логи, остановка)
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleScriptOutput = (data: any) => {
      if (data.scriptId === runningScriptId) {
        setScriptLogs(prev => [...prev, data.output]);
      }
    };

    const handleScriptStopped = (data: any) => {
      if (data.scriptId === runningScriptId) {
        setIsExecuting(false);
        setRunningScriptId(null);
        setScriptLogs(prev => [...prev, "✅ Script stopped"]);

        // Удаляем из активных скриптов
        if (selectedProfile) {
          setActiveScriptsByProfile(prev => {
            const newMap = new Map(prev);
            newMap.delete(selectedProfile.proxy.ip);
            return newMap;
          });
        }
      }
    };

    window.electronAPI.onScriptOutput?.(handleScriptOutput);
    window.electronAPI.onScriptStopped?.(handleScriptStopped);
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

  const handleImageClick = () => {
    if (onImageClick && nft) {
      onImageClick(nft);
    }
    // Flip the NFT card to show controls
    setIsFlipped(!isFlipped);
  };

  const handleProfileSelect = (profile: UserProfile) => {
    setSelectedProfile(profile);
  };

  const handleExecuteScript = async () => {
    if (!nft || !selectedProfile || isExecuting) return;

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
        console.log("✅ Script execution completed:", result);

        // Save script ID for stop functionality
        if (result.scriptId) {
          setRunningScriptId(result.scriptId);
        }
      } else {
        console.log("📝 Script would execute with:", {
          scriptName: currentScript.name,
          profile: selectedProfile.name,
          headless: headlessMode,
          regexTags: regexTags,
          saveImagesFolder
        });
      }
    } catch (error) {
      console.error("❌ Script execution failed:", error);
      alert(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
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

  return (
    <div className="nft-display">
      {nft ? (
        <div className={`nft-card ${isFlipped ? "flipped" : ""}`}>
          {/* Front of the card - NFT Image */}
          <div className="nft-card-front">
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
                  onClick={handleImageClick}
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

          {/* Back of the card - Controls */}
          <div className="nft-card-back">
            <div className="nft-controls">
              <h4>🎯 Script Execution Setup</h4>

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

              {/* Custom JSON Data */}
              <div className="control-section">
                <label>📝 Custom JSON Data (Optional):</label>
                <textarea
                  placeholder='{
  "customSetting": "value",
  "anotherSetting": true
}'
                  value={customJsonData}
                  onChange={(e) => setCustomJsonData(e.target.value)}
                  rows={3}
                  className="json-textarea"
                />
              </div>

              {/* Headless Mode Toggle */}
              <div className="control-section">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={headlessMode}
                    onChange={(e) => setHeadlessMode(e.target.checked)}
                  />
                  🔇 Headless Mode (Run browser in background)
                </label>
              </div>

              {/* Advanced Configuration Toggle */}
              <div className="control-section">
                <button
                  className="config-toggle-button"
                  onClick={() => setShowConfigForm(!showConfigForm)}
                >
                  {showConfigForm ? "▼ Hide" : "▶"} Advanced Settings
                </button>
              </div>

              {/* Advanced Configuration Form */}
              {showConfigForm && (
                <div className="advanced-config">
                  <h5>⚙️ Advanced Configuration</h5>

                  {/* Regex Tags */}
                  <div className="control-section">
                    <label>🔍 Keywords (Filter tweets/content):</label>
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
                      Press Enter or comma to add keyword. Click × to remove. Backspace to remove last tag.
                    </small>
                  </div>

                  {/* Save Images Folder */}
                  <div className="control-section">
                    <label>📁 Save Images Folder:</label>
                    <div className="folder-selector">
                      <input
                        type="text"
                        placeholder="No folder selected"
                        value={saveImagesFolder}
                        readOnly
                        className="folder-input"
                      />
                      <button
                        className="select-folder-button"
                        onClick={handleSelectFolder}
                      >
                        📂 Browse
                      </button>
                    </div>
                    <small className="input-hint">
                      Choose where to save screenshots and downloaded images for this profile
                    </small>
                  </div>

                  {/* Navigation URL - Search Builder Integration */}
                  <div className="control-section">
                    <label>🌐 Navigation URL (Optional):</label>
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
                        🔍 Open Search Builder
                      </button>
                    )}
                    <small className="input-hint">
                      {externalNavigationUrl
                        ? "URL generated from Search Query Builder"
                        : "Build a custom Twitter search URL with advanced filters"}
                    </small>
                  </div>

                  {/* Comment Templates */}
                  <div className="control-section">
                    <label>💬 Comment Templates (one per line):</label>
                    <textarea
                      placeholder="Great project!&#10;Looking forward to this!&#10;Amazing work!"
                      value={commentTemplates}
                      onChange={(e) => setCommentTemplates(e.target.value)}
                      rows={3}
                      className="templates-textarea"
                    />
                    <small className="input-hint">
                      Random comment will be selected from these templates
                    </small>
                  </div>

                  {/* Delay Between Actions */}
                  <div className="control-section">
                    <label>⏱️ Delay Between Actions (ms):</label>
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
                    <small className="input-hint">
                      Delay between script actions (1000ms = 1 second)
                    </small>
                  </div>
                </div>
              )}

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
                      🔄 Executing...
                    </button>
                    {headlessMode && runningScriptId && (
                      <button
                        className="stop-button"
                        onClick={handleStopScript}
                      >
                        ⏹️ Stop Script
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Back Button */}
              <div className="control-section">
                <button
                  className="back-button"
                  onClick={() => setIsFlipped(false)}
                >
                  ← Back to NFT
                </button>
              </div>
            </div>
          </div>
        </div>
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
