/**
 * ProfileManager Component
 * Main component for managing user profiles
 * Shows after NFT verification
 */

import React, { useState } from "react";
import { ProfileManagerProps, UserProfile } from "../../types";
import { ProfileCard } from "./ProfileCard";
import { AddProfileModal } from "./AddProfileModal";
import "./ProfileManager.css";

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  onProfileCreate,
  onProfileUpdate,
  onProfileDelete,
  onProfileSelect,
  onProfileToggleActivation,
  selectedProfile,
  maxProfiles
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | undefined>();

  const handleAddProfile = () => {
    setEditingProfile(undefined);
    setShowAddModal(true);
  };

  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setShowAddModal(true);
  };

  const handleSaveProfile = (profileData: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">) => {
    if (editingProfile) {
      // Update existing profile
      const updatedProfile: UserProfile = {
        ...editingProfile,
        ...profileData,
        updatedAt: Date.now()
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
    const profile = profiles.find(p => p.id === profileId);
    if (profile && window.confirm(`Are you sure you want to delete profile "${profile.name}"?`)) {
      onProfileDelete(profileId);
    }
  };

  const handleSelectProfile = (profile: UserProfile) => {
    onProfileSelect(profile);
  };

  const handleToggleActivation = (profileId: string) => {
    onProfileToggleActivation(profileId);
  };

  // Calculate activation statistics
  const activeProfiles = profiles.filter(p => p.isActive);
  const activeCount = activeProfiles.length;

  return (
    <div className="profile-manager">
      <div className="profile-manager-header">
        <h3>🔐 Profile Management</h3>
        <p className="profile-manager-subtitle">
          Create unlimited profiles, activate up to {maxProfiles} for automation
        </p>
        <div className="profile-manager-stats">
          <span className="profile-count">
            {profiles.length} profiles created
          </span>
          <span className="active-count">
            {activeCount}/{maxProfiles} active
          </span>
          {selectedProfile && (
            <span className="selected-profile">
              Selected: {selectedProfile.name}
            </span>
          )}
        </div>
      </div>

      <div className="profile-manager-actions">
        <button
          className="add-profile-btn"
          onClick={handleAddProfile}
        >
          + Add Profile
        </button>
        {activeCount >= maxProfiles && (
          <span className="activation-limit-info">
            Activation limit reached ({activeCount}/{maxProfiles})
          </span>
        )}
      </div>

      <div className="profiles-grid">
        {profiles.length === 0 ? (
          <div className="no-profiles">
            <div className="no-profiles-icon">👤</div>
            <h4>No profiles created yet</h4>
            <p>Create your first profile to start using automation features</p>
            <button className="create-first-profile-btn" onClick={handleAddProfile}>
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
              onToggleActivation={handleToggleActivation}
              isSelected={selectedProfile?.id === profile.id}
              maxActiveProfiles={maxProfiles}
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
    </div>
  );
};