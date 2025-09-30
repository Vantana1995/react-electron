/**
 * Wallet Connection Component
 * React component for handling wallet connection and authentication
 */

import React, { useState, useEffect, useCallback } from "react";
import { WalletConnectionStatus } from "../../types";
import { walletService } from "../../services/walletService";
import "./WalletConnection.css";

interface WalletConnectionProps {
  onWalletConnected?: (status: WalletConnectionStatus) => void;
  onWalletDisconnected?: () => void;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  onWalletConnected,
  onWalletDisconnected,
}) => {
  const [walletStatus, setWalletStatus] = useState<WalletConnectionStatus>({
    isConnected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Мемоизируем колбэки для предотвращения бесконечного цикла
  const handleWalletConnected = useCallback(
    (data: { address: string; sessionToken?: string }) => {
      const status: WalletConnectionStatus = {
        isConnected: true,
        walletAddress: data.address,
        sessionToken: data.sessionToken,
      };
      setWalletStatus(status);
      onWalletConnected?.(status);
    },
    [onWalletConnected]
  );

  const handleWalletDisconnected = useCallback(() => {
    setWalletStatus({ isConnected: false });
    onWalletDisconnected?.();
  }, [onWalletDisconnected]);

  useEffect(() => {
    // Setup wallet service callbacks
    walletService.onWalletConnected = handleWalletConnected;
    walletService.onWalletDisconnected = handleWalletDisconnected;

    // Cleanup
    return () => {
      walletService.onWalletConnected = undefined;
      walletService.onWalletDisconnected = undefined;
    };
  }, [handleWalletConnected, handleWalletDisconnected]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const result = await walletService.connectWallet();

      if (!result.isConnected && !result.error) {
        // Connection process started, waiting for browser confirmation
        console.log("🔐 Wallet connection process started...");
      }

      if (result.error) {
        console.error("❌ Wallet connection failed:", result.error);
      }
    } catch (error) {
      console.error("❌ Wallet connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await walletService.disconnectWallet();
      if (result.success) {
        setWalletStatus({ isConnected: false });
        onWalletDisconnected?.();
      }
    } catch (error) {
      console.error("❌ Wallet disconnect error:", error);
    }
  };

  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="wallet-connection">
      <h2>🔗 Wallet Connection</h2>

      <div
        className={`wallet-status ${
          walletStatus.isConnected ? "connected" : "disconnected"
        }`}
      >
        <span
          className={`status-indicator ${
            walletStatus.isConnected ? "connected" : "disconnected"
          }`}
        ></span>
        {walletStatus.isConnected ? "Connected" : "Not Connected"}
      </div>

      {walletStatus.isConnected && walletStatus.walletAddress && (
        <div className="wallet-info">
          <div className="wallet-address">
            {formatAddress(walletStatus.walletAddress)}
          </div>
          <button className="disconnect-button" onClick={handleDisconnect}>
            Disconnect Wallet
          </button>
        </div>
      )}

      {!walletStatus.isConnected && (
        <button
          className="connect-button"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>
      )}

      {walletStatus.error && (
        <div className="error-message">❌ {walletStatus.error}</div>
      )}
    </div>
  );
};
