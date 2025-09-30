/**
 * Puppeteer Browser Launcher Script
 * Автоматически определяет настройки экрана пользователя и запускает браузер
 */

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Добавляем stealth плагин
puppeteer.use(StealthPlugin());

/**
 * Получить настройки экрана пользователя
 * @param {Object} deviceData - Данные устройства от клиента
 * @returns {Object} Настройки экрана
 */
function getScreenSettings(deviceData) {
  const screen = deviceData.screen || {};

  return {
    width: screen.width || 1920,
    height: screen.height || 1080,
    deviceScaleFactor: screen.deviceScaleFactor || 1,
    isMobile: screen.isMobile || false,
    hasTouch: screen.hasTouch || false,
    colorDepth: screen.colorDepth || 24,
  };
}

/**
 * Получить User-Agent на основе данных устройства
 * @param {Object} deviceData - Данные устройства от клиента
 * @returns {String} User-Agent строка
 */
function getUserAgent(deviceData) {
  const browser = deviceData.browser || {};
  const os = deviceData.os || {};

  // Если есть данные браузера, используем их
  if (browser.userAgent) {
    return browser.userAgent;
  }

  // Генерируем User-Agent на основе OS
  const osName = os.platform || "Windows";
  const osVersion = os.version || "10";

  if (osName.toLowerCase().includes("windows")) {
    return `Mozilla/5.0 (Windows NT ${osVersion}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
  } else if (osName.toLowerCase().includes("mac")) {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${osVersion}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
  } else if (osName.toLowerCase().includes("linux")) {
    return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
  }

  // Fallback
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
}

/**
 * Запустить браузер с настройками пользователя
 * @param {Object} params - Параметры запуска
 * @param {Object} deviceData - Данные устройства
 * @returns {Object} Результат запуска браузера
 */
async function launchBrowser(params, deviceData) {
  const { url, wait_for } = params;
  const screenSettings = getScreenSettings(deviceData);
  const userAgent = getUserAgent(deviceData);

  console.log("🚀 Запуск Puppeteer браузера...");
  console.log("📱 Настройки экрана:", screenSettings);
  console.log("🌐 User-Agent:", userAgent);

  try {
    // Запускаем браузер
    const browser = await puppeteer.launch({
      headless: false, // Показываем браузер
      defaultViewport: null, // Используем настройки экрана
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        `--window-size=${screenSettings.width},${screenSettings.height}`,
        `--user-agent=${userAgent}`,
      ],
    });

    // Создаем новую страницу
    const page = await browser.newPage();

    // Устанавливаем viewport
    await page.setViewport({
      width: screenSettings.width,
      height: screenSettings.height,
      deviceScaleFactor: screenSettings.deviceScaleFactor,
      isMobile: screenSettings.isMobile,
      hasTouch: screenSettings.hasTouch,
    });

    // Устанавливаем User-Agent
    await page.setUserAgent(userAgent);

    // Устанавливаем дополнительные заголовки для x.com
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      DNT: "1",
      Connection: "keep-alive",
    });

    // Переходим на указанный URL (по умолчанию x.com)
    const targetUrl = url || "https://x.com";
    console.log(`🌐 Переход на URL: ${targetUrl}`);

    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Ждем загрузки указанного элемента или основного контента
    const waitSelector = wait_for || '[data-testid="primaryColumn"]';
    console.log(`⏳ Ожидание элемента: ${waitSelector}`);

    try {
      await page.waitForSelector(waitSelector, { timeout: 15000 });
      console.log("✅ Основной контент загружен");
    } catch (error) {
      console.log("⚠️ Основной элемент не найден, продолжаем...");
    }

    // Получаем информацию о странице
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        // Дополнительная информация для x.com
        isLoggedIn:
          document.querySelector(
            '[data-testid="SideNav_AccountSwitcher_Button"]'
          ) !== null,
        hasPrimaryColumn:
          document.querySelector('[data-testid="primaryColumn"]') !== null,
        hasSidebar:
          document.querySelector('[data-testid="sidebarColumn"]') !== null,
      };
    });

    console.log("✅ Браузер успешно запущен");
    console.log("📄 Информация о странице:", pageInfo);

    // Дополнительная информация для x.com
    if (
      pageInfo.url.includes("x.com") ||
      pageInfo.url.includes("twitter.com")
    ) {
      console.log(`🐦 Twitter/X.com статус:`);
      console.log(`   - Заголовок: ${pageInfo.title}`);
      console.log(`   - URL: ${pageInfo.url}`);
      console.log(`   - Авторизован: ${pageInfo.isLoggedIn ? "Да" : "Нет"}`);
      console.log(
        `   - Основная колонка: ${
          pageInfo.hasPrimaryColumn ? "Загружена" : "Не найдена"
        }`
      );
      console.log(
        `   - Боковая панель: ${
          pageInfo.hasSidebar ? "Загружена" : "Не найдена"
        }`
      );
    }

    return {
      success: true,
      browser: browser,
      page: page,
      pageInfo: pageInfo,
      screenSettings: screenSettings,
      userAgent: userAgent,
    };
  } catch (error) {
    console.error("❌ Ошибка запуска браузера:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Закрыть браузер
 * @param {Object} browser - Объект браузера
 */
async function closeBrowser(browser) {
  if (browser) {
    try {
      await browser.close();
      console.log("🔒 Браузер закрыт");
    } catch (error) {
      console.error("❌ Ошибка закрытия браузера:", error);
    }
  }
}

/**
 * Выполнить действие на странице
 * @param {Object} page - Объект страницы
 * @param {String} action - Действие для выполнения
 * @param {Object} params - Параметры действия
 */
async function performAction(page, action, params = {}) {
  try {
    switch (action) {
      case "click":
        await page.click(params.selector);
        console.log(`🖱️ Клик по элементу: ${params.selector}`);
        break;

      case "type":
        await page.type(params.selector, params.text);
        console.log(`⌨️ Ввод текста в элемент: ${params.selector}`);
        break;

      case "wait":
        await page.waitForSelector(params.selector, {
          timeout: params.timeout || 10000,
        });
        console.log(`⏳ Ожидание элемента: ${params.selector}`);
        break;

      case "screenshot":
        const screenshot = await page.screenshot({
          fullPage: params.fullPage || false,
          path: params.path || null,
        });
        console.log("📸 Скриншот сделан");
        return screenshot;

      case "evaluate":
        const result = await page.evaluate(params.function);
        console.log("🔍 Выполнена функция на странице");
        return result;

      default:
        throw new Error(`Неизвестное действие: ${action}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Ошибка выполнения действия ${action}:`, error);
    return { success: false, error: error.message };
  }
}

// Главная функция для выполнения скрипта
async function executeScript(params, deviceData) {
  try {
    console.log("🚀 Starting Puppeteer script execution...");
    console.log("📋 Parameters:", params);
    console.log("📱 Device data keys:", Object.keys(deviceData));

    // Запускаем браузер
    const result = await launchBrowser(params, deviceData);

    if (result.success) {
      console.log("✅ Puppeteer script executed successfully");
      return {
        success: true,
        message: "Puppeteer browser launched successfully",
        pageInfo: result.pageInfo,
        screenSettings: result.screenSettings,
        userAgent: result.userAgent,
        browser: "Puppeteer browser instance created",
      };
    } else {
      console.log("❌ Puppeteer script execution failed:", result.error);
      return {
        success: false,
        message: "Failed to launch Puppeteer browser",
        error: result.error,
      };
    }
  } catch (error) {
    console.error("❌ Script execution error:", error);
    return {
      success: false,
      message: "Script execution failed",
      error: error.message,
    };
  }
}

// Экспортируем главную функцию как entry point
module.exports = executeScript;

// Также экспортируем отдельные функции для совместимости
module.exports.launchBrowser = launchBrowser;
module.exports.closeBrowser = closeBrowser;
module.exports.performAction = performAction;
module.exports.getScreenSettings = getScreenSettings;
module.exports.getUserAgent = getUserAgent;
