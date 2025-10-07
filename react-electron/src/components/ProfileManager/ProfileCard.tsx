/**
 * ProfileCard Component
 * Individual profile display card
 */

import React from "react";
import { ProfileCardProps } from "../../types";
import "./ProfileCard.css";

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onEdit,
  onDelete,
  onSelect,
  onBuildQuery,
  onClearHistory,
  onAddTelegramBot,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const maskProxyPassword = (password: string) => {
    return "*".repeat(password.length);
  };

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-info">
          <h4 className="profile-name">
            {profile.name}
            {profile.telegram?.connected && (
              <span
                className="telegram-badge"
                title={`Telegram bot: ${
                  profile.telegram.botName || "Connected"
                }`}
              >
                🤖
              </span>
            )}
          </h4>
        </div>
        <div className="profile-actions">
          <button
            className="telegram-btn"
            onClick={() => onAddTelegramBot?.(profile)}
            title={
              profile.telegram?.connected
                ? "Edit Telegram Bot"
                : "Add Telegram Bot"
            }
          >
            {profile.telegram?.connected ? "🤖✓" : "🤖+"}
          </button>
          <button
            className="build-query-btn"
            onClick={() => onBuildQuery?.(profile)}
            title="Build Search Query"
          >
            Search
          </button>
          <button
            className="edit-btn"
            onClick={() => onEdit(profile)}
            title="Edit Profile"
          >
            Edit
          </button>
          <button
            className="delete-btn"
            onClick={() => onDelete(profile.id)}
            title="Delete Profile"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="profile-card-content">
        <div className="profile-detail">
          <label>Proxy:</label>
          <span className="proxy-info">
            {profile.proxy.login}:{maskProxyPassword(profile.proxy.password)}@
            {profile.proxy.ip}:{profile.proxy.port}
          </span>
        </div>

        <div className="profile-detail">
          <label>Cookies:</label>
          <span className="cookies-info">
            {profile.cookies.length} cookie
            {profile.cookies.length !== 1 ? "s" : ""} configured
          </span>
        </div>

        {profile.navigationUrl && (
          <div className="profile-detail">
            <label>Search Query:</label>
            <span className="url-info" title={profile.navigationUrl}>
              {profile.navigationUrl.length > 50
                ? `${profile.navigationUrl.substring(0, 50)}...`
                : profile.navigationUrl}
            </span>
          </div>
        )}

        <div className="profile-detail">
          <label>Created:</label>
          <span className="date-info">{formatDate(profile.createdAt)}</span>
        </div>

        {profile.updatedAt !== profile.createdAt && (
          <div className="profile-detail">
            <label>Updated:</label>
            <span className="date-info">{formatDate(profile.updatedAt)}</span>
          </div>
        )}
      </div>

      <div className="profile-card-footer">
        <button
          className="select-profile-btn"
          onClick={() => onSelect(profile)}
        >
          Select Profile
        </button>
        <button
          className="clear-history-btn"
          onClick={() => onClearHistory?.(profile)}
          title="Clear processed tweets history"
        >
          Clear History
        </button>
      </div>
    </div>
  );
};
