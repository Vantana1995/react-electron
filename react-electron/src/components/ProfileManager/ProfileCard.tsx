/**
 * ProfileCard Component
 * Individual profile display card
 */

import React, { useState, useEffect } from "react";
import {
  ProfileCardProps,
  CookieCollectionProgress,
  CookieCollectionOptions,
  UserProfile,
} from "../../types";
import { profileStorage } from "../../services/profileStorage";
import { sendCookieCollectionComplete } from "../../services/telegramService";
import { EditProfileForm } from "./EditProfileForm";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollectingCookies, setIsCollectingCookies] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [cookieProgress, setCookieProgress] = useState<CookieCollectionProgress | null>(null);

  // Cookie collection form state
  const [headless, setHeadless] = useState(false);
  const [sitesCount, setSitesCount] = useState(10);
  const [useDefaultSites, setUseDefaultSites] = useState(true);
  const [customSites, setCustomSites] = useState('');

  // Telegram bot form state
  const [telegramHttpApi, setTelegramHttpApi] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotName, setTelegramBotName] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [telegramStep, setTelegramStep] = useState<'input' | 'connect' | 'test'>('input');

  // Load existing Telegram config
  useEffect(() => {
    if (profile.telegram?.connected) {
      setTelegramHttpApi(profile.telegram.httpApi);
      setTelegramChatId(profile.telegram.chatId);
      setTelegramBotName(profile.telegram.botName || '');
      setTelegramStep('test');
    }
  }, [profile.telegram]);

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

  // Telegram bot handlers
  const handleTestTelegramConnection = async () => {
    setTelegramError('');
    setTelegramLoading(true);

    try {
      if (!window.electronAPI?.testTelegramConnection) {
        throw new Error('Telegram API not available');
      }

      const result = await window.electronAPI.testTelegramConnection(telegramHttpApi);

      if (!result.success) {
        setTelegramError(result.error || 'Connection test failed');
        setTelegramLoading(false);
        return;
      }

      if (result.botName) {
        setTelegramBotName(result.botName);
      }

      if (result.chatId) {
        setTelegramChatId(result.chatId);
        setTelegramStep('test');
      } else {
        setTelegramError('Bot connected! Please send a message to your bot (e.g., /start), then click "Get Chat ID" below.');
        setTelegramStep('connect');
      }
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleGetTelegramChatId = async () => {
    setTelegramError('');
    setTelegramLoading(true);

    try {
      if (!window.electronAPI?.getTelegramChatId) {
        throw new Error('Telegram API not available');
      }

      const result = await window.electronAPI.getTelegramChatId(telegramHttpApi);

      if (!result.success) {
        setTelegramError(result.error || 'Failed to get chat ID');
        setTelegramLoading(false);
        return;
      }

      if (result.chatId) {
        setTelegramChatId(result.chatId);
        setTelegramStep('test');
      }
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSendTelegramTest = async () => {
    setTelegramError('');
    setTelegramLoading(true);

    try {
      if (!window.electronAPI?.sendTelegramMessage) {
        throw new Error('Telegram API not available');
      }

      const testMessage = `🤖 Test message from Twitter Automation Platform\nProfile: ${profile.name}\nTime: ${new Date().toLocaleString()}`;

      const result = await window.electronAPI.sendTelegramMessage(telegramHttpApi, telegramChatId, testMessage);

      if (!result.success) {
        setTelegramError(result.error || 'Failed to send test message');
      } else {
        alert('✅ Test message sent successfully! Check your Telegram.');
      }
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSaveTelegramConfig = () => {
    if (!telegramHttpApi || !telegramChatId) {
      setTelegramError('Please complete the connection test first');
      return;
    }

    const updatedProfile: UserProfile = {
      ...profile,
      telegram: {
        httpApi: telegramHttpApi,
        chatId: telegramChatId,
        botName: telegramBotName,
        connected: true,
        connectedAt: Date.now(),
      },
      updatedAt: Date.now(),
    };

    onProfileUpdate?.(updatedProfile);
    toggleSection('telegram-bot');
    alert('✅ Telegram bot configuration saved!');
  };

  const isCookieSectionExpanded = expandedSections.has('cookie-collection');
  const isTelegramSectionExpanded = expandedSections.has('telegram-bot');

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile);
    }
    setIsExpanded(false);
  };

  return (
    <div className={`profile-card ${isExpanded ? 'expanded' : ''}`}>
      {!isExpanded ? (
        /* COMPACT VIEW */
        <div className="profile-card-collapsed">
          <div className="profile-card-header">
            <h4 className="profile-name">
              {profile.name}
              {profile.telegram?.connected && (
                <span
                  className="telegram-badge"
                  title={`Telegram bot: ${
                    profile.telegram.botName || "Connected"
                  }`}
                >
                  TG
                </span>
              )}
            </h4>
            <div className="profile-actions">
              <button
                className="edit-btn"
                onClick={() => setIsExpanded(true)}
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
                {profile.cookies.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="profile-detail">
              <label>Today's tweets:</label>
              <span className={`tweets-info ${
                profile.maxTweetsPerDay &&
                profile.dailyStats &&
                profile.dailyStats.tweetsProcessed >= profile.maxTweetsPerDay
                  ? 'tweets-limit-reached'
                  : ''
              }`}>
                {profile.dailyStats?.tweetsProcessed || 0}
                {profile.maxTweetsPerDay && profile.maxTweetsPerDay > 0
                  ? ` / ${profile.maxTweetsPerDay}`
                  : ''}
              </span>
            </div>

            <div className="profile-detail">
              <label>Created:</label>
              <span className="date-info">{formatDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>
      ) : (
        /* EXPANDED VIEW */
        <div className="profile-card-expanded">
          <button className="close-btn" onClick={() => setIsExpanded(false)}>
            ← Back to Compact View
          </button>

          <div className="expanded-content">
            <div className="settings-column">
              <h3>Edit Profile: {profile.name}</h3>
              <EditProfileForm
                profile={profile}
                onSave={handleSaveProfile}
                onCancel={() => setIsExpanded(false)}
              />
            </div>

            <div className="actions-column">
              <h3>Profile Actions</h3>

              {/* Collect Cookies Action Item */}
              <div className="action-item">
                <button
                  className="action-btn collect-cookies-btn"
                  onClick={() => toggleSection('cookie-collection')}
                  title="Collect cookies automatically"
                  disabled={isCollectingCookies}
                >
                  Collect cookie
                </button>

                {/* Cookie Collection Section */}
                {isCookieSectionExpanded && (
        <div className="profile-section cookie-section">
          <div className="section-header">
            <h3>Collect Cookies Automatically</h3>
            <button
              className="collapse-section-btn"
              onClick={() => toggleSection('cookie-collection')}
              title="Collapse section"
            >
              ✕
            </button>
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
              </div>

              {/* Telegram Action Item */}
              <div className="action-item">
                <button
                  className="action-btn telegram-btn"
                  onClick={() => toggleSection('telegram-bot')}
                  title={
                    profile.telegram?.connected
                      ? "Edit Telegram Bot"
                      : "Add Telegram Bot"
                  }
                >
                  {profile.telegram?.connected ? "Telegram notis ✓" : "Telegram notis"}
                </button>

                {/* Telegram Bot Section */}
                {isTelegramSectionExpanded && (
                  <div className="profile-section telegram-section">
                    <div className="section-header">
                      <h3>🤖 {profile.telegram?.connected ? 'Edit Telegram Bot' : 'Add Telegram Bot'}</h3>
                      <button
                        className="collapse-section-btn"
                        onClick={() => toggleSection('telegram-bot')}
                        title="Collapse section"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="section-content">
                      {/* Step 1: Input HTTP API */}
                      {telegramStep === 'input' && (
                        <>
                          <div className="telegram-instructions">
                            <p><strong>How to get your Bot Token:</strong></p>
                            <ol>
                              <li>Open Telegram and search for <code>@BotFather</code></li>
                              <li>Send <code>/newbot</code> and follow instructions</li>
                              <li>Copy the HTTP API token provided by BotFather</li>
                            </ol>
                          </div>

                          <div className="form-group">
                            <label htmlFor={`telegram-api-${profile.id}`}>Bot HTTP API Token</label>
                            <input
                              id={`telegram-api-${profile.id}`}
                              type="text"
                              className="telegram-input"
                              value={telegramHttpApi}
                              onChange={(e) => setTelegramHttpApi(e.target.value)}
                              placeholder="bot123456:ABC-DEF1234ghIkl..."
                              disabled={telegramLoading}
                            />
                            <p className="form-hint">Format: bot[numbers]:[alphanumeric]</p>
                          </div>

                          {telegramError && <div className="telegram-error">{telegramError}</div>}

                          <div className="section-actions">
                            <button
                              className="btn btn-primary"
                              onClick={handleTestTelegramConnection}
                              disabled={!telegramHttpApi || telegramLoading}
                            >
                              {telegramLoading ? 'Testing...' : 'Test Connection →'}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Step 2: Get Chat ID */}
                      {telegramStep === 'connect' && (
                        <>
                          <p><strong>Bot connected: {telegramBotName}</strong></p>
                          <div className="telegram-instructions">
                            <p><strong>Next step:</strong></p>
                            <ol>
                              <li>Find your bot in Telegram: @{telegramBotName}</li>
                              <li>Send any message (e.g., <code>/start</code>)</li>
                              <li>Click the button below to get your Chat ID</li>
                            </ol>
                          </div>

                          {telegramError && <div className="telegram-error">{telegramError}</div>}

                          <div className="section-actions">
                            <button
                              className="btn btn-secondary"
                              onClick={() => setTelegramStep('input')}
                            >
                              ← Back
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={handleGetTelegramChatId}
                              disabled={telegramLoading}
                            >
                              {telegramLoading ? 'Fetching...' : 'Get Chat ID'}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Step 3: Test & Save */}
                      {telegramStep === 'test' && (
                        <>
                          <div className="telegram-config-summary">
                            <div className="config-item">
                              <span className="config-label">Bot Name:</span>
                              <span className="config-value">{telegramBotName || 'Unknown'}</span>
                            </div>
                            <div className="config-item">
                              <span className="config-label">Chat ID:</span>
                              <span className="config-value">{telegramChatId}</span>
                            </div>
                          </div>

                          <div className="telegram-test-section">
                            <p><strong>Send a test message to verify:</strong></p>
                            <button
                              className="btn btn-test"
                              onClick={handleSendTelegramTest}
                              disabled={telegramLoading}
                            >
                              {telegramLoading ? 'Sending...' : 'Send Test Message'}
                            </button>
                          </div>

                          {telegramError && <div className="telegram-error">{telegramError}</div>}

                          <div className="section-actions">
                            <button
                              className="btn btn-secondary"
                              onClick={() => setTelegramStep('input')}
                            >
                              ← Start Over
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={handleSaveTelegramConfig}
                              disabled={telegramLoading}
                            >
                              Save Configuration
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Build Query Button */}
              <button
                className="action-btn build-query-btn"
                onClick={() => onBuildQuery?.(profile)}
                title="Build Search Query"
              >
                Build Search Query
              </button>

              {/* Clear History Button */}
              <button
                className="action-btn clear-history-btn"
                onClick={() => onClearHistory?.(profile)}
                title="Clear processed tweets history"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
