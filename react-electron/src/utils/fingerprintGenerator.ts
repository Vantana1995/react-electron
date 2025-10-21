/**
 * Fingerprint Generation Utilities
 * Generates unique browser fingerprints for anti-detection
 */

export interface Fingerprint {
  webgl: { vendor: string; renderer: string };
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  screen: { width: number; height: number; colorDepth: number; pixelDepth: number };
  languages: string[];
  timezone: string;
  userAgent: string;
  canvasNoise: number;
  audioNoise: number;
  battery: { charging: boolean; level: number };
}

export interface ProxyLocation {
  country: string;      // US, GB, DE, etc.
  timezone: string;     // America/New_York, Europe/London
  countryName: string;  // United States, United Kingdom
}

/**
 * Seeded random generator for consistent fingerprints
 * Same seed (profileId) = same "random" values every time
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

/**
 * Generates unique fingerprint for a profile
 * @param profileId - Profile ID for seeded randomness (ensures consistency)
 * @param proxyCountry - Country code from proxy (US, GB, DE, etc.)
 * @param timezone - Timezone from proxy location
 * @returns Fingerprint object
 */
export function generateFingerprint(
  profileId: string,
  proxyCountry: string = 'US',
  timezone: string = 'America/New_York'
): Fingerprint {
  // Seeded random for consistency
  const random = seededRandom(profileId);

  // WebGL vendors/renderers (REAL GPU combinations)
  const webglOptions = [
    { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
    { vendor: 'Intel Inc.', renderer: 'Intel(R) UHD Graphics 620' },
    { vendor: 'Intel Inc.', renderer: 'Intel(R) HD Graphics 4000' },
    { vendor: 'Intel Inc.', renderer: 'Intel(R) UHD Graphics 630' },
    { vendor: 'Intel Inc.', renderer: 'Intel(R) Iris(R) Xe Graphics' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1060/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1650/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1050 Ti/PCIe/SSE2' },
    { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2060/PCIe/SSE2' },
    { vendor: 'AMD', renderer: 'AMD Radeon RX 580 Series' },
    { vendor: 'AMD', renderer: 'AMD Radeon(TM) Graphics' },
    { vendor: 'AMD', renderer: 'AMD Radeon RX 6600' },
    { vendor: 'AMD', renderer: 'AMD Radeon RX 5700 XT' },
    { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti Direct3D11 vs_5_0 ps_5_0)' },
  ];

  // Platforms
  const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];

  // Hardware specs (realistic values)
  const hardwareConcurrency = [4, 6, 8, 12, 16][Math.floor(random() * 5)];
  const deviceMemory = [4, 8, 16][Math.floor(random() * 3)];

  // Screen resolutions (popular resolutions)
  const screens = [
    { width: 1920, height: 1080 },
    { width: 1920, height: 1200 },
    { width: 2560, height: 1440 },
    { width: 1366, height: 768 },
    { width: 1680, height: 1050 },
    { width: 3840, height: 2160 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1080 },
  ];

  // Color depth
  const colorDepth = [24, 30, 32][Math.floor(random() * 3)];

  // LANGUAGES BY COUNTRY (CRITICAL!)
  const languagesByCountry: Record<string, string[][]> = {
    'US': [['en-US', 'en'], ['en-US', 'en', 'es']],
    'GB': [['en-GB', 'en'], ['en-GB', 'en']],
    'DE': [['de-DE', 'de', 'en'], ['de-DE', 'de']],
    'FR': [['fr-FR', 'fr', 'en'], ['fr-FR', 'fr']],
    'ES': [['es-ES', 'es', 'en'], ['es-ES', 'es']],
    'IT': [['it-IT', 'it', 'en'], ['it-IT', 'it']],
    'PL': [['pl-PL', 'pl', 'en'], ['pl-PL', 'pl']],
    'RU': [['ru-RU', 'ru'], ['ru-RU', 'ru', 'en']],
    'BR': [['pt-BR', 'pt', 'en'], ['pt-BR', 'pt']],
    'JP': [['ja-JP', 'ja', 'en'], ['ja-JP', 'ja']],
    'CN': [['zh-CN', 'zh', 'en'], ['zh-CN', 'zh']],
    'KR': [['ko-KR', 'ko', 'en'], ['ko-KR', 'ko']],
    'IN': [['en-IN', 'en', 'hi'], ['en-IN', 'en']],
    'AU': [['en-AU', 'en'], ['en-AU', 'en']],
    'CA': [['en-CA', 'en', 'fr'], ['en-CA', 'en']],
    'NL': [['nl-NL', 'nl', 'en'], ['nl-NL', 'nl']],
    'SE': [['sv-SE', 'sv', 'en'], ['sv-SE', 'sv']],
    'TR': [['tr-TR', 'tr', 'en'], ['tr-TR', 'tr']],
    'AR': [['es-AR', 'es', 'en'], ['es-AR', 'es']],
    'MX': [['es-MX', 'es', 'en'], ['es-MX', 'es']],
    'UA': [['uk-UA', 'uk', 'ru', 'en'], ['uk-UA', 'uk']],
    'CZ': [['cs-CZ', 'cs', 'en'], ['cs-CZ', 'cs']],
    'NO': [['nb-NO', 'nb', 'en'], ['nb-NO', 'nb']],
    'FI': [['fi-FI', 'fi', 'en'], ['fi-FI', 'fi']],
  };

  // User agents (actual Chrome versions 2024-2025)
  const chromeVersions = [119, 120, 121, 122, 123, 124, 125];
  const windowsVersions = ['10.0', '11.0'];

  // Select random values (but consistent for same profileId)
  const webgl = webglOptions[Math.floor(random() * webglOptions.length)];
  const selectedScreen = screens[Math.floor(random() * screens.length)];
  const platform = platforms[Math.floor(random() * platforms.length)];
  const chromeVersion = chromeVersions[Math.floor(random() * chromeVersions.length)];
  const windowsVersion = windowsVersions[Math.floor(random() * windowsVersions.length)];

  // Languages from proxy country (AUTOMATICALLY!)
  const countryLanguages = languagesByCountry[proxyCountry] || languagesByCountry['US'];
  const languages = countryLanguages[Math.floor(random() * countryLanguages.length)];

  // Canvas/Audio noise (unique noise for each profile)
  const canvasNoise = random() * 0.0001; // 0.00001 - 0.0001
  const audioNoise = random() * 0.0001;

  // Battery
  const battery = {
    charging: random() > 0.5,
    level: 0.5 + random() * 0.5 // 50-100%
  };

  // User Agent (adapts to platform)
  let userAgent: string;
  if (platform === 'Win32') {
    userAgent = `Mozilla/5.0 (Windows NT ${windowsVersion}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  } else if (platform === 'MacIntel') {
    userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  } else {
    userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
  }

  return {
    webgl,
    platform,
    hardwareConcurrency,
    deviceMemory,
    screen: {
      width: selectedScreen.width,
      height: selectedScreen.height,
      colorDepth,
      pixelDepth: colorDepth,
    },
    languages,
    timezone,
    userAgent,
    canvasNoise,
    audioNoise,
    battery,
  };
}

/**
 * Detects proxy location (country, timezone) by IP address
 * Uses free ip-api.com API
 * @param proxyIp - IP address of the proxy
 * @returns ProxyLocation object
 */
export async function getProxyLocation(proxyIp: string): Promise<ProxyLocation> {
  try {
    console.log(`[PROXY] Detecting location for IP: ${proxyIp}`);

    // ip-api.com (FREE, 45 requests/minute)
    const response = await fetch(
      `http://ip-api.com/json/${proxyIp}?fields=status,country,countryCode,timezone`
    );
    const data = await response.json();

    if (data.status === 'success') {
      console.log(`[PROXY] ✅ Detected: ${data.country} (${data.countryCode}), Timezone: ${data.timezone}`);
      return {
        country: data.countryCode,
        timezone: data.timezone,
        countryName: data.country
      };
    }

    throw new Error('API returned error status');
  } catch (error) {
    console.error(`[PROXY] ❌ Location detection failed:`, error);
    console.warn(`[PROXY] Using fallback: US / America/New_York`);

    // Fallback: default values
    return {
      country: 'US',
      timezone: 'America/New_York',
      countryName: 'United States'
    };
  }
}

/**
 * Validates fingerprint object
 * @param fingerprint - Fingerprint to validate
 * @returns true if valid, throws error otherwise
 */
export function validateFingerprint(fingerprint: Fingerprint): boolean {
  const required: (keyof Fingerprint)[] = [
    'webgl', 'platform', 'hardwareConcurrency', 'deviceMemory',
    'screen', 'languages', 'timezone', 'userAgent',
    'canvasNoise', 'audioNoise', 'battery'
  ];

  // Check presence of fields
  for (const field of required) {
    if (!fingerprint[field]) {
      throw new Error(`❌ Missing fingerprint field: ${field}`);
    }
  }

  // Check types and ranges
  if (typeof fingerprint.hardwareConcurrency !== 'number' ||
      fingerprint.hardwareConcurrency < 1 ||
      fingerprint.hardwareConcurrency > 32) {
    throw new Error('❌ Invalid hardwareConcurrency (must be 1-32)');
  }

  if (typeof fingerprint.deviceMemory !== 'number' ||
      fingerprint.deviceMemory < 1 ||
      fingerprint.deviceMemory > 64) {
    throw new Error('❌ Invalid deviceMemory (must be 1-64)');
  }

  if (!fingerprint.screen.width || !fingerprint.screen.height ||
      fingerprint.screen.width < 800 || fingerprint.screen.height < 600) {
    throw new Error('❌ Invalid screen resolution (min 800x600)');
  }

  if (!Array.isArray(fingerprint.languages) || fingerprint.languages.length === 0) {
    throw new Error('❌ Languages must be a non-empty array');
  }

  console.log('✅ Fingerprint validation passed');
  return true;
}

/**
 * Checks if IP address is valid format
 * @param ip - IP address string
 * @returns true if valid IP format
 */
export function isValidIP(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipRegex.test(ip);
}
