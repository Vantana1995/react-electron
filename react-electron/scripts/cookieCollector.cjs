/**
 * Standalone Cookie Collection Script
 * Runs as a separate Node.js process spawned from Electron main
 *
 * Usage: node cookieCollector.cjs <profileJSON> <optionsJSON>
 *
 * Outputs JSON to stdout:
 * - Progress: {"type":"progress","data":{currentSite,sitesVisited,...}}
 * - Result: {"type":"result","data":{success,cookies,totalCookies,...}}
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// ============================================================================
// SITE CONFIGURATION
// ============================================================================

const DEFAULT_COOKIE_SITES = [
  { name: 'Google', url: 'https://www.google.com' },
  { name: 'YouTube', url: 'https://www.youtube.com' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
  { name: 'Reddit', url: 'https://www.reddit.com' },
  { name: 'Amazon', url: 'https://www.amazon.com/ref=nav_logo' },
  { name: 'eBay', url: 'https://www.ebay.com' },
  { name: 'BBC', url: 'https://www.bbc.com' },
  { name: 'CNN', url: 'https://www.cnn.com' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'IMDb', url: 'https://www.imdb.com' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Blacklist patterns for buttons to avoid (login, subscribe, checkout, etc.)
const BUTTON_BLACKLIST = [
  /sign.?in/i,
  /log.?in/i,
  /sign.?up/i,
  /register/i,
  /subscribe/i,
  /subscription/i,
  /cart/i,
  /checkout/i,
  /buy.?now/i,
  /purchase/i,
  /add.?to.?cart/i,
  /download/i,
  /install/i,
  /get.?started/i,
  /join.?now/i,
  /create.?account/i,
  /free.?trial/i,
];

// Universal cookie banner selectors (fast detection) - EXPANDED for universal support
const UNIVERSAL_COOKIE_SELECTORS = [
  // Button-based selectors
  'button[id*="accept"]',
  'button[id*="consent"]',
  'button[class*="accept"]',
  'button[class*="consent"]',
  'button[data-consent*="accept"]',
  'button[data-testid*="accept"]',
  'button[aria-label*="Accept"]',
  'button[data-analytics*="consent"]',
  'button[data-analytics*="accept"]',

  // A (link) based selectors
  'a[id*="accept"]',
  'a[class*="accept"]',
  'a[data-testid*="accept"]',

  // Input-based selectors
  'input[type="submit"][value*="Accept"]',

  // DIV with roles and onclick (Google, many modern sites)
  'div[role="button"]',
  'div[onclick*="accept"]',
  'div[onclick*="consent"]',
  'div[id*="accept"][role]',
  'div[class*="accept"][role]',

  // SPAN with roles
  'span[role="button"]',
  'span[onclick*="accept"]',

  // Universal ARIA on ANY element
  '[aria-label*="Accept"]',
  '[aria-label*="Agree"]',
  '[aria-label*="consent"]',

  // Universal data attributes on ANY element
  '[data-testid*="accept"]',
  '[data-testid*="consent"]',
  '[data-action*="accept"]',
  '[data-action*="consent"]',

  // Container-based (CNN, etc.)
  'div[id*="consent"] button',
  'div[id*="privacy"] button',
  'div[class*="consent"] button',
  'div[class*="privacy"] button',
  'div[class*="cookie"] button',

  // Overlay/Modal buttons
  'div[role="dialog"] button',
  'div[role="dialog"] a',
  'div[role="dialog"] [role="button"]',
  'div[aria-modal="true"] button',
  'div[aria-modal="true"] [role="button"]',
];

// Universal text-based selectors (slower, using XPath) - EXPANDED for all clickable elements
const UNIVERSAL_TEXT_SELECTORS = [
  // Button variants
  { selector: 'button', text: 'Accept all' },
  { selector: 'button', text: 'Accept' },
  { selector: 'button', text: 'I accept' },
  { selector: 'button', text: 'I agree' },
  { selector: 'button', text: 'Agree' },
  { selector: 'button', text: 'Allow all' },
  { selector: 'button', text: 'OK' },
  { selector: 'button', text: 'Continue' },
  { selector: 'button', text: 'Got it' },
  { selector: 'button', text: 'I understand' },
  { selector: 'button', text: 'Agree and continue' },

  // DIV variants (Google and many other sites use clickable divs)
  { selector: 'div', text: 'Accept all' },
  { selector: 'div', text: 'Accept' },
  { selector: 'div', text: 'Agree' },
  { selector: 'div', text: 'OK' },
  { selector: 'div', text: 'Continue' },
  { selector: 'div', text: 'Got it' },
  { selector: 'div', text: 'I understand' },

  // SPAN variants
  { selector: 'span', text: 'Accept all' },
  { selector: 'span', text: 'Accept' },
  { selector: 'span', text: 'Agree' },

  // A (link) variants
  { selector: 'a', text: 'Accept all' },
  { selector: 'a', text: 'Accept' },
  { selector: 'a', text: 'Agree' },
  { selector: 'a', text: 'Continue' },
];

function getRandomSites(count) {
  const shuffled = [...DEFAULT_COOKIE_SITES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function parseCustomSites(customUrls) {
  return customUrls.map((url, index) => ({
    name: `Custom Site ${index + 1}`,
    url: url.trim(),
  }));
}

function getSitesToVisit(sitesCount, useDefaultSites, customSites) {
  const sites = [];

  if (useDefaultSites) {
    sites.push(...getRandomSites(sitesCount));
  }

  if (customSites && customSites.length > 0) {
    sites.push(...parseCustomSites(customSites));
  }

  return sites;
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Delay helper (replacement for page.waitForTimeout which is deprecated)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sendProgress(data) {
  console.log(JSON.stringify({ type: 'progress', data }));
}

function sendResult(data) {
  console.log(JSON.stringify({ type: 'result', data }));
}

function sendError(message) {
  console.error(JSON.stringify({ type: 'error', message }));
}

/**
 * Apply fingerprint to a page
 * @param {Page} page - Puppeteer page
 * @param {Object} fingerprint - Profile fingerprint
 */
async function applyFingerprint(page, fingerprint) {
  try {
    // Set UserAgent
    await page.setUserAgent(fingerprint.userAgent);

    // Override WebGL, Canvas, Audio fingerprints
    await page.evaluateOnNewDocument((fp) => {
      // WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return fp.webgl.vendor;
        if (parameter === 37446) return fp.webgl.renderer;
        return getParameter.call(this, parameter);
      };

      // Canvas
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        // Add noise to canvas
        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 10) - 5;
          }
          ctx.putImageData(imageData, 0, 0);
        }
        return toBlob.call(this, callback, type, quality);
      };

      // Navigator properties
      Object.defineProperty(navigator, 'platform', {
        get: () => fp.platform,
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => fp.hardwareConcurrency,
      });
    }, fingerprint);
  } catch (error) {
    // Ignore fingerprint errors
  }
}

/**
 * Setup page with proxy authentication
 * @param {Page} page - Puppeteer page
 * @param {Object} proxy - Proxy credentials
 */
async function setupPageWithAuth(page, proxy) {
  try {
    if (proxy && proxy.login && proxy.password) {
      await page.authenticate({
        username: proxy.login,
        password: proxy.password,
      });
    }
  } catch (error) {
    // Ignore auth errors
  }
}

// ============================================================================
// HUMAN BEHAVIOR SIMULATION
// ============================================================================

// Simulate realistic mouse movement
async function simulateMouseMovement(page) {
  try {
    const viewport = page.viewport();
    const x = randomDelay(100, viewport.width - 100);
    const y = randomDelay(100, viewport.height - 100);

    // Move mouse in curve with multiple steps
    const steps = randomDelay(15, 30);
    const currentPos = { x: 0, y: 0 };

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const targetX = currentPos.x + (x - currentPos.x) * progress;
      const targetY = currentPos.y + (y - currentPos.y) * progress;

      await page.mouse.move(targetX, targetY);
      await delay(randomDelay(10, 30));
    }
  } catch (error) {
    // Ignore mouse movement errors
  }
}

// Realistic scrolling with back-scrolling
async function realisticScrolling(page, totalAmount = 1000) {
  try {
    const scrollSteps = randomDelay(5, 10);
    const stepAmount = totalAmount / scrollSteps;

    for (let i = 0; i < scrollSteps; i++) {
      // Scroll down
      await page.evaluate((amount) => {
        window.scrollBy({
          top: amount,
          behavior: 'smooth'
        });
      }, stepAmount);

      await delay(randomDelay(300, 800));

      // Sometimes scroll back up a bit (reading behavior)
      if (Math.random() > 0.7) {
        await page.evaluate((amount) => {
          window.scrollBy({
            top: -amount * 0.3,
            behavior: 'smooth'
          });
        }, stepAmount);
        await delay(randomDelay(200, 500));
      }
    }
  } catch (error) {
    // Ignore scrolling errors
  }
}

// Simulate typing in search field
async function simulateSearch(page) {
  try {
    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[name="query"]',
      'input[placeholder*="Search"]',
      'input[aria-label*="Search"]',
    ];

    for (const selector of searchSelectors) {
      const input = await page.$(selector);
      if (input) {
        await input.click();
        await delay(randomDelay(300, 600));

        // Type random search query
        const queries = ['news', 'article', 'today', 'popular', 'trending'];
        const query = queries[randomDelay(0, queries.length - 1)];

        await input.type(query, { delay: randomDelay(80, 150) });
        await delay(randomDelay(500, 1000));

        // Clear the input
        await page.keyboard.press('Escape');
        await delay(randomDelay(200, 400));

        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Find cookie banner in overlay/modal (Level 3)
 * @param {Page} page
 * @returns {Promise<ElementHandle|null>}
 */
async function findCookieBannerInOverlay(page) {
  try {
    const overlayElement = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('*'));

      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex) || 0;
        const position = style.position;

        // Overlay detection: high z-index OR dialog role
        if (
          (zIndex > 999 || el.getAttribute('role') === 'dialog' || el.getAttribute('aria-modal') === 'true') &&
          (position === 'fixed' || position === 'absolute')
        ) {
          // Search for accept/agree buttons inside overlay
          const buttons = el.querySelectorAll('button, a, div[role="button"], span[role="button"], [onclick]');

          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase().trim();
            if (
              text.includes('accept') ||
              text.includes('agree') ||
              text.includes('ok') ||
              text.includes('continue') ||
              text.includes('got it')
            ) {
              return btn;
            }
          }
        }
      }

      return null;
    });

    return overlayElement.asElement();
  } catch (error) {
    return null;
  }
}

/**
 * Aggressive search - find ANY accept/agree button (Level 4)
 * @param {Page} page
 * @returns {Promise<ElementHandle|null>}
 */
async function findAnyAcceptButton(page) {
  try {
    const element = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('*'));

      for (const el of elements) {
        // Check text content
        const text = el.textContent.trim().toLowerCase();

        // Exact match only (avoid false positives)
        if (
          text === 'accept all' ||
          text === 'accept' ||
          text === 'agree' ||
          text === 'ok' ||
          text === 'continue' ||
          text === 'got it' ||
          text === 'i understand' ||
          text === 'agree and continue' ||
          text === 'i agree' ||
          text === 'i accept'
        ) {
          // Check if element is visible
          if (el.offsetParent === null) continue;

          // Check if clickable
          const style = window.getComputedStyle(el);
          if (
            el.onclick ||
            el.hasAttribute('onclick') ||
            el.getAttribute('role') === 'button' ||
            el.tagName === 'BUTTON' ||
            el.tagName === 'A' ||
            style.cursor === 'pointer'
          ) {
            return el;
          }

          // Check if parent is clickable
          let parent = el.parentElement;
          while (parent && parent !== document.body) {
            const parentStyle = window.getComputedStyle(parent);
            if (
              parent.onclick ||
              parent.getAttribute('role') === 'button' ||
              parent.tagName === 'BUTTON' ||
              parent.tagName === 'A' ||
              parentStyle.cursor === 'pointer'
            ) {
              return parent;
            }
            parent = parent.parentElement;
          }
        }
      }

      return null;
    });

    return element.asElement();
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to click element with fallback methods
 * @param {Page} page
 * @param {ElementHandle} element
 * @returns {Promise<boolean>}
 */
async function clickElementWithFallback(page, element) {
  try {
    // Try to scroll element into view first
    await element.evaluate((el) => {
      if (el.scrollIntoViewIfNeeded) {
        el.scrollIntoViewIfNeeded();
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await delay(randomDelay(300, 600));

    // Try to get bounding box and click
    const box = await element.boundingBox();
    if (box) {
      const x = box.x + box.width / 2 + randomDelay(-3, 3);
      const y = box.y + box.height / 2 + randomDelay(-3, 3);
      await page.mouse.click(x, y, { delay: randomDelay(30, 80) });
      await delay(randomDelay(500, 1000));
      return true;
    }

    // Fallback: Use evaluate() to click directly via JavaScript
    await element.evaluate((el) => {
      if (el.click) {
        el.click();
      } else if (el.parentElement && el.parentElement.click) {
        el.parentElement.click();
      }
    });
    await delay(randomDelay(500, 1000));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check iframes for cookie banners
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function checkIframesForCookieBanner(page) {
  try {
    const frames = page.frames();

    for (const frame of frames) {
      // Skip main frame
      if (frame === page.mainFrame()) continue;

      // Try attribute-based selectors in iframe
      for (const selector of UNIVERSAL_COOKIE_SELECTORS.slice(0, 15)) {
        try {
          const element = await frame.$(selector);
          if (element) {
            const isVisible = await frame.evaluate((el) => {
              if (!el) return false;
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
            }, element);

            if (isVisible) {
              // Try to click in iframe
              const clicked = await clickElementWithFallback(page, element);
              if (clicked) {
                console.log('✅ Accept cookie (iframe)');
                return true;
              }
            }
          }
        } catch (err) {
          continue;
        }
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Improved Level 2: Direct text search via evaluate() - more reliable than XPath
 * @param {Page} page
 * @returns {Promise<ElementHandle|null>}
 */
async function findCookieButtonByText(page) {
  try {
    const element = await page.evaluateHandle(() => {
      const textVariants = [
        'accept all',
        'accept',
        'i accept',
        'agree',
        'i agree',
        'agree and continue',
        'allow all',
        'ok',
        'continue',
        'got it',
        'i understand',
      ];

      const selectors = ['button', 'a', 'div', 'span'];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);

        for (const el of elements) {
          const text = el.textContent.trim().toLowerCase();

          // Check if text matches any variant
          if (textVariants.includes(text)) {
            // Check visibility
            if (el.offsetParent === null) continue;

            // Check if element or parent is clickable
            const style = window.getComputedStyle(el);
            if (
              el.onclick ||
              el.hasAttribute('onclick') ||
              el.getAttribute('role') === 'button' ||
              el.tagName === 'BUTTON' ||
              el.tagName === 'A' ||
              style.cursor === 'pointer'
            ) {
              return el;
            }

            // Check parent
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
              const parentStyle = window.getComputedStyle(parent);
              if (
                parent.onclick ||
                parent.getAttribute('role') === 'button' ||
                parent.tagName === 'BUTTON' ||
                parent.tagName === 'A' ||
                parentStyle.cursor === 'pointer'
              ) {
                return parent;
              }
              parent = parent.parentElement;
            }
          }
        }
      }

      return null;
    });

    return element.asElement();
  } catch (error) {
    return null;
  }
}

// Quick cookie banner acceptance (universal) - 4-LEVEL SYSTEM WITH IMPROVEMENTS
async function acceptCookieBannerQuick(page) {
  try {
    console.log('🍪 Find cookies');

    // LEVEL 0: Check iframes first (some sites load cookie banners in iframes)
    console.log('🔍 Level 0: Checking iframes...');
    const iframeSuccess = await checkIframesForCookieBanner(page);
    if (iframeSuccess) {
      return true;
    }

    // LEVEL 1: Attribute-based selectors (fastest) - NO waitForSelector blocking!
    console.log('🔍 Level 1: Checking attribute selectors...');
    for (const selector of UNIVERSAL_COOKIE_SELECTORS) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isIntersectingViewport();
          if (isVisible) {
            const clicked = await clickElementWithFallback(page, element);
            if (clicked) {
              console.log('✅ Accept cookie (Level 1: attribute)');
              return true;
            }
          }
        }
      } catch (err) {
        continue;
      }
    }

    // LEVEL 2: Improved text-based search via evaluate() (more reliable than XPath)
    console.log('🔍 Level 2: Checking text-based search...');
    const textElement = await findCookieButtonByText(page);
    if (textElement) {
      const clicked = await clickElementWithFallback(page, textElement);
      if (clicked) {
        console.log('✅ Accept cookie (Level 2: text)');
        return true;
      }
    }

    // LEVEL 3: Overlay/Modal detection
    console.log('🔍 Level 3: Checking overlays/modals...');
    const overlayElement = await findCookieBannerInOverlay(page);
    if (overlayElement) {
      const clicked = await clickElementWithFallback(page, overlayElement);
      if (clicked) {
        console.log('✅ Accept cookie (Level 3: overlay)');
        return true;
      }
    }

    // LEVEL 4: Aggressive search - any accept/agree button
    console.log('🔍 Level 4: Aggressive search...');
    const anyButton = await findAnyAcceptButton(page);
    if (anyButton) {
      const clicked = await clickElementWithFallback(page, anyButton);
      if (clicked) {
        console.log('✅ Accept cookie (Level 4: aggressive)');
        return true;
      }
    }

    // Wait 2-3 seconds for late-loading banners and try Level 4 again
    console.log('⏳ Cookie banner not found immediately, waiting 2-3s for late scripts...');
    await delay(randomDelay(2000, 3000));

    console.log('🔍 Level 4 (retry): Aggressive search after delay...');
    const anyButtonRetry = await findAnyAcceptButton(page);
    if (anyButtonRetry) {
      const clicked = await clickElementWithFallback(page, anyButtonRetry);
      if (clicked) {
        console.log('✅ Accept cookie (Level 4 retry: aggressive)');
        return true;
      }
    }

    // Cookie banner not found - continue without error
    console.log('ℹ️ No cookie banner found');
    return false;
  } catch (error) {
    console.log('⚠️ Error in acceptCookieBannerQuick:', error.message);
    return false;
  }
}

// Click internal link (avoiding blacklisted buttons)
async function clickInternalLink(page, baseUrl) {
  try {
    // Get all links on the page
    const links = await page.$$eval('a[href]', (elements, blacklist) => {
      return elements
        .map((el) => {
          const href = el.getAttribute('href');
          const text = el.textContent.trim();
          const isVisible = el.offsetParent !== null;

          return { href, text, isVisible };
        })
        .filter((link) => {
          // Filter out blacklisted links
          const textLower = link.text.toLowerCase();
          const hrefLower = link.href.toLowerCase();

          // Check if text or href matches blacklist
          const isBlacklistedText = blacklist.some((pattern) => {
            const regex = new RegExp(pattern);
            return regex.test(textLower) || regex.test(hrefLower);
          });

          // Must be visible and not blacklisted
          return link.isVisible && !isBlacklistedText && link.href && link.href.length > 0;
        });
    }, BUTTON_BLACKLIST.map((p) => p.source));

    if (links.length === 0) {
      return null;
    }

    // Filter internal links only
    const domain = new URL(baseUrl).hostname;
    const internalLinks = links.filter((link) => {
      try {
        const linkUrl = new URL(link.href, baseUrl);
        return linkUrl.hostname === domain || linkUrl.hostname.endsWith('.' + domain);
      } catch {
        return false;
      }
    });

    if (internalLinks.length === 0) {
      return null;
    }

    // Pick random internal link
    const randomLink = internalLinks[randomDelay(0, internalLinks.length - 1)];
    const fullUrl = new URL(randomLink.href, baseUrl).href;

    return fullUrl;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// COOKIE COLLECTION LOGIC
// ============================================================================

/**
 * Check if page has content and is usable
 * @param {Page} page - Puppeteer page
 * @returns {Promise<Object>} - {hasText, isScrollable, hasLinks}
 */
async function checkPageHasContent(page) {
  try {
    const pageInfo = await page.evaluate(() => {
      const textContent = document.body.innerText || '';
      const textLength = textContent.trim().length;
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      const links = document.querySelectorAll('a[href]').length;

      return {
        hasText: textLength > 100,
        isScrollable: scrollHeight > viewportHeight + 200,
        hasLinks: links > 5,
        textLength,
        scrollHeight,
      };
    });

    return pageInfo;
  } catch (error) {
    return {
      hasText: false,
      isScrollable: false,
      hasLinks: false,
      textLength: 0,
      scrollHeight: 0,
    };
  }
}

async function visitSite(browser, site, siteIndex, totalSites, startTime, profile) {
  const page = await browser.newPage();
  const siteStartTime = Date.now();
  let linksVisited = 0;

  try {
    // Apply fingerprint and proxy auth to this page
    await applyFingerprint(page, profile.fingerprint);
    await setupPageWithAuth(page, profile.proxy);

    // Navigate to main site
    try {
      await page.goto(site.url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    } catch (navError) {
      throw new Error('Page navigation failed: ' + navError.message);
    }

    // Check if page loaded successfully
    const pageUrl = page.url();
    if (!pageUrl || pageUrl === 'about:blank') {
      throw new Error('Page failed to load - still on blank page');
    }

    // 10 SECOND PAUSE - имитация реального пользователя (читает страницу)
    console.log('📄 Page loaded, waiting 10 seconds (simulating real user)...');
    await delay(10000);
    console.log('✅ 10 seconds passed, continuing...');

    // Check if page has content
    const pageInfo = await checkPageHasContent(page);

    // If page has no content, just collect cookies and exit
    if (!pageInfo.hasText) {
      const cdpSession = await page.target().createCDPSession();
      const { cookies } = await cdpSession.send('Network.getAllCookies');
      await cdpSession.detach();

      const profileCookies = cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires || -1,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || 'Lax',
      }));

      await page.close();

      return {
        success: true,
        siteName: site.name,
        url: site.url,
        cookies: profileCookies,
        cookieCount: profileCookies.length,
        linksVisited: 0,
        timeSpent: Math.floor((Date.now() - siteStartTime) / 1000),
      };
    }

    // IF cookie banner exists → accept it
    const cookieBannerAccepted = await acceptCookieBannerQuick(page);
    if (cookieBannerAccepted) {
      await delay(randomDelay(800, 1500));
    }

    // IF page is scrollable → scroll randomly (3-6 times)
    if (pageInfo.isScrollable) {
      const scrollTimes = randomDelay(3, 6);
      for (let i = 0; i < scrollTimes; i++) {
        if (Math.random() > 0.3) {
          await realisticScrolling(page, randomDelay(500, 1200));
          await delay(randomDelay(800, 1800));
        }
      }
    }

    // IF page has text → move mouse randomly (50% chance)
    if (pageInfo.hasText && Math.random() > 0.5) {
      await simulateMouseMovement(page);
      await delay(randomDelay(500, 1200));
    }

    // IF page has search bar → maybe search (30% chance)
    if (Math.random() > 0.7) {
      const searchSuccess = await simulateSearch(page);
      if (searchSuccess) {
        await delay(randomDelay(1000, 2000));
      }
    }

    // Random reading pause
    await delay(randomDelay(2000, 4000));

    // IF page has links → maybe click 1-2 internal links (40% chance)
    if (pageInfo.hasLinks && Math.random() > 0.6) {
      const linksToVisit = randomDelay(1, 2);

      for (let i = 0; i < linksToVisit; i++) {
        const linkUrl = await clickInternalLink(page, site.url);

        if (linkUrl) {
          try {
            console.log('🔗 Open internal link:', linkUrl);
            await page.goto(linkUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });

            linksVisited++;

            // Mini-activity on new page (IF-based, not await sequence)
            await delay(randomDelay(1000, 2000));

            const linkPageInfo = await checkPageHasContent(page);

            // IF new page has content → do quick actions
            if (linkPageInfo.hasText) {
              // Maybe scroll (60% chance)
              if (linkPageInfo.isScrollable && Math.random() > 0.4) {
                await realisticScrolling(page, randomDelay(400, 800));
                await delay(randomDelay(800, 1500));
              }

              // Maybe move mouse (40% chance)
              if (Math.random() > 0.6) {
                await simulateMouseMovement(page);
                await delay(randomDelay(500, 1000));
              }
            }

            // Pause before next link
            await delay(randomDelay(1500, 3000));
          } catch (linkError) {
            // Link navigation failed, continue
            continue;
          }
        } else {
          break; // No more links found
        }
      }
    }

    // Final random pause
    await delay(randomDelay(2000, 4000));

    // Collect all cookies at the end (once)
    const cdpSession = await page.target().createCDPSession();
    const { cookies } = await cdpSession.send('Network.getAllCookies');
    await cdpSession.detach();

    // Deduplicate cookies
    const cookieMap = new Map();
    cookies.forEach((cookie) => {
      const key = `${cookie.domain}:${cookie.name}`;
      cookieMap.set(key, cookie);
    });

    // Convert to profile format
    const profileCookies = Array.from(cookieMap.values()).map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires || -1,
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || 'Lax',
    }));

    // Close page safely
    try {
      await page.close();
    } catch (closeError) {
      // Ignore close errors
    }

    return {
      success: true,
      siteName: site.name,
      url: site.url,
      cookies: profileCookies,
      cookieCount: profileCookies.length,
      linksVisited,
      timeSpent: Math.floor((Date.now() - siteStartTime) / 1000),
    };
  } catch (error) {
    // Close page safely
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (closeError) {
      // Ignore close errors
    }

    return {
      success: false,
      siteName: site.name,
      url: site.url,
      error: error.message,
      cookies: [],
      cookieCount: 0,
      linksVisited: 0,
      timeSpent: Math.floor((Date.now() - siteStartTime) / 1000),
    };
  }
}

async function collectCookies(profile, options) {
  const startTime = Date.now();
  const sites = getSitesToVisit(options.sitesCount, options.useDefaultSites, options.customSites);
  const totalSites = sites.length;
  const allCookies = [];
  const errors = [];

  let browser = null;

  try {
    // Build proxy URL WITHOUT login:password (Chrome doesn't support it in args)
    const proxyUrl = `http://${profile.proxy.ip}:${profile.proxy.port}`;

    // Launch browser with profile fingerprint and proxy
    const launchOptions = {
      headless: options.headless,
      args: [
        `--proxy-server=${proxyUrl}`,  // Only IP:PORT, auth will be via page.authenticate()
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        `--window-size=${profile.fingerprint.screen.width},${profile.fingerprint.screen.height}`,
        // WebGL flags (reduce warnings)
        '--use-gl=swiftshader',
        '--enable-webgl',
        // Third-party cookies flags (reduce warnings and improve cookie collection)
        '--disable-features=SameSiteByDefaultCookies',
        '--disable-features=CookiesWithoutSameSiteMustBeSecure',
        '--disable-site-isolation-trials',
      ],
      defaultViewport: {
        width: profile.fingerprint.screen.width,
        height: profile.fingerprint.screen.height,
      },
    };

    browser = await puppeteer.launch(launchOptions);

    // Apply fingerprint and proxy auth to default page
    const pages = await browser.pages();
    if (pages.length > 0) {
      const defaultPage = pages[0];
      await applyFingerprint(defaultPage, profile.fingerprint);
      await setupPageWithAuth(defaultPage, profile.proxy);
    }

    // Visit each site
    for (let i = 0; i < totalSites; i++) {
      const site = sites[i];
      const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
      const avgTimePerSite = i > 0 ? timeElapsed / i : 45;
      const estimatedTimeRemaining = Math.floor(avgTimePerSite * (totalSites - i));

      // Send progress update
      sendProgress({
        currentSite: site.name,
        currentUrl: site.url,
        sitesVisited: i,
        totalSites,
        cookiesCollected: allCookies.length,
        timeElapsed,
        estimatedTimeRemaining,
        status: 'running',
        percentage: Math.floor((i / totalSites) * 100),
      });

      // Visit site and collect cookies
      const result = await visitSite(browser, site, i, totalSites, startTime, profile);

      if (result.success) {
        allCookies.push(...result.cookies);
      } else {
        errors.push(`${site.name}: ${result.error}`);
      }

      // Longer delay between sites (human behavior: switching between tasks)
      await new Promise((resolve) => setTimeout(resolve, randomDelay(5000, 12000)));
    }

    // Close browser
    await browser.close();

    const timeElapsed = Math.floor((Date.now() - startTime) / 1000);

    // Send final progress
    sendProgress({
      currentSite: 'Collection complete',
      currentUrl: '',
      sitesVisited: totalSites,
      totalSites,
      cookiesCollected: allCookies.length,
      timeElapsed,
      estimatedTimeRemaining: 0,
      status: 'completed',
      percentage: 100,
    });

    // Send result
    sendResult({
      success: true,
      cookiesCollected: allCookies,
      totalCookies: allCookies.length,
      sitesVisited: totalSites,
      totalSites,
      timeElapsed,
      errors,
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }

    const timeElapsed = Math.floor((Date.now() - startTime) / 1000);

    sendProgress({
      currentSite: 'Error occurred',
      currentUrl: '',
      sitesVisited: 0,
      totalSites,
      cookiesCollected: allCookies.length,
      timeElapsed,
      estimatedTimeRemaining: 0,
      status: 'error',
      error: error.message,
      percentage: 0,
    });

    sendResult({
      success: false,
      cookiesCollected: allCookies,
      totalCookies: allCookies.length,
      sitesVisited: 0,
      totalSites,
      timeElapsed,
      errors: [...errors, error.message],
    });
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

(async () => {
  try {
    // Read JSON data from stdin instead of command-line arguments
    // This avoids ENAMETOOLONG error on Windows when profile data is large
    let inputData = '';

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });

    process.stdin.on('end', async () => {
      try {
        const { profile, options } = JSON.parse(inputData);

        // Start cookie collection
        await collectCookies(profile, options);

        process.exit(0);
      } catch (error) {
        sendError('Failed to parse input data: ' + error.message);
        process.exit(1);
      }
    });

    process.stdin.on('error', (error) => {
      sendError('Failed to read input: ' + error.message);
      process.exit(1);
    });
  } catch (error) {
    sendError(error.message);
    process.exit(1);
  }
})();
