/**
 * RunningScriptCard Component
 * Display card for actively running scripts
 */

import React from "react";
import { RunningScript } from "../../types";
import RamkaPlaceholder from "../../assets/Ramka.png";
import "./RunningScriptCard.css";

interface RunningScriptCardProps {
  script: RunningScript;
  nftImage?: string;
  onStop: (scriptId: string) => void;
}

export const RunningScriptCard: React.FC<RunningScriptCardProps> = ({
  script,
  nftImage,
  onStop,
}) => {
  const handleClick = () => {
    onStop(script.scriptId);
  };

  const formatRunningTime = (startTime: number): string => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="running-script-card" onClick={handleClick}>
      <div className="running-script-card-content">
        <div className="running-script-image-container">
          {nftImage || script.nftImage ? (
            <img
              src={nftImage || script.nftImage}
              alt={`Running: ${script.profileName}`}
              className="running-script-image"
            />
          ) : (
            <img
              src={RamkaPlaceholder}
              alt="Running Script"
              className="running-script-image placeholder"
            />
          )}

          {/* STOP Overlay */}
          <div className="stop-overlay">
            <div className="stop-text">STOP</div>
            <div className="stop-subtitle">{script.profileName}</div>
          </div>
        </div>

        <div className="running-script-info">
          <div className="running-script-title">
            {script.scriptName || "Running"}
          </div>
          <div className="running-script-profile">{script.profileName}</div>
          <div className="running-script-time">
            {formatRunningTime(script.startTime)}
          </div>
          {script.headless && (
            <div className="running-script-badge">Headless</div>
          )}
        </div>
      </div>

      <div className="running-script-hint">Click to stop script</div>
    </div>
  );
};
