/**
 * ScriptManager Component
 */

import React, { useState, useEffect, useCallback } from "react";
import { ScriptManagerProps, ScriptNFTMapping } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import "./ScriptManager.css";

export const ScriptManager: React.FC<ScriptManagerProps> = ({ scriptData }) => {
  const { t } = useLanguage();
  const [scriptNFTMappings, setScriptNFTMappings] = useState<
    ScriptNFTMapping[]
  >([]);

  // Get current NFT from window object (set by main App component)
  const getCurrentNFT = useCallback(() => {
    if (typeof window !== "undefined") {
      return (
        window as typeof window & {
          currentNFT?: {
            image: string;
            metadata?: unknown;
            timestamp?: number;
            subscription?: unknown;
          };
        }
      ).currentNFT;
    }
    return null;
  }, []);

  // Auto-associate script with current NFT when scriptData changes
  useEffect(() => {
    const currentNFT = getCurrentNFT();
    if (scriptData && currentNFT?.image) {
      const nftImage = currentNFT.image;

      const mapping: ScriptNFTMapping = {
        scriptId: scriptData.id,
        image: nftImage,
        associatedAt: Date.now(),
      };

      setScriptNFTMappings((prev) => {
        // Remove existing mapping for this NFT image
        const filtered = prev.filter((m) => m.image !== nftImage);
        const newMappings = [...filtered, mapping];
        console.log(
          `🔗 Auto-associated script "${scriptData.name}" with NFT image ${nftImage}`
        );
        console.log("📋 Current mappings:", newMappings);
        return newMappings;
      });
    }
  }, [scriptData, getCurrentNFT]);

  // Associate script with NFT image (manual method)
  const associateScriptWithNFT = useCallback(
    (nftImage: string) => {
      if (!scriptData) return;

      const mapping: ScriptNFTMapping = {
        scriptId: scriptData.id,
        image: nftImage,
        associatedAt: Date.now(),
      };

      setScriptNFTMappings((prev) => {
        // Remove existing mapping for this NFT image
        const filtered = prev.filter((m) => m.image !== nftImage);
        const newMappings = [...filtered, mapping];
        console.log(
          `🔗 Manual association: Script ${scriptData.name} with NFT image ${nftImage}`
        );
        return newMappings;
      });
    },
    [scriptData]
  );

  // Get associated NFT for current script
  const getAssociatedNFT = useCallback(
    (scriptId: string) => {
      return scriptNFTMappings.find((m) => m.scriptId === scriptId);
    },
    [scriptNFTMappings]
  );

  // Execute script (independent of NFT)
  const executeScript = useCallback(
    async (profileSettings?: {
      proxyAddress?: string;
      [key: string]: unknown;
    }) => {
      if (!scriptData) {
        console.error("❌ No script data available for execution");
        return;
      }

      console.log(`🚀 Executing script: ${scriptData.name}`);
      console.log(`⚙️ Profile settings:`, profileSettings);
      console.log(`📜 Script has code:`, !!(scriptData.code || scriptData.content));

      if (!scriptData.code && !scriptData.content) {
        console.error("❌ Script has no executable code");
        return;
      }

      try {
        // Send execution request to main process via IPC
        if (window.electronAPI?.executeScript) {
          const result = await window.electronAPI.executeScript({
            script: scriptData,
            settings: profileSettings,
          });
          console.log("✅ Script execution result:", result);

          // Notify parent about script start via custom event
          if (result.success && profileSettings?.proxyAddress) {
            window.dispatchEvent(
              new CustomEvent("script-started", {
                detail: {
                  proxyAddress: profileSettings.proxyAddress,
                  scriptId: scriptData.id,
                },
              })
            );
          }
        } else {
          console.log("📝 Script would execute with:", {
            scriptName: scriptData.name,
            scriptId: scriptData.id,
            profileSettings,
          });
        }
      } catch (error) {
        console.error("❌ Script execution failed:", error);
      }
    },
    [scriptData]
  );

  // Expose functions for parent components to use
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as typeof window & {
          scriptManager?: {
            executeScript: (profileSettings?: {
              proxyAddress?: string;
              [key: string]: unknown;
            }) => Promise<void>;
            associateScriptWithNFT: (nftImage: string) => void;
            getAssociatedNFT: (
              scriptId: string
            ) => ScriptNFTMapping | undefined;
          };
        }
      ).scriptManager = {
        executeScript,
        associateScriptWithNFT,
        getAssociatedNFT,
      };
    }
  }, [executeScript, associateScriptWithNFT, getAssociatedNFT]);

  return (
    <div className="script-manager">
      <div className="script-storage">
        <h3>{t("script.memory")}</h3>
        {scriptData ? (
          <div className="script-info">
            <div className="script-metadata">
              <h4>{t("script.memory")}</h4>
              <div className="metadata-item">
                <span className="metadata-label">{t("script.name")}:</span>
                <span className="metadata-value">{scriptData.name}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">{t("script.version")}:</span>
                <span className="metadata-value">{scriptData.version}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">{t("script.features")}:</span>
                <span className="metadata-value">
                  {scriptData.features.join(", ")}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">{t("script.status")}:</span>
                <span className="metadata-value">{t("script.loaded")}</span>
              </div>
              {scriptData.metadata?.description && (
                <div className="metadata-item">
                  <span className="metadata-label">
                    {t("script.description")}:
                  </span>
                  <span className="metadata-value">
                    {scriptData.metadata.description}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p>No script loaded</p>
        )}
      </div>
    </div>
  );
};
