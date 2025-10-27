/**
 * ProfileFormPanel Component
 * Collapsible form panel for adding/editing user profiles
 * Similar to SearchQueryBuilder design
 */

import React, { useState, useEffect } from "react";
import {
  UserProfile,
  ProfileCookie,
  ProfileProxy,
  ProxyLocation,
} from "../../types";
import { profileStorage } from "../../services/profileStorage";
import { generateFingerprint, isValidIP } from "../../utils/fingerprintGenerator";
import "./ProfileFormPanel.css";

interface ProfileFormPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">
  ) => void;
  existingProfiles: UserProfile[];
  editingProfile?: UserProfile;
}

export const ProfileFormPanel: React.FC<ProfileFormPanelProps> = ({
  isOpen,
  onClose,
  onSave,
  existingProfiles,
  editingProfile,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    proxy: {
      login: "",
      password: "",
      ip: "",
      port: "",
      country: undefined as string | undefined,
      timezone: undefined as string | undefined,
    },
    cookiesJson: "",
  });

  const [parsedCookies, setParsedCookies] = useState<ProfileCookie[]>([]);
  const [cookieErrors, setCookieErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [proxyLocation, setProxyLocation] = useState<ProxyLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic", "proxy"])
  );

  // Reset form when panel opens/closes or editing profile changes
  useEffect(() => {
    if (isOpen) {
      if (editingProfile) {
        // Populate form with existing profile data
        setFormData({
          name: editingProfile.name,
          proxy: {
            login: editingProfile.proxy.login,
            password: editingProfile.proxy.password,
            ip: editingProfile.proxy.ip,
            port: editingProfile.proxy.port.toString(),
            country: editingProfile.proxy.country,
            timezone: editingProfile.proxy.timezone,
          },
          cookiesJson: JSON.stringify(editingProfile.cookies, null, 2),
        });
        setParsedCookies(editingProfile.cookies);
      } else {
        // Reset form for new profile
        setFormData({
          name: "",
          proxy: {
            login: "",
            password: "",
            ip: "",
            port: "",
            country: undefined,
            timezone: undefined,
          },
          cookiesJson: "",
        });
        setParsedCookies([]);
      }
      setCookieErrors([]);
      setFormErrors([]);
      setExpandedSections(new Set(["basic", "proxy"]));
    }
  }, [isOpen, editingProfile]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith("proxy.")) {
      const proxyField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        proxy: {
          ...prev.proxy,
          [proxyField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear form errors when user starts typing
    if (formErrors.length > 0) {
      setFormErrors([]);
    }
  };

  // Handle proxy IP change with auto-detection
  const handleProxyIpChange = async (ip: string) => {
    setFormData((prev) => ({
      ...prev,
      proxy: {
        ...prev.proxy,
        ip,
      },
    }));

    // Clear previous location
    setProxyLocation(null);

    // Validate IP and detect location
    if (isValidIP(ip)) {
      setIsDetectingLocation(true);

      try {
        const result = await window.electronAPI.detectProxyLocation(ip);

        if (result.success) {
          const location: ProxyLocation = {
            country: result.country,
            timezone: result.timezone,
            countryName: result.countryName,
          };

          setProxyLocation(location);

          // Update proxy with detected country and timezone
          setFormData((prev) => ({
            ...prev,
            proxy: {
              ...prev.proxy,
              country: result.country,
              timezone: result.timezone,
            },
          }));

          console.log(
            `✅ Proxy location detected: ${result.countryName} (${result.timezone})`
          );
        }
      } catch (error) {
        console.error("Failed to detect proxy location:", error);
      } finally {
        setIsDetectingLocation(false);
      }
    }
  };

  const handleCookiesChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      cookiesJson: value,
    }));

    // Clear previous errors
    setCookieErrors([]);
    setParsedCookies([]);

    // Don't try to parse if empty
    if (!value.trim()) {
      return;
    }

    // Debounced parsing
    setTimeout(() => {
      try {
        const cookies = profileStorage.parseAdsPowerCookies(value);
        const validation = profileStorage.validateCookiesForPuppeteer(cookies);

        if (validation.invalid.length > 0) {
          setCookieErrors(validation.invalid);
        }

        setParsedCookies(validation.valid);
      } catch (error) {
        setCookieErrors([
          error instanceof Error ? error.message : "Invalid JSON format",
        ]);
      }
    }, 500);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Validate name
    if (!formData.name.trim()) {
      errors.push("Profile name is required");
    } else if (formData.name.length < 2) {
      errors.push("Profile name must be at least 2 characters");
    } else if (formData.name.length > 50) {
      errors.push("Profile name must be less than 50 characters");
    }

    // Check for duplicate name (excluding current profile if editing)
    const nameExists = existingProfiles.some(
      (p) =>
        p.name.toLowerCase() === formData.name.toLowerCase() &&
        (!editingProfile || p.id !== editingProfile.id)
    );
    if (nameExists) {
      errors.push("Profile name already exists");
    }

    // Check for duplicate proxy address (excluding current profile if editing)
    const proxyAddress = `${formData.proxy.ip}:${formData.proxy.port}`;
    const proxyExists = existingProfiles.some((p) => {
      const existingProxyAddress = `${p.proxy.ip}:${p.proxy.port}`;
      return (
        existingProxyAddress === proxyAddress &&
        (!editingProfile || p.id !== editingProfile.id)
      );
    });
    if (proxyExists) {
      errors.push("Proxy address (IP:Port) already exists");
    }

    // Validate proxy data
    if (!formData.proxy.login.trim()) {
      errors.push("Proxy login is required");
    }
    if (!formData.proxy.password.trim()) {
      errors.push("Proxy password is required");
    }
    if (!formData.proxy.ip.trim()) {
      errors.push("Proxy IP is required");
    } else if (
      !/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.proxy.ip) &&
      !formData.proxy.ip.includes(".")
    ) {
      errors.push("Invalid IP address format");
    }

    const port = parseInt(formData.proxy.port);
    if (!formData.proxy.port || isNaN(port) || port < 1 || port > 65535) {
      errors.push("Valid proxy port (1-65535) is required");
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    setIsValidating(true);

    try {
      const proxy: ProfileProxy = {
        login: formData.proxy.login.trim(),
        password: formData.proxy.password.trim(),
        ip: formData.proxy.ip.trim(),
        port: parseInt(formData.proxy.port),
        country: formData.proxy.country,
        timezone: formData.proxy.timezone,
      };

      // Generate unique fingerprint for new profile
      const fingerprint = generateFingerprint(
        editingProfile?.id || crypto.randomUUID(),
        proxy.country || "US",
        proxy.timezone || "America/New_York"
      );

      console.log("[PROFILE] Generated fingerprint:", {
        webgl: fingerprint.webgl.renderer,
        platform: fingerprint.platform,
        timezone: fingerprint.timezone,
        languages: fingerprint.languages,
      });

      const profileData = {
        name: formData.name.trim(),
        proxy,
        cookies: parsedCookies,
        fingerprint,
      };

      onSave(profileData);
      onClose();
    } catch (error) {
      setFormErrors([
        error instanceof Error ? error.message : "Error saving profile",
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    if (!isValidating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-form-panel">
      <div className="pfp-header">
        <h3>{editingProfile ? "Edit Profile" : "Add New Profile"}</h3>
        <p className="pfp-subtitle">
          {editingProfile
            ? "Update profile settings and proxy configuration"
            : "Configure proxy settings and browser fingerprint"}
        </p>
      </div>

      <div className="pfp-content">
        {/* Form Errors */}
        {formErrors.length > 0 && (
          <div className="pfp-errors">
            <h5>Please fix the following errors:</h5>
            <ul>
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pfp-categories">
          {/* Basic Info Section */}
          <div className="pfp-category">
            <button
              className="pfp-category-header"
              onClick={() => toggleSection("basic")}
              type="button"
            >
              <span className="pfp-category-icon">
                {expandedSections.has("basic") ? "▼" : "▶"}
              </span>
              <span className="pfp-category-name">Basic Information</span>
            </button>

            {expandedSections.has("basic") && (
              <div className="pfp-category-content">
                <div className="pfp-form-group">
                  <label htmlFor="profile-name">Profile Name *</label>
                  <input
                    id="profile-name"
                    type="text"
                    className="pfp-input"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter profile name"
                    maxLength={50}
                    disabled={isValidating}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Proxy Settings Section */}
          <div className="pfp-category">
            <button
              className="pfp-category-header"
              onClick={() => toggleSection("proxy")}
              type="button"
            >
              <span className="pfp-category-icon">
                {expandedSections.has("proxy") ? "▼" : "▶"}
              </span>
              <span className="pfp-category-name">Proxy Settings</span>
            </button>

            {expandedSections.has("proxy") && (
              <div className="pfp-category-content">
                <div className="pfp-form-row">
                  <div className="pfp-form-group">
                    <label htmlFor="proxy-login">Login *</label>
                    <input
                      id="proxy-login"
                      type="text"
                      className="pfp-input"
                      value={formData.proxy.login}
                      onChange={(e) =>
                        handleInputChange("proxy.login", e.target.value)
                      }
                      placeholder="Proxy username"
                      disabled={isValidating}
                    />
                  </div>
                  <div className="pfp-form-group">
                    <label htmlFor="proxy-password">Password *</label>
                    <input
                      id="proxy-password"
                      type="password"
                      className="pfp-input"
                      value={formData.proxy.password}
                      onChange={(e) =>
                        handleInputChange("proxy.password", e.target.value)
                      }
                      placeholder="Proxy password"
                      disabled={isValidating}
                    />
                  </div>
                </div>
                <div className="pfp-form-row">
                  <div className="pfp-form-group">
                    <label htmlFor="proxy-ip">IP Address *</label>
                    <input
                      id="proxy-ip"
                      type="text"
                      className="pfp-input"
                      value={formData.proxy.ip}
                      onChange={(e) => handleProxyIpChange(e.target.value)}
                      placeholder="192.168.1.1 or proxy.example.com"
                      disabled={isValidating}
                    />
                    {isDetectingLocation && (
                      <div className="pfp-proxy-status detecting">
                        🔍 Detecting location...
                      </div>
                    )}
                    {proxyLocation && !isDetectingLocation && (
                      <div className="pfp-proxy-status detected">
                        ✅ Detected: {proxyLocation.countryName} |{" "}
                        {proxyLocation.timezone}
                      </div>
                    )}
                  </div>
                  <div className="pfp-form-group">
                    <label htmlFor="proxy-port">Port *</label>
                    <input
                      id="proxy-port"
                      type="number"
                      className="pfp-input"
                      value={formData.proxy.port}
                      onChange={(e) =>
                        handleInputChange("proxy.port", e.target.value)
                      }
                      placeholder="8080"
                      min="1"
                      max="65535"
                      disabled={isValidating}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cookie Data Section */}
          <div className="pfp-category">
            <button
              className="pfp-category-header"
              onClick={() => toggleSection("cookies")}
              type="button"
            >
              <span className="pfp-category-icon">
                {expandedSections.has("cookies") ? "▼" : "▶"}
              </span>
              <span className="pfp-category-name">🍪 Cookie Data</span>
            </button>

            {expandedSections.has("cookies") && (
              <div className="pfp-category-content">
                <div className="pfp-form-group">
                  <label htmlFor="cookies-json">
                    AdsPower Cookies (JSON Format) - Optional
                  </label>
                  <p className="pfp-cookies-hint">
                    💡 Tip: You can save the profile without cookies and collect
                    them automatically after creation using the 🍪 button on the
                    profile card.
                  </p>
                  <textarea
                    id="cookies-json"
                    className="pfp-textarea"
                    value={formData.cookiesJson}
                    onChange={(e) => handleCookiesChange(e.target.value)}
                    placeholder={`Paste cookies in JSON format. Supported formats:

AdsPower/Standard format:
[
  {
    "name": "session_id",
    "value": "abc123",
    "domain": ".twitter.com",
    "path": "/",
    "secure": true,
    "httpOnly": false,
    "sameSite": "Lax"
  }
]

Alternative formats also supported:
- Chrome DevTools export
- Netscape cookie format`}
                    rows={8}
                    disabled={isValidating}
                  />
                </div>

                {/* Cookie Validation Status */}
                {parsedCookies.length > 0 && (
                  <div className="pfp-cookies-status success">
                    ✅ {parsedCookies.length} valid cookie
                    {parsedCookies.length !== 1 ? "s" : ""} parsed
                  </div>
                )}

                {cookieErrors.length > 0 && (
                  <div className="pfp-cookies-status error">
                    ❌ Cookie errors:
                    <ul>
                      {cookieErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pfp-actions">
          <button
            className="pfp-btn pfp-btn-secondary"
            onClick={handleCancel}
            disabled={isValidating}
          >
            Cancel
          </button>
          <button
            className="pfp-btn pfp-btn-primary"
            onClick={handleSave}
            disabled={
              isValidating || formErrors.length > 0 || cookieErrors.length > 0
            }
          >
            {isValidating
              ? "Saving..."
              : editingProfile
              ? "Update Profile"
              : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};
