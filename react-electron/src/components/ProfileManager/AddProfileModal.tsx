/**
 * AddProfileModal Component
 * Modal for adding/editing user profiles
 */

import React, { useState, useEffect } from "react";
import {
  AddProfileModalProps,
  UserProfile,
  ProfileCookie,
  ProfileProxy,
} from "../../types";
import { profileStorage } from "../../services/profileStorage";
import "./AddProfileModal.css";

interface ExtendedAddProfileModalProps extends AddProfileModalProps {
  editingProfile?: UserProfile;
}

export const AddProfileModal: React.FC<ExtendedAddProfileModalProps> = ({
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
    },
    cookiesJson: "",
  });

  const [parsedCookies, setParsedCookies] = useState<ProfileCookie[]>([]);
  const [cookieErrors, setCookieErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Reset form when modal opens/closes or editing profile changes
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
          },
          cookiesJson: "",
        });
        setParsedCookies([]);
      }
      setCookieErrors([]);
      setFormErrors([]);
    }
  }, [isOpen, editingProfile]);

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

    // Validate cookies (temporarily disabled - can start without cookies)
    // if (!formData.cookiesJson.trim()) {
    //   errors.push("Cookie data is required");
    // } else if (cookieErrors.length > 0) {
    //   errors.push("Fix cookie format errors before saving");
    // } else if (parsedCookies.length === 0) {
    //   errors.push("At least one valid cookie is required");
    // }

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
      };

      const profileData = {
        name: formData.name.trim(),
        proxy,
        cookies: parsedCookies,
      };

      onSave(profileData);
    } catch (error) {
      setFormErrors([
        error instanceof Error ? error.message : "Error saving profile",
      ]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    if (!isValidating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="add-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingProfile ? "Edit Profile" : "Add New Profile"}</h3>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={isValidating}
          >
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Profile Name */}
          <div className="form-group">
            <label htmlFor="profile-name">Profile Name *</label>
            <input
              id="profile-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter profile name"
              maxLength={50}
              disabled={isValidating}
            />
          </div>

          {/* Proxy Settings */}
          <div className="form-section">
            <h4>Proxy Settings</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="proxy-login">Login *</label>
                <input
                  id="proxy-login"
                  type="text"
                  value={formData.proxy.login}
                  onChange={(e) =>
                    handleInputChange("proxy.login", e.target.value)
                  }
                  placeholder="Proxy username"
                  disabled={isValidating}
                />
              </div>
              <div className="form-group">
                <label htmlFor="proxy-password">Password *</label>
                <input
                  id="proxy-password"
                  type="password"
                  value={formData.proxy.password}
                  onChange={(e) =>
                    handleInputChange("proxy.password", e.target.value)
                  }
                  placeholder="Proxy password"
                  disabled={isValidating}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="proxy-ip">IP Address *</label>
                <input
                  id="proxy-ip"
                  type="text"
                  value={formData.proxy.ip}
                  onChange={(e) =>
                    handleInputChange("proxy.ip", e.target.value)
                  }
                  placeholder="192.168.1.1 or proxy.example.com"
                  disabled={isValidating}
                />
              </div>
              <div className="form-group">
                <label htmlFor="proxy-port">Port *</label>
                <input
                  id="proxy-port"
                  type="number"
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

          {/* Cookie Data */}
          <div className="form-section">
            <h4>🍪 Cookie Data</h4>
            <div className="form-group">
              <label htmlFor="cookies-json">
                AdsPower Cookies (JSON Format) *
              </label>
              <textarea
                id="cookies-json"
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
              <div className="cookies-status success">
                {parsedCookies.length} valid cookie
                {parsedCookies.length !== 1 ? "s" : ""} parsed
              </div>
            )}

            {cookieErrors.length > 0 && (
              <div className="cookies-status error">
                Cookie errors:
                <ul>
                  {cookieErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Form Errors */}
          {formErrors.length > 0 && (
            <div className="form-errors">
              <h5>Please fix the following errors:</h5>
              <ul>
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="cancel-btn"
            onClick={handleClose}
            disabled={isValidating}
          >
            Cancel
          </button>
          <button
            className="save-btn"
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
