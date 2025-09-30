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
}

export const NFTDisplay: React.FC<NFTDisplayProps> = ({
  nft,
  visible = false,
  onImageClick,
  profiles = [],
  maxProfiles,
  onScriptExecute,
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

    setIsExecuting(true);
    try {
      if (onScriptExecute) {
        await onScriptExecute(
          nft,
          selectedProfile,
          customJsonData,
          headlessMode
        );
      }

      // Associate script with NFT using the global scriptManager
      if (typeof window !== "undefined" && (window as any).scriptManager) {
        (window as any).scriptManager.associateScriptWithNFT(nft.address);
        (window as any).scriptManager.executeScriptForNFT(nft.address, {
          profile: selectedProfile,
          customData: customJsonData,
          headless: headlessMode,
        });
      }
    } catch (error) {
      console.error("Script execution failed:", error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getActiveProfilesCount = () => {
    return profiles.filter((p) => p.isActive).length;
  };

  const canActivateProfile = (profile: UserProfile) => {
    return !profile.isActive && getActiveProfilesCount() < (maxProfiles || 0);
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
                      disabled={
                        !profile.isActive && !canActivateProfile(profile)
                      }
                    >
                      {profile.name}{" "}
                      {profile.isActive
                        ? "(✓ Active)"
                        : canActivateProfile(profile)
                        ? "(Available)"
                        : `(Max ${maxProfiles} profiles reached)`}
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

              {/* Execute Button */}
              <div className="control-section">
                <button
                  className={`execute-button ${isExecuting ? "executing" : ""}`}
                  onClick={handleExecuteScript}
                  disabled={!selectedProfile || isExecuting}
                >
                  {isExecuting ? "🔄 Executing..." : "▶️ Execute Script"}
                </button>
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
