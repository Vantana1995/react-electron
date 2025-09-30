/**
 * Example cookie formats for testing
 * These show the different formats that AdsPower and other tools might export
 */

// Standard AdsPower format
export const adsPowerFormat = [
  {
    "name": "session_id",
    "value": "abc123def456",
    "domain": ".twitter.com",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "sameSite": "Lax",
    "expires": 1735689600
  }
];

// Chrome DevTools format
export const chromeFormat = [
  {
    "name": "session_id",
    "value": "abc123def456",
    "domain": ".twitter.com",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "sameSite": "Lax",
    "expirationDate": 1735689600
  }
];

// Browser extension format
export const extensionFormat = [
  {
    "key": "session_id",
    "value": "abc123def456",
    "host": ".twitter.com",
    "path": "/",
    "secure": true,
    "http_only": true,
    "same_site": "lax",
    "expiry": "2024-12-31T23:59:59.999Z"
  }
];

// Simple format
export const simpleFormat = [
  {
    "name": "session_id",
    "value": "abc123def456",
    "domain": ".twitter.com"
  }
];

// Netscape format (sometimes used)
export const netscapeFormat = [
  {
    "name": "session_id",
    "value": "abc123def456",
    "domain": ".twitter.com",
    "path": "/",
    "secure": "true",
    "httpOnly": "false",
    "expires": "Wed, 31 Dec 2024 23:59:59 GMT"
  }
];