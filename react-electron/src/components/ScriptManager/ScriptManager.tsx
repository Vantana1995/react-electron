/**
 * ScriptManager Component
 * Управление выполнением и мониторинг Puppeteer скриптов
 */

import React, { useState, useEffect, useCallback } from "react";
import { ScriptManagerProps} from "../../types";
import "./ScriptManager.css";

interface ScriptNFTMapping {
  scriptId: string;
  nftAddress: string;
  associatedAt: number;
}

export const ScriptManager: React.FC<ScriptManagerProps> = ({
  scriptData,
}) => {
  const [scriptNFTMappings, setScriptNFTMappings] = useState<ScriptNFTMapping[]>([]);
  const [currentNFTAddress, setCurrentNFTAddress] = useState<string | null>(null);

  // Get current NFT from window object (set by main App component)
  const getCurrentNFT = useCallback(() => {
    if (typeof window !== 'undefined') {
      return (window as any).currentNFT;
    }
    return null;
  }, []);

  // Auto-associate script with current NFT when scriptData changes
  useEffect(() => {
    const currentNFT = getCurrentNFT();
    if (scriptData && currentNFT?.address) {
      const nftAddress = currentNFT.address;
      setCurrentNFTAddress(nftAddress);

      const mapping: ScriptNFTMapping = {
        scriptId: scriptData.id,
        nftAddress,
        associatedAt: Date.now()
      };

      setScriptNFTMappings(prev => {
        // Remove existing mapping for this NFT
        const filtered = prev.filter(m => m.nftAddress !== nftAddress);
        const newMappings = [...filtered, mapping];
        console.log(`🔗 Auto-associated script "${scriptData.name}" with NFT ${nftAddress}`);
        console.log('📋 Current mappings:', newMappings);
        return newMappings;
      });
    }
  }, [scriptData, getCurrentNFT]);

  // Associate script with NFT address (manual method)
  const associateScriptWithNFT = useCallback((nftAddress: string) => {
    if (!scriptData) return;

    const mapping: ScriptNFTMapping = {
      scriptId: scriptData.id,
      nftAddress,
      associatedAt: Date.now()
    };

    setScriptNFTMappings(prev => {
      // Remove existing mapping for this NFT
      const filtered = prev.filter(m => m.nftAddress !== nftAddress);
      const newMappings = [...filtered, mapping];
      console.log(`🔗 Manual association: Script ${scriptData.name} with NFT ${nftAddress}`);
      return newMappings;
    });
  }, [scriptData]);

  // Get associated NFT for current script
  const getAssociatedNFT = useCallback((scriptId: string) => {
    return scriptNFTMappings.find(m => m.scriptId === scriptId);
  }, [scriptNFTMappings]);

  // Execute script for specific NFT
  const executeScriptForNFT = useCallback(async (nftAddress: string, profileSettings?: any) => {
    if (!scriptData) {
      console.error('❌ No script data available for execution');
      return;
    }

    console.log('🔍 Looking for mapping...', {
      nftAddress,
      mappingsCount: scriptNFTMappings.length,
      mappings: scriptNFTMappings
    });

    const mapping = scriptNFTMappings.find(m => m.nftAddress === nftAddress);
    if (!mapping) {
      console.error(`❌ No script mapping found for NFT ${nftAddress}`);
      console.error('Available mappings:', scriptNFTMappings);

      // Try to auto-associate if we have the current NFT
      const currentNFT = getCurrentNFT();
      if (currentNFT?.address === nftAddress) {
        console.log('🔄 Attempting auto-association...');
        associateScriptWithNFT(nftAddress);
        // Wait for state update and retry
        setTimeout(() => executeScriptForNFT(nftAddress, profileSettings), 100);
        return;
      }
      return;
    }

    console.log(`🚀 Executing script ${scriptData.name} for NFT ${nftAddress}`);
    console.log(`⚙️ Profile settings:`, profileSettings);
    console.log(`📜 Script content length:`, scriptData.content?.length || 0);

    // TODO: Implement actual Puppeteer script execution here
    // This should connect to the main Electron process for browser automation

    try {
      // Send execution request to main process via IPC
      if (window.electronAPI?.executeScript) {
        const result = await window.electronAPI.executeScript({
          script: scriptData,
          settings: profileSettings
        });
        console.log('✅ Script execution result:', result);

        // Notify parent about script start via custom event
        if (result.success && profileSettings?.profileId) {
          window.dispatchEvent(new CustomEvent('script-started', {
            detail: { profileId: profileSettings.profileId, scriptId: scriptData.id }
          }));
        }
      } else {
        console.log('📝 Script would execute with:', {
          scriptName: scriptData.name,
          nftAddress,
          profileSettings
        });
      }
    } catch (error) {
      console.error('❌ Script execution failed:', error);
    }
  }, [scriptData, scriptNFTMappings, getCurrentNFT, associateScriptWithNFT]);

  // Expose functions for parent components to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).scriptManager = {
        associateScriptWithNFT,
        executeScriptForNFT,
        getAssociatedNFT
      };
    }
  }, [associateScriptWithNFT, executeScriptForNFT, getAssociatedNFT]);

  return (
    <div className="script-manager">
      <div className="script-storage">
        <h3>📦 Script Memory Storage</h3>
        {scriptData ? (
          <div className="script-info">
            <p><strong>Script:</strong> {scriptData.name}</p>
            <p><strong>Version:</strong> {scriptData.version}</p>
            <p><strong>Features:</strong> {scriptData.features.join(", ")}</p>
            <p><strong>Status:</strong> Loaded in memory</p>

            {/* NFT Mappings */}
            <div className="nft-mappings">
              <h4>🔗 NFT Associations</h4>
              {scriptNFTMappings.length > 0 ? (
                <div className="mapping-list">
                  {scriptNFTMappings.map((mapping, index) => (
                    <div key={index} className="mapping-item">
                      <p><strong>NFT:</strong> {mapping.nftAddress.substring(0, 10)}...</p>
                      <p><strong>Associated:</strong> {new Date(mapping.associatedAt).toLocaleTimeString()}</p>
                      <button
                        className="execute-script-btn"
                        onClick={() => executeScriptForNFT(mapping.nftAddress)}
                        style={{
                          marginTop: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ▶️ Execute Script
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No NFT associations yet. Script will auto-associate when NFT is loaded.</p>
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
