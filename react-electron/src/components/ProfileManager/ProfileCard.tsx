/**
 * ProfileCard Component
 * Individual profile display card
 */

import React, { useState, useEffect } from "react";
import {
  ProfileCardProps,
  CookieCollectionProgress,
  CookieCollectionOptions,
} from "../../types";
import { profileStorage } from "../../services/profileStorage";
import { sendCookieCollectionComplete } from "../../services/telegramService";
import "./ProfileCard.css";

export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onEdit,
  onDelete,
  onSelect,
  onBuildQuery,
  onClearHistory,
  onAddTelegramBot,
  onProfileUpdate,
}) => {
  const [isCollectingCookies, setIsCollectingCookies] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [cookieProgress, setCookieProgress] = useState<CookieCollectionProgress | null>(null);

  // Cookie collection form state
  const [headless, setHeadless] = useState(false);
  const [sitesCount, setSitesCount] = useState(10);
  const [useDefaultSites, setUseDefaultSites] = useState(true);
  const [customSites, setCustomSites] = useState('');

  // Listen for cookie collection progress
  useEffect(() => {
    if (!isCollectingCookies) return;

    const cleanup = window.electronAPI.onCookieCollectionProgress((data) => {
      if (data.profileId === profile.id) {
        setCookieProgress(data.progress);

        if (data.progress.status === 'completed' || data.progress.status === 'error') {
          setIsCollectingCookies(false);
        }
      }
    });

    return cleanup;
  }, [isCollectingCookies, profile.id]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const maskProxyPassword = (password: string) => {
    return "*".repeat(password.length);
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleStartCookieCollection = async () => {
    try {
      setIsCollectingCookies(true);
      toggleSection('cookie-collection'); // Close section

      const customSitesList = customSites
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      const options: CookieCollectionOptions = {
        sitesCount,
        headless,
        useDefaultSites,
        customSites: customSitesList.length > 0 ? customSitesList : undefined,
      };

      const result = await window.electronAPI.collectCookies(profile, options);

      if (result.success) {
        console.log(`[PROFILE_CARD] ✅ Collected ${result.totalCookies} cookies`);

        // Update profile with new cookies (merged in backend)
        const updatedProfile = await profileStorage.updateProfileCookies(
          profile.id,
          result.cookiesCollected
        );

        // Notify parent component about profile update
        onProfileUpdate?.(updatedProfile);

        // Send Telegram notification if configured
        if (profile.telegram?.connected) {
          await sendCookieCollectionComplete(
            profile.telegram,
            profile.name,
            {
              sitesVisited: result.sitesVisited,
              totalSites: result.totalSites,
              cookiesCollected: result.totalCookies,
              timeElapsed: result.timeElapsed,
              errors: result.errors,
            }
          );
        }

        alert(`Successfully collected ${result.totalCookies} cookies from ${result.sitesVisited} sites!`);
      } else {
        console.error('[PROFILE_CARD] ❌ Cookie collection failed:', result.errors);
        alert(`Cookie collection failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('[PROFILE_CARD] Cookie collection error:', error);
      alert(`Cookie collection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCollectingCookies(false);
      setCookieProgress(null);
    }
  };

  const handleCancelCollection = async () => {
    await window.electronAPI.cancelCookieCollection(profile.id);
    setIsCollectingCookies(false);
    setCookieProgress(null);
  };

  const handleResetCookieForm = () => {
    setHeadless(false);
    setSitesCount(10);
    setUseDefaultSites(true);
    setCustomSites('');
  };

  const isCookieSectionExpanded = expandedSections.has('cookie-collection');
  const isTelegramSectionExpanded = expandedSections.has('telegram-bot');

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
            className="collect-cookies-btn"
            onClick={() => toggleSection('cookie-collection')}
            title="Collect cookies automatically"
            disabled={isCollectingCookies}
          >
            🍪
          </button>
          <button
            className="telegram-btn"
            onClick={() => toggleSection('telegram-bot')}
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

      {/* Cookie Collection Section */}
      {isCookieSectionExpanded && (
        <div className="profile-section cookie-section">
          <div className="section-header">
            <h3>Collect Cookies Automatically</h3>
          </div>

          <div className="section-content">
            {/* Headless Mode */}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={headless}
                  onChange={(e) => setHeadless(e.target.checked)}
                  disabled={isCollectingCookies}
                />
                <span>Headless mode (run browser in background)</span>
              </label>
              <p className="form-hint">
                {headless
                  ? 'Browser will run in background (faster)'
                  : 'Browser will be visible (recommended for first time)'}
              </p>
            </div>

            {/* Sites Count */}
            <div className="form-group">
              <label htmlFor={`sites-count-${profile.id}`}>
                Number of sites to visit: {sitesCount}
              </label>
              <input
                id={`sites-count-${profile.id}`}
                type="range"
                min="5"
                max="15"
                value={sitesCount}
                onChange={(e) => setSitesCount(parseInt(e.target.value))}
                disabled={isCollectingCookies}
                className="sites-count-slider"
              />
              <div className="slider-labels">
                <span>5 sites</span>
                <span>15 sites</span>
              </div>
            </div>

            {/* Use Default Sites */}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useDefaultSites}
                  onChange={(e) => setUseDefaultSites(e.target.checked)}
                  disabled={isCollectingCookies}
                />
                <span>Use popular sites (Google, YouTube, Wikipedia, etc.)</span>
              </label>
            </div>

            {/* Custom Sites */}
            <div className="form-group">
              <label htmlFor={`custom-sites-${profile.id}`}>
                Additional custom sites (one URL per line):
              </label>
              <textarea
                id={`custom-sites-${profile.id}`}
                className="custom-sites-input"
                value={customSites}
                onChange={(e) => setCustomSites(e.target.value)}
                placeholder="https://example.com&#10;https://another-site.com"
                rows={4}
                disabled={isCollectingCookies}
              />
              <p className="form-hint">
                {customSites.split('\n').filter((url) => url.trim().length > 0).length} custom
                site(s) added
              </p>
            </div>

            {/* Info */}
            <div className="info-box">
              <h4>What will happen:</h4>
              <ul>
                <li>Browser will open with your profile's proxy and fingerprint</li>
                <li>{sitesCount} popular websites will be visited</li>
                <li>Cookie banners will be accepted automatically</li>
                <li>Human-like behavior will be simulated (scrolling, clicking)</li>
                <li>All cookies will be collected and added to your profile</li>
                <li>
                  Estimated time:{' '}
                  {Math.ceil(sitesCount * 0.5)} - {Math.ceil(sitesCount * 1)} minutes
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="section-actions">
              <button
                className="btn btn-secondary"
                onClick={handleResetCookieForm}
                disabled={isCollectingCookies}
              >
                Reset to Defaults
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStartCookieCollection}
                disabled={isCollectingCookies}
              >
                {isCollectingCookies ? 'Collecting...' : 'Start Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Collection Progress */}
      {isCollectingCookies && cookieProgress && (
        <div className="cookie-collection-progress">
          <div className="progress-header">
            <h3>Collecting Cookies...</h3>
            <button onClick={handleCancelCollection} className="cancel-collection-btn">
              Cancel
            </button>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${cookieProgress.percentage}%` }}
            />
          </div>

          <div className="progress-info">
            <p>
              <strong>{cookieProgress.currentSite}</strong>
            </p>
            <p>
              Sites visited: {cookieProgress.sitesVisited}/{cookieProgress.totalSites}
            </p>
            <p>Cookies collected: <strong>{cookieProgress.cookiesCollected}</strong></p>
            <p>
              Estimated time: {formatTime(cookieProgress.estimatedTimeRemaining)}
            </p>
          </div>
        </div>
      )}

      {/* Telegram Bot Section */}
      {isTelegramSectionExpanded && (
        <div className="profile-section telegram-section">
          <div className="section-header">
            <h3>
              {profile.telegram?.connected ? 'Edit Telegram Bot' : 'Add Telegram Bot'}
            </h3>
          </div>

          <div className="section-content">
            <p className="section-description">
              Configure Telegram bot notifications for this profile.
              Click the button below to open the full configuration.
            </p>

            <div className="section-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  toggleSection('telegram-bot');
                  onAddTelegramBot?.(profile);
                }}
              >
                {profile.telegram?.connected ? 'Edit Bot Configuration' : 'Configure Telegram Bot'}
              </button>
            </div>
          </div>
        </div>
      )}

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
