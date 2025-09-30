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
  isSelected,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const maskProxyPassword = (password: string) => {
    return "*".repeat(password.length);
  };

  return (
    <div className={`profile-card ${isSelected ? "selected" : ""}`}>
      <div className="profile-card-header">
        <div className="profile-info">
          <h4 className="profile-name">{profile.name}</h4>
          <span className="profile-status">
            {profile.isActive ? "🟢 Active" : "🔴 Inactive"}
          </span>
        </div>
        <div className="profile-actions">
          <button
            className="edit-btn"
            onClick={() => onEdit(profile)}
            title="Edit Profile"
          >
            ✏️
          </button>
          <button
            className="delete-btn"
            onClick={() => onDelete(profile.id)}
            title="Delete Profile"
          >
            🗑️
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
          className={`select-profile-btn ${isSelected ? "selected" : ""}`}
          onClick={() => onSelect(profile)}
          disabled={isSelected}
        >
          {isSelected ? "✅ Selected" : "Select Profile"}
        </button>
      </div>
    </div>
  );
};
