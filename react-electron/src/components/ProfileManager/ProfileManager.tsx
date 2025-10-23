/**
 * ProfileManager Component
 * Main component for managing user profiles
 * Shows after NFT verification
 */

import React, { useState } from "react";
import {
  ProfileManagerProps,
  UserProfile,
  TelegramBotConfig,
} from "../../types";
import { ProfileCard } from "./ProfileCard";
import { AddProfileModal } from "./AddProfileModal";
import { AddTelegramBotModal } from "./AddTelegramBotModal";
import "./ProfileManager.css";

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  onProfileCreate,
  onProfileUpdate,
  onProfileDelete,
  onProfileSelect,
  selectedProfile,
  maxProfiles,
  onBuildQuery,
  onClearHistory,
  onAddTelegramBot,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<
    UserProfile | undefined
  >();
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramProfile, setTelegramProfile] = useState<
    UserProfile | undefined
  >();

  const handleAddProfile = () => {
    setEditingProfile(undefined);
    setShowAddModal(true);
  };

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setShowAddModal(true);
  };

  const handleBuildQuery = (profile: UserProfile) => {
    onBuildQuery?.(profile);
  };

  const handleClearHistory = (profile: UserProfile) => {
    if (
      window.confirm(
        `Clear processed tweets history for profile "${profile.name}"? This will allow the script to process previously seen tweets again.`
      )
    ) {
      onClearHistory?.(profile);
    }
  };

  const handleSaveProfile = (
    profileData: Omit<
      UserProfile,
      "id" | "createdAt" | "updatedAt" | "isActive"
    >
  ) => {
    if (editingProfile) {
      // Update existing profile
      const updatedProfile: UserProfile = {
        ...editingProfile,
        ...profileData,
        updatedAt: Date.now(),
      };
      onProfileUpdate(updatedProfile);
    } else {
      // Create new profile
      onProfileCreate(profileData);
    }
    setShowAddModal(false);
    setEditingProfile(undefined);
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (
      profile &&
      window.confirm(
        `Are you sure you want to delete profile "${profile.name}"?`
      )
    ) {
      onProfileDelete(profileId);
    }
  };

  const handleSelectProfile = (profile: UserProfile) => {
    onProfileSelect(profile);
  };

  const handleAddTelegramBot = (profile: UserProfile) => {
    setTelegramProfile(profile);
    setShowTelegramModal(true);
    onAddTelegramBot?.(profile);
  };

  const handleSaveTelegramConfig = (telegramConfig: TelegramBotConfig) => {
    if (telegramProfile) {
      const updatedProfile: UserProfile = {
        ...telegramProfile,
        telegram: telegramConfig,
        updatedAt: Date.now(),
      };
      onProfileUpdate(updatedProfile);
    }
    setShowTelegramModal(false);
    setTelegramProfile(undefined);
  };

  return (
    <div className="profile-manager">
      <div className="profile-manager-header">
        <h3>Profile Management</h3>
        <p className="profile-manager-subtitle">
          Manage your profiles and configure search queries
        </p>
        <div className="profile-manager-stats">
          <span className="profile-count">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""} created
          </span>
          {selectedProfile && (
            <span className="selected-profile">
              Selected: {selectedProfile.name}
            </span>
          )}
        </div>
      </div>

      <div className="profile-manager-actions">
        <button className="add-profile-btn" onClick={handleAddProfile}>
          + Add Profile
        </button>
      </div>

      <div className="profiles-grid">
        {profiles.length === 0 ? (
          <div className="no-profiles">
            <div className="no-profiles-icon">User</div>
            <h4>No profiles created yet</h4>
            <p>Create your first profile to start using automation features</p>
            <button
              className="create-first-profile-btn"
              onClick={handleAddProfile}
            >
              Create First Profile
            </button>
          </div>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={handleEditProfile}
              onDelete={handleDeleteProfile}
              onSelect={handleSelectProfile}
              onBuildQuery={handleBuildQuery}
              onClearHistory={handleClearHistory}
              onAddTelegramBot={handleAddTelegramBot}
              onProfileUpdate={onProfileUpdate}
            />
          ))
        )}
      </div>

      <AddProfileModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingProfile(undefined);
        }}
        onSave={handleSaveProfile}
        existingProfiles={profiles}
        editingProfile={editingProfile}
      />

      {telegramProfile && (
        <AddTelegramBotModal
          isOpen={showTelegramModal}
          onClose={() => {
            setShowTelegramModal(false);
            setTelegramProfile(undefined);
          }}
          onSave={handleSaveTelegramConfig}
          profile={telegramProfile}
          existingConfig={telegramProfile.telegram}
        />
      )}
    </div>
  );
};
