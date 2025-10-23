# Cookie Collection System - Implementation Guide

## ✅ COMPLETED - All Components Implemented

### Overview
This cookie collection system is now **fully implemented** and uses a standalone process architecture to avoid ES module conflicts.

---

## 🏗️ Architecture

### Standalone Process Pattern
The cookie collection logic runs as a **separate Node.js process** spawned from the Electron main process:

```
Electron Main Process (main.ts)
    ↓ spawns
Node.js Child Process (cookieCollector.js)
    ↓ outputs JSON to stdout
Progress & Result Messages
    ↓ parsed and sent via IPC
React Renderer Process (UI Components)
```

**Why this architecture?**
- Avoids ES module conflicts (project uses `"type": "module"`)
- Isolated process can be killed reliably
- Doesn't block main Electron process
- Matches existing script execution pattern in codebase
- Easy to debug (script can be run standalone)

---

## 📁 File Structure

### Created Files

#### 1. **scripts/cookieCollector.cjs** (Standalone Script)
- **Type:** CommonJS module (.cjs extension)
- **Purpose:** Runs cookie collection in separate process
- **Input:** stdin (JSON with profile and options data)
- **Output:** JSON to stdout
  - Progress: `{"type":"progress","data":{currentSite,sitesVisited,...}}`
  - Result: `{"type":"result","data":{success,cookies,...}}`
- **Features:**
  - Embedded site configuration (12 popular sites)
  - Puppeteer-extra with stealth plugin
  - Advanced human behavior simulation:
    - Realistic scrolling with back-scrolling (reading behavior)
    - Mouse movement across page with curved paths
    - Search field interaction (typing + clearing)
    - Internal link clicking (2-4 links per site)
    - Link blacklist (avoids login/subscribe/checkout)
    - Multi-page cookie collection (main + all opened links)
    - Cookie banner acceptance on all pages
    - 50-70 seconds per site (~1 minute)
    - 5-12 seconds delay between sites
  - CDP cookie extraction
  - Cookie deduplication (by domain + name)
  - Real-time progress reporting
  - Error handling and graceful failures

#### 2. **components/ProfileManager/CookieCollectionModal.tsx**
- **Purpose:** Configuration UI for cookie collection
- **Features:**
  - Headless mode toggle
  - Sites count slider (5-15)
  - Custom sites textarea (one URL per line)
  - Estimated time display
  - Reset to defaults button

#### 3. **components/ProfileManager/CookieCollectionModal.css**
- **Purpose:** Gradient modal styles
- **Features:** Modern dark theme, smooth animations, accessibility

### Updated Files

#### 4. **electron/main.ts**
**Changes:**
- ❌ Removed: Puppeteer imports (lines 16-21)
- ❌ Removed: `CookieCollectionService` import
- ✅ Updated: `ActiveCookieCollection` interface (replaced `service` with `process`)
- ✅ Rewrote: `collect-cookies` IPC handler (lines 1705-1860)
  - Uses `spawn()` to run `cookieCollector.js`
  - Parses stdout JSON messages for progress
  - Sends IPC events to renderer
  - Returns final result
- ✅ Rewrote: `cancel-cookie-collection` IPC handler (lines 1865-1906)
  - Uses `process.kill()` instead of `service.cancel()`
  - Handles Windows (taskkill) and Unix (SIGTERM/SIGKILL)

#### 5. **components/ProfileManager/AddProfileModal.tsx**
**Changes:**
- Added state: `showCookieCollectionModal`, `isCollectingCookies`
- Added handler: `handleStartCookieCollection`
- Added button: "🍪 Collect Cookies Automatically"
- Added modal: `<CookieCollectionModal />`
- Generates temporary profile for collection
- Merges collected cookies with existing ones

#### 6. **components/ProfileManager/ProfileCard.tsx**
**Changes:**
- Added state: `isCollectingCookies`, `showCookieModal`, `cookieProgress`
- Added useEffect: Listens for progress events via `onCookieCollectionProgress`
- Added handler: `handleStartCookieCollection`, `handleCancelCollection`
- Added button: "🍪" in actions panel
- Added progress bar: Real-time updates during collection
- Calls `sendCookieCollectionComplete` for Telegram notifications

#### 7. **components/ProfileManager/ProfileCard.css**
**Changes:**
- Added `.collect-cookies-btn` with gradient and hover effects
- Added `.cookie-collection-progress` styles
- Added `.progress-bar` and `.progress-fill` with animations

#### 8. **services/profileStorage.ts**
**Changes:**
- Added `mergeCookies()`: Combines cookies using `domain + name` as unique key
- Added `updateProfileCookies()`: Updates profile with merged cookies

#### 9. **services/telegramService.ts**
**Changes:**
- Added `sendCookieCollectionComplete()`: Sends notification to Telegram bot
- Message format includes: profile name, sites visited, cookies collected, time elapsed, errors

#### 10. **types/index.ts**
**Changes:**
- Added interfaces: `SiteConfig`, `SiteAction`, `CookieCollectionOptions`, `CookieCollectionProgress`, `CookieCollectionResult`, `CookieCollectionStats`
- Updated `ElectronAPI` interface with cookie collection methods
- Updated `ProfileCardProps` with `onProfileUpdate` prop

### Deleted Files (Cleanup)
- ❌ **src/services/cookieCollectionService.ts** (logic moved to standalone script)
- ❌ **src/config/cookieSites.ts** (embedded in standalone script)

---

## 🔄 Data Flow

### 1. User Clicks "Collect Cookies" Button
```
ProfileCard.tsx or AddProfileModal.tsx
    ↓ Opens modal
CookieCollectionModal.tsx (user configures options)
    ↓ User clicks "Start"
handleStartCookieCollection()
    ↓ Calls IPC
window.electronAPI.collectCookies(profile, options)
```

### 2. Electron Main Process
```
main.ts: ipcMain.handle("collect-cookies")
    ↓ Spawns process
spawn('node', ['cookieCollector.js', profileJSON, optionsJSON])
    ↓ Listens to stdout
child.stdout.on('data')
    ↓ Parses JSON messages
{"type":"progress",...} or {"type":"result",...}
    ↓ Sends IPC events
event.sender.send('cookie-collection-progress', {...})
```

### 3. React Renderer
```
ProfileCard.tsx: useEffect listener
    ↓ Receives IPC event
window.electronAPI.onCookieCollectionProgress()
    ↓ Updates state
setCookieProgress(data.progress)
    ↓ Updates UI
Progress bar, current site, cookies count, time remaining
```

### 4. Completion
```
cookieCollector.js: Sends result
{"type":"result","data":{success:true,cookies:[...],...}}
    ↓ main.ts resolves promise
resolve(finalResult)
    ↓ ProfileCard receives result
await window.electronAPI.collectCookies()
    ↓ Updates profile
profileStorage.updateProfileCookies(profile.id, cookies)
    ↓ Sends Telegram notification (if configured)
sendCookieCollectionComplete(telegram, name, stats)
```

---

## 🎯 Key Features

### 1. Site Configuration
- **12 popular sites** pre-configured: Google, YouTube, Wikipedia, Reddit, Amazon, eBay, BBC, CNN, Stack Overflow, GitHub, IMDb, Pinterest
- **Custom sites** support: User can add any URLs
- **Cookie selectors**: Multiple fallback selectors for each site
- **Human actions**: Scroll, wait, click actions for realistic behavior

### 2. Human Behavior Simulation (Advanced)
- **Realistic scrolling**: Incremental scrolling with back-scrolling (simulates reading behavior)
- **Mouse movement**: Curved mouse movements across the page with multiple steps
- **Search interaction**: Types random queries in search fields, then clears them
- **Internal link clicking**: Opens 2-4 internal links per site (articles, categories, etc.)
- **Link blacklist**: Automatically avoids login, subscribe, checkout, cart, register buttons
- **Multi-page cookie collection**: Collects cookies from main page + all opened internal links
- **Universal cookie banners**: Accepts cookie banners on all pages (main + opened links)
- **Activity loop**: Randomly performs scroll, mouse movement, search, wait actions
- **Realistic timing**: 50-70 seconds per site (target: ~1 minute)
- **Inter-site delays**: 5-12 seconds between sites (simulates task switching)

### 3. Fingerprint Application
- **User Agent**: Applied from `profile.fingerprint.userAgent`
- **Viewport**: Set from `profile.fingerprint.screen.width/height`
- **WebGL**: Overrides vendor and renderer
- **Canvas**: Adds noise to canvas fingerprinting
- **Navigator**: Overrides platform, hardwareConcurrency

### 4. Proxy Configuration
- **Applied via args**: `--proxy-server=http://user:pass@ip:port`
- **Tested per profile**: Each profile can have different proxy
- **Error handling**: Timeouts and failures are handled gracefully

### 5. Cookie Merging
- **Unique key**: `domain + name`
- **No duplicates**: New cookies overwrite existing ones with same key
- **Profile preservation**: Existing cookies remain if not overwritten

### 6. Real-time Progress
- **Current site**: Shows which site is being visited
- **Progress percentage**: 0-100%
- **Cookies collected**: Running total
- **Sites visited**: X / Y format
- **Estimated time**: Based on average time per site
- **Cancel button**: Can stop collection at any time

### 7. Telegram Notifications
- **Completion message**: Sent when collection finishes
- **Includes stats**: Sites visited, cookies collected, time elapsed
- **Error reporting**: Shows count of errors if any
- **Conditional**: Only sent if `profile.telegram.connected === true`

---

## 🧪 Testing

### Manual Testing Steps

1. **Build and run the app:**
   ```bash
   cd react-electron
   npm install
   npm run dev
   ```

2. **Create a new profile:**
   - Click "Add Profile"
   - Fill in name, proxy, fingerprint
   - Click "🍪 Collect Cookies Automatically"
   - Configure options (visible mode, 5 sites)
   - Click "Start Collection"
   - Watch browser visit sites and collect cookies
   - Verify cookies appear in textarea after completion

3. **Test with existing profile:**
   - Click "🍪" button on profile card
   - Configure options
   - Click "Start Collection"
   - Watch progress bar update
   - Verify cookies are merged (not replaced)

4. **Test cancellation:**
   - Start collection
   - Click "Cancel" button
   - Verify process stops immediately

5. **Test with proxy:**
   - Use a valid proxy in profile
   - Start collection
   - Verify sites load through proxy

6. **Test with custom sites:**
   - Add custom URLs in modal
   - Start collection
   - Verify custom sites are visited

7. **Test Telegram notification:**
   - Configure Telegram bot in profile
   - Start collection
   - Verify notification is sent on completion

8. **Test headless mode:**
   - Enable headless in modal
   - Start collection
   - Verify no browser window appears

### Error Scenarios

1. **Proxy not working:**
   - Result: Sites timeout, collection continues with next site
   - Errors array includes timeout messages

2. **Cookie banner not found:**
   - Result: Collection continues without accepting banner
   - Still collects default cookies

3. **Site timeout:**
   - Result: Site is skipped, error logged
   - Collection continues with next site

4. **Browser crash:**
   - Result: Process exits with error code
   - Final result includes error message

5. **Process killed:**
   - Result: Collection stops, cleanup runs
   - No result returned (cancelled)

---

## 📊 Performance

### Timing (Updated with Advanced Behavior)
- **Average per site**: 50-70 seconds (~1 minute with link clicking)
- **Total for 10 sites**: ~10-15 minutes (including inter-site delays)
- **Headless mode**: ~15% faster (still performs all actions)
- **Network dependent**: Site responsiveness and link loading affects timing
- **Link clicking**: Adds 2-4 internal page visits per site (10-15 seconds each)

### Resource Usage
- **CPU**: Moderate (browser automation)
- **Memory**: ~200-500MB per browser instance
- **Disk**: Minimal (cookies are small)
- **Network**: Depends on site sizes

---

## 🔧 Maintenance

### Updating Site Selectors
If a site changes its cookie banner HTML:
1. Edit `scripts/cookieCollector.cjs`
2. Find the site in `DEFAULT_COOKIE_SITES` array
3. Update `cookieSelectors` array
4. Test with visible mode to verify

Note: The script now uses `UNIVERSAL_COOKIE_SELECTORS` for most cookie banner detection, which works across most sites.

### Adding New Sites
1. Edit `scripts/cookieCollector.cjs`
2. Add new object to `DEFAULT_COOKIE_SITES`:
```javascript
{
  name: 'Site Name',
  url: 'https://example.com',
  cookieSelectors: [
    'button:contains("Accept")',
    // ... fallback selectors
  ],
  actions: [
    { type: 'scroll', scrollAmount: 500 },
    { type: 'wait', duration: 2000 },
  ],
}
```

### Debugging
Run script standalone for debugging (using stdin):
```bash
cd react-electron/scripts
echo '{"profile":{"id":"test","proxy":{...},"fingerprint":{...}},"options":{"sitesCount":5,"headless":false}}' | node cookieCollector.cjs
```

Or create a test input file:
```bash
# Create test-input.json with profile and options
node cookieCollector.cjs < test-input.json
```

---

## 🐛 Known Issues & Solutions

### Issue: "Element not found" errors
**Cause:** Site changed cookie banner HTML
**Solution:** Update selectors in `cookieCollector.cjs` or rely on universal selectors

### Issue: Proxy timeouts
**Cause:** Proxy has rate limits or blocks certain sites
**Solution:** Test proxy separately, use different proxy, or skip sites

### Issue: No cookies collected
**Cause:** Cookie banners use different selectors or don't appear
**Solution:** Run in visible mode to debug, update selectors. Note: Universal selectors now cover most sites.

### Issue: Browser crashes
**Cause:** Memory limits or incompatible flags
**Solution:** Reduce sites count, disable certain flags

### Issue: Process hangs
**Cause:** Site takes too long to load or internal links timeout
**Solution:** Increase timeout in `page.goto()` or skip site. Script now has 15s timeout for internal links.

### Issue: ENAMETOOLONG error
**Cause:** Profile data too large for command-line arguments
**Solution:** FIXED - Now uses stdin for data passing instead of command-line args

### Issue: "Cannot find module 'D:\Twitter'" error
**Cause:** Path with spaces + shell: true in spawn options
**Solution:** FIXED - Removed shell: true from spawn call

### Issue: "require is not defined" error
**Cause:** ES module vs CommonJS conflict
**Solution:** FIXED - Renamed cookieCollector.js to cookieCollector.cjs

---

## 📚 Code References

### Main Logic Flow
- [cookieCollector.cjs:726](react-electron/scripts/cookieCollector.cjs#L726) - `collectCookies()` main function
- [cookieCollector.cjs:572](react-electron/scripts/cookieCollector.cjs#L572) - `visitSite()` function (completely rewritten with advanced behavior)
- [cookieCollector.cjs:384](react-electron/scripts/cookieCollector.cjs#L384) - `acceptCookieBannerQuick()` function
- [cookieCollector.cjs:470](react-electron/scripts/cookieCollector.cjs#L470) - `quickPageActivity()` function

### Human Behavior Simulation Functions
- [cookieCollector.cjs:290](react-electron/scripts/cookieCollector.cjs#L290) - `simulateMouseMovement()` - Curved mouse movements
- [cookieCollector.cjs:314](react-electron/scripts/cookieCollector.cjs#L314) - `realisticScrolling()` - Scrolling with back-scrolling
- [cookieCollector.cjs:347](react-electron/scripts/cookieCollector.cjs#L347) - `simulateSearch()` - Search field interaction
- [cookieCollector.cjs:412](react-electron/scripts/cookieCollector.cjs#L412) - `clickInternalLink()` - Link finding with blacklist filtering

### IPC Handlers
- [main.ts:1705](react-electron/electron/main.ts#L1705) - `collect-cookies` handler
- [main.ts:1865](react-electron/electron/main.ts#L1865) - `cancel-cookie-collection` handler

### UI Components
- [ProfileCard.tsx:62](react-electron/src/components/ProfileManager/ProfileCard.tsx#L62) - `handleStartCookieCollection`
- [ProfileCard.tsx:32](react-electron/src/components/ProfileManager/ProfileCard.tsx#L32) - Progress listener useEffect
- [CookieCollectionModal.tsx:71](react-electron/src/components/ProfileManager/CookieCollectionModal.tsx#L71) - Modal configuration

### Cookie Merging
- [profileStorage.ts:144](react-electron/src/services/profileStorage.ts#L144) - `mergeCookies()` method
- [profileStorage.ts:164](react-electron/src/services/profileStorage.ts#L164) - `updateProfileCookies()` method

### Telegram Integration
- [telegramService.ts:228](react-electron/src/services/telegramService.ts#L228) - `sendCookieCollectionComplete()` function
- [ProfileCard.tsx:82](react-electron/src/components/ProfileManager/ProfileCard.tsx#L82) - Notification call

---

## ✅ Implementation Status

| Component | Status | File |
|-----------|--------|------|
| Types & Interfaces | ✅ Complete | types/index.ts |
| Site Configuration | ✅ Complete | scripts/cookieCollector.cjs |
| Standalone Script | ✅ Complete | scripts/cookieCollector.cjs |
| Human Behavior Simulation | ✅ Complete | scripts/cookieCollector.cjs |
| Link Clicking & Blacklist | ✅ Complete | scripts/cookieCollector.cjs |
| Multi-page Cookie Collection | ✅ Complete | scripts/cookieCollector.cjs |
| Universal Cookie Banners | ✅ Complete | scripts/cookieCollector.cjs |
| IPC Handlers (stdin/stdout) | ✅ Complete | electron/main.ts |
| Preload API | ✅ Complete | electron/preload.ts |
| Profile Storage | ✅ Complete | services/profileStorage.ts |
| Cookie Collection UI (Collapsible) | ✅ Complete | components/ProfileManager/ProfileCard.tsx |
| AddProfileModal Integration | ✅ Complete | components/ProfileManager/AddProfileModal.tsx |
| Telegram Notifications | ✅ Complete | services/telegramService.ts |
| CSS Styling | ✅ Complete | ProfileCard.css |
| Bug Fixes (stdin, path, cjs) | ✅ Complete | main.ts, cookieCollector.cjs |

---

## 🎉 Summary

The cookie collection system is **fully implemented with advanced human behavior simulation**. It provides:

- ✅ **Reliable architecture** using standalone process pattern with stdin/stdout communication
- ✅ **User-friendly UI** with collapsible sections and real-time progress (SearchQueryBuilder pattern)
- ✅ **12 popular sites** pre-configured with universal cookie banner detection
- ✅ **Custom sites support** for any URLs
- ✅ **Advanced human behavior simulation** for highly realistic browsing:
  - Realistic scrolling with back-scrolling (reading behavior)
  - Curved mouse movements across pages
  - Search field interaction (typing + clearing)
  - Internal link clicking (2-4 links per site)
  - Blacklist filtering (avoids login/subscribe/checkout buttons)
  - Multi-page cookie collection (main + all opened links)
  - Universal cookie banner acceptance on all pages
  - 50-70 seconds per site (~1 minute realistic timing)
  - 5-12 seconds delay between sites
- ✅ **Fingerprint & proxy** application per profile
- ✅ **Cookie merging** without duplicates (by domain + name)
- ✅ **Cookie deduplication** across multiple pages
- ✅ **Telegram notifications** on completion
- ✅ **Error handling** with graceful failures
- ✅ **Cancellation support** at any time
- ✅ **Bug fixes** for ENAMETOOLONG, path with spaces, ES module conflicts

**Implementation is complete.** The system now simulates realistic human browsing behavior with link clicking, scrolling, mouse movement, and multi-page cookie collection.

---

**Last Updated:** 2025-10-22 (Advanced Behavior Update)
**Implementation:** Complete
**Status:** Production Ready with Advanced Human Simulation
