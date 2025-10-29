/**
 * EditProfileForm Component
 * Inline form for editing user profiles (without modal)
 */

import React, { useState, useEffect } from "react";
import {
  UserProfile,
  ProfileCookie,
  ProxyLocation,
} from "../../types";
import { isValidIP } from "../../utils/fingerprintGenerator";
import "./EditProfileForm.css";

interface EditProfileFormProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onCancel: () => void;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
  profile,
  onSave,
  onCancel,
}) => {
  // Determine if profile has proxy
  const [hasProxy] = useState(!!profile.proxy);

  const [formData, setFormData] = useState({
    name: profile.name,
    proxy: profile.proxy ? {
      login: profile.proxy.login,
      password: profile.proxy.password,
      ip: profile.proxy.ip,
      port: profile.proxy.port.toString(),
      country: profile.proxy.country,
      timezone: profile.proxy.timezone,
    } : {
      login: "",
      password: "",
      ip: "",
      port: "",
      country: undefined,
      timezone: undefined,
    },
    cookiesJson: JSON.stringify(profile.cookies, null, 2),
    navigationUrl: profile.navigationUrl || "",
  });

  const [parsedCookies, setParsedCookies] = useState<ProfileCookie[]>(
    profile.cookies
  );
  const [cookieErrors, setCookieErrors] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [proxyLocation, setProxyLocation] = useState<ProxyLocation | null>(
    null
  );
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

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

    setProxyLocation(null);

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

          setFormData((prev) => ({
            ...prev,
            proxy: {
              ...prev.proxy,
              country: result.country,
              timezone: result.timezone,
            },
          }));
        }
      } catch (error) {
        console.error("Error detecting proxy location:", error);
      } finally {
        setIsDetectingLocation(false);
      }
    }
  };

  // Validate and parse cookies JSON
  const handleCookiesChange = (value: string) => {
    setFormData((prev) => ({ ...prev, cookiesJson: value }));
    setCookieErrors([]);

    if (!value.trim()) {
      setParsedCookies([]);
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const cookiesArray = Array.isArray(parsed) ? parsed : [parsed];

      const errors: string[] = [];
      const validCookies: ProfileCookie[] = [];

      cookiesArray.forEach((cookie, index) => {
        if (!cookie.name || !cookie.value) {
          errors.push(`Cookie ${index + 1}: Missing name or value`);
        } else {
          validCookies.push({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain || "",
            path: cookie.path || "/",
            expires: cookie.expires,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || "Lax",
          });
        }
      });

      if (errors.length > 0) {
        setCookieErrors(errors);
      } else {
        setParsedCookies(validCookies);
      }
    } catch (error) {
      setCookieErrors(["Invalid JSON format"]);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Profile name is required");
    }

    // Only validate proxy if profile has proxy
    if (hasProxy) {
      if (!formData.proxy.login.trim()) {
        errors.push("Proxy login is required");
      }

      if (!formData.proxy.password.trim()) {
        errors.push("Proxy password is required");
      }

      if (!isValidIP(formData.proxy.ip)) {
        errors.push("Invalid proxy IP address");
      }

      const port = parseInt(formData.proxy.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push("Invalid proxy port (must be 1-65535)");
      }
    }

    if (cookieErrors.length > 0) {
      errors.push("Fix cookie errors before saving");
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updatedProfile: UserProfile = {
      ...profile,
      name: formData.name.trim(),
      proxy: hasProxy ? {
        ...profile.proxy,
        login: formData.proxy.login.trim(),
        password: formData.proxy.password.trim(),
        ip: formData.proxy.ip.trim(),
        port: parseInt(formData.proxy.port, 10),
        country: formData.proxy.country,
        timezone: formData.proxy.timezone,
      } : undefined,
      cookies: parsedCookies,
      navigationUrl: formData.navigationUrl.trim() || undefined,
      updatedAt: Date.now(),
    };

    onSave(updatedProfile);
  };

  return (
    <div className="edit-profile-form">
      <div className="form-section">
        <h4>Profile Information</h4>

        <div className="form-group">
          <label>Profile Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="My Profile"
          />
        </div>

        <div className="form-group">
          <label>Navigation URL (Optional)</label>
          <input
            type="text"
            value={formData.navigationUrl}
            onChange={(e) => handleInputChange("navigationUrl", e.target.value)}
            placeholder="https://twitter.com/search?q=..."
          />
        </div>
      </div>

      {hasProxy ? (
        <div className="form-section">
          <h4>Proxy Settings</h4>

          <div className="form-row">
            <div className="form-group">
              <label>Proxy IP</label>
              <input
                type="text"
                value={formData.proxy.ip}
                onChange={(e) => handleProxyIpChange(e.target.value)}
                placeholder="192.168.1.1"
              />
              {isDetectingLocation && (
                <span className="detecting-text">Detecting location...</span>
              )}
              {proxyLocation && (
                <span className="location-text">
                  📍 {proxyLocation.countryName} (UTC{proxyLocation.timezone})
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Port</label>
              <input
                type="text"
                value={formData.proxy.port}
                onChange={(e) => handleInputChange("proxy.port", e.target.value)}
                placeholder="8080"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Login</label>
              <input
                type="text"
                value={formData.proxy.login}
                onChange={(e) => handleInputChange("proxy.login", e.target.value)}
                placeholder="username"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.proxy.password}
                onChange={(e) =>
                  handleInputChange("proxy.password", e.target.value)
                }
                placeholder="password"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="form-section">
          <h4>Connection Type</h4>
          <div className="no-proxy-info">
            <span className="no-proxy-badge">Direct Connection (Device IP)</span>
            <p>This profile uses your device's direct internet connection without a proxy.</p>
          </div>
        </div>
      )}

      <div className="form-section">
        <h4>Cookies (JSON Format)</h4>
        <textarea
          className="cookies-textarea"
          value={formData.cookiesJson}
          onChange={(e) => handleCookiesChange(e.target.value)}
          placeholder='[{"name": "cookie_name", "value": "cookie_value", "domain": ".twitter.com"}]'
          rows={6}
        />
        {parsedCookies.length > 0 && (
          <div className="success-text">
            ✓ {parsedCookies.length} cookie(s) parsed successfully
          </div>
        )}
        {cookieErrors.length > 0 && (
          <div className="error-text">
            {cookieErrors.map((error, i) => (
              <div key={i}>❌ {error}</div>
            ))}
          </div>
        )}
      </div>

      {formErrors.length > 0 && (
        <div className="form-errors">
          {formErrors.map((error, i) => (
            <div key={i} className="error-text">
              ❌ {error}
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="save-btn" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
};
