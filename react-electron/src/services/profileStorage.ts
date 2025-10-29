/**
 * Profile Storage Service
 * Manages local storage of user profiles on device
 * Stores profiles with proxy settings, cookies, and other configuration
 */

import { UserProfile, ProfileCookie, PROFILE_STORAGE_KEY, Fingerprint } from "../types";
import { v4 as uuidv4 } from "uuid";

class ProfileStorageService {
  private readonly storageKey = PROFILE_STORAGE_KEY;

  /**
   * Get all profiles from local storage
   */
  async getProfiles(): Promise<UserProfile[]> {
    try {
      console.log(`🗂️ Loading profiles from local storage: ${this.storageKey}`);
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return [];
      }

      const profiles: UserProfile[] = JSON.parse(stored);
      return profiles.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error("Error loading profiles:", error);
      return [];
    }
  }

  /**
   * Save a new profile
   */
  async saveProfile(
    profileData: Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "isActive">
  ): Promise<UserProfile> {
    const profiles = await this.getProfiles();

    // Check for duplicate proxies (compare by ip:port combination)
    // Only check if proxy is defined (profiles without proxy are allowed)
    if (profileData.proxy) {
      const newProxyKey = `${profileData.proxy.ip}:${profileData.proxy.port}`.toLowerCase();
      if (profiles.some(p => p.proxy && `${p.proxy.ip}:${p.proxy.port}`.toLowerCase() === newProxyKey)) {
        throw new Error("Profile with this proxy (IP:PORT) already exists");
      }
    }

    const newProfile: UserProfile = {
      ...profileData,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: false, // New profiles start as inactive - must be explicitly activated
      fingerprint: profileData.fingerprint // Include fingerprint
    };

    // Save fingerprint to file if it exists
    if (newProfile.fingerprint) {
      await this.saveFingerprintToFile(newProfile.id, newProfile.fingerprint);
    }

    const updatedProfiles = [...profiles, newProfile];
    await this.saveProfiles(updatedProfiles);

    return newProfile;
  }

  /**
   * Save fingerprint to file via IPC
   */
  private async saveFingerprintToFile(profileId: string, fingerprint: Fingerprint): Promise<void> {
    try {
      console.log(`[PROFILE STORAGE] Saving fingerprint for profile ${profileId} to file...`);
      const result = await window.electronAPI.saveFingerprint(profileId, fingerprint);

      if (result.success) {
        console.log(`[PROFILE STORAGE] ✅ Fingerprint saved to file for profile ${profileId}`);
      } else {
        console.error(`[PROFILE STORAGE] ❌ Failed to save fingerprint to file:`, result.error);
      }
    } catch (error) {
      console.error('[PROFILE STORAGE] Error saving fingerprint to file:', error);
    }
  }

  /**
   * Update an existing profile
   */
  async updateProfile(profileId: string, updates: Partial<Omit<UserProfile, "id" | "createdAt">>): Promise<UserProfile> {
    const profiles = await this.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      throw new Error("Profile not found");
    }

    // Check for duplicate proxies if proxy is being updated
    if (updates.proxy) {
      const updatedProxyKey = `${updates.proxy.ip}:${updates.proxy.port}`.toLowerCase();
      const proxyExists = profiles.some(p =>
        p.id !== profileId &&
        p.proxy &&
        `${p.proxy.ip}:${p.proxy.port}`.toLowerCase() === updatedProxyKey
      );
      if (proxyExists) {
        throw new Error("Profile with this proxy (IP:PORT) already exists");
      }
    }

    const updatedProfile: UserProfile = {
      ...profiles[profileIndex],
      ...updates,
      updatedAt: Date.now()
    };

    profiles[profileIndex] = updatedProfile;
    await this.saveProfiles(profiles);

    return updatedProfile;
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    const profiles = await this.getProfiles();
    const filteredProfiles = profiles.filter(p => p.id !== profileId);

    if (filteredProfiles.length === profiles.length) {
      throw new Error("Profile not found");
    }

    await this.saveProfiles(filteredProfiles);
    return true;
  }

  /**
   * Get a specific profile by ID
   */
  async getProfile(profileId: string): Promise<UserProfile | null> {
    const profiles = await this.getProfiles();
    return profiles.find(p => p.id === profileId) || null;
  }

  /**
   * Parse AdsPower cookies JSON format and convert to ProfileCookie format
   */
  parseAdsPowerCookies(cookiesJson: string): ProfileCookie[] {
    try {
      // Trim whitespace first
      const cleanJson = cookiesJson.trim();

      if (!cleanJson) {
        throw new Error("Cookie data is empty");
      }
      const parsed = JSON.parse(cleanJson);
      
      // Handle array of cookies
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          throw new Error("Cookie array is empty");
        }
        console.log("Processing array of", parsed.length, "cookies");
        return parsed.map((cookie, index) => {
          try {
            return this.convertAdsPowerCookie(cookie);
          } catch (error) {
            console.error(`Error processing cookie ${index}:`, error);
            throw new Error(`Error in cookie ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
      }

      // Handle single cookie object
      if (typeof parsed === "object" && parsed !== null) {
        console.log("Processing single cookie object");
        return [this.convertAdsPowerCookie(parsed)];
      }

      throw new Error(`Invalid cookie format. Expected array or object, got: ${typeof parsed}`);
    } catch (error) {
      console.error("Error parsing AdsPower cookies:", error);

      // Provide more specific error messages
      if (error instanceof SyntaxError) {
        throw new Error("Invalid JSON format. Please check your JSON syntax.");
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error("Failed to parse cookies. Please check the JSON format.");
    }
  }

  /**
   * Convert AdsPower cookie format to ProfileCookie format
   */
  private convertAdsPowerCookie(adsCookie: any): ProfileCookie {
    if (!adsCookie || typeof adsCookie !== "object") {
      throw new Error("Cookie must be an object");
    }

    // Handle different possible formats from AdsPower
    const name = adsCookie.name || adsCookie.key || "";
    const value = adsCookie.value || "";
    const domain = adsCookie.domain || adsCookie.host || "";

    if (!name) {
      throw new Error("Cookie must have a 'name' or 'key' field");
    }

    if (!domain) {
      throw new Error("Cookie must have a 'domain' or 'host' field");
    }

    const cookie: ProfileCookie = {
      name,
      value,
      domain,
      path: adsCookie.path || "/",
      httpOnly: adsCookie.httpOnly || adsCookie.http_only || false,
      secure: adsCookie.secure || false,
      sameSite: this.normalizeSameSite(adsCookie.sameSite || adsCookie.same_site)
    };


    console.log("Converted cookie:", cookie);
    return cookie;
  }

  /**
   * Normalize SameSite values to valid Puppeteer format
   */
  private normalizeSameSite(sameSite: any): "Strict" | "Lax" | "None" | undefined {
    if (!sameSite) return undefined;

    const normalized = String(sameSite).toLowerCase();
    switch (normalized) {
      case "strict":
        return "Strict";
      case "lax":
        return "Lax";
      case "none":
        return "None";
      default:
        return undefined;
    }
  }

  /**
   * Validate cookie data for Puppeteer compatibility
   */
  validateCookiesForPuppeteer(cookies: ProfileCookie[]): { valid: ProfileCookie[]; invalid: string[] } {
    const valid: ProfileCookie[] = [];
    const invalid: string[] = [];

    cookies.forEach((cookie, index) => {
      try {
        // Check required fields
        if (!cookie.name || !cookie.value || !cookie.domain) {
          invalid.push(`Cookie ${index + 1}: Missing required fields (name, value, domain)`);
          return;
        }

        // Check domain format
        if (!cookie.domain.includes(".") && cookie.domain !== "localhost") {
          invalid.push(`Cookie ${index + 1}: Invalid domain format`);
          return;
        }

        // Validate SameSite if present
        if (cookie.sameSite && !["Strict", "Lax", "None"].includes(cookie.sameSite)) {
          invalid.push(`Cookie ${index + 1}: Invalid SameSite value`);
          return;
        }

        valid.push(cookie);
      } catch (error) {
        invalid.push(`Cookie ${index + 1}: Validation error`);
      }
    });

    return { valid, invalid };
  }

  /**
   * Activate profile - ensure we don't exceed maxActiveProfiles limit
   */
  async activateProfile(profileId: string, maxActiveProfiles: number): Promise<UserProfile> {
    const profiles = await this.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      throw new Error("Profile not found");
    }

    // If profile is already active, return it
    if (profiles[profileIndex].isActive) {
      return profiles[profileIndex];
    }

    // Check how many profiles are currently active
    const activeProfiles = profiles.filter(p => p.isActive);

    if (activeProfiles.length >= maxActiveProfiles) {
      throw new Error(`Maximum ${maxActiveProfiles} active profiles allowed. Please deactivate another profile first.`);
    }

    // Activate the profile
    profiles[profileIndex] = {
      ...profiles[profileIndex],
      isActive: true,
      updatedAt: Date.now()
    };

    await this.saveProfiles(profiles);
    return profiles[profileIndex];
  }

  /**
   * Deactivate profile
   */
  async deactivateProfile(profileId: string): Promise<UserProfile> {
    const profiles = await this.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      throw new Error("Profile not found");
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      isActive: false,
      updatedAt: Date.now()
    };

    await this.saveProfiles(profiles);
    return profiles[profileIndex];
  }

  /**
   * Merge new cookies with existing profile cookies
   * Updates existing cookies and adds new ones
   */
  mergeCookies(existingCookies: ProfileCookie[], newCookies: ProfileCookie[]): ProfileCookie[] {
    const cookieMap = new Map<string, ProfileCookie>();

    // Add existing cookies to map (key: domain + name)
    existingCookies.forEach(cookie => {
      const key = `${cookie.domain}|${cookie.name}`;
      cookieMap.set(key, cookie);
    });

    // Add/update with new cookies
    newCookies.forEach(cookie => {
      const key = `${cookie.domain}|${cookie.name}`;
      cookieMap.set(key, cookie);
    });

    // Convert map back to array
    return Array.from(cookieMap.values());
  }

  /**
   * Update profile cookies with merge
   * Combines existing cookies with new cookies
   */
  async updateProfileCookies(profileId: string, newCookies: ProfileCookie[]): Promise<UserProfile> {
    const profile = await this.getProfile(profileId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Merge cookies
    const mergedCookies = this.mergeCookies(profile.cookies || [], newCookies);

    console.log(`[PROFILE STORAGE] Merging cookies for profile ${profile.name}`);
    console.log(`[PROFILE STORAGE] Existing cookies: ${profile.cookies?.length || 0}`);
    console.log(`[PROFILE STORAGE] New cookies: ${newCookies.length}`);
    console.log(`[PROFILE STORAGE] Total after merge: ${mergedCookies.length}`);

    // Update profile with merged cookies
    return await this.updateProfile(profileId, {
      cookies: mergedCookies
    });
  }

  /**
   * Toggle profile activation status
   */
  async toggleProfileActivation(profileId: string, maxActiveProfiles: number): Promise<UserProfile> {
    const profile = await this.getProfile(profileId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.isActive) {
      return await this.deactivateProfile(profileId);
    } else {
      return await this.activateProfile(profileId, maxActiveProfiles);
    }
  }

  /**
   * Update daily statistics for a profile
   */
  async updateDailyStats(profileId: string, dailyStats: import("../types").DailyStats): Promise<UserProfile> {
    const profiles = await this.getProfiles();
    const profileIndex = profiles.findIndex(p => p.id === profileId);

    if (profileIndex === -1) {
      throw new Error("Profile not found");
    }

    const updatedProfile = {
      ...profiles[profileIndex],
      dailyStats,
      updatedAt: Date.now()
    };

    profiles[profileIndex] = updatedProfile;
    await this.saveProfiles(profiles);

    console.log(`📊 Updated daily stats for ${updatedProfile.name}: ${dailyStats.tweetsProcessed} tweets on ${dailyStats.date}`);
    return updatedProfile;
  }

  /**
   * Reset daily counter for a profile (manual reset)
   */
  async resetDailyCounter(profileId: string): Promise<UserProfile> {
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = {
      date: today,
      tweetsProcessed: 0,
      lastReset: Date.now()
    };

    return await this.updateDailyStats(profileId, dailyStats);
  }

  /**
   * Save profiles array to local storage
   */
  private async saveProfiles(profiles: UserProfile[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    } catch (error) {
      console.error("Error saving profiles:", error);
      throw new Error("Failed to save profiles to device storage");
    }
  }
}

// Export singleton instance
export const profileStorage = new ProfileStorageService();