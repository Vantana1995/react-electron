/**
 * Twitter GM Commenter Script
 * Адаптирован для новой архитектуры - только логика выполнения
 * Все конфигурации приходят от клиента
 */

const fs = require('fs');
const path = require('path');

/**
 * Загрузить счетчик скриншотов для профиля
 */
function loadScreenshotCounter(saveImagesFolder, profileId) {
  if (!saveImagesFolder) return 1;

  const counterFile = path.join(saveImagesFolder, `screenshot_counter_${profileId}.json`);

  try {
    if (fs.existsSync(counterFile)) {
      const data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
      return data.counter || 1;
    }
  } catch (error) {
    console.error('Error loading screenshot counter:', error);
  }

  return 1;
}

/**
 * Сохранить счетчик скриншотов для профиля
 */
function saveScreenshotCounter(saveImagesFolder, profileId, counter) {
  if (!saveImagesFolder) return;

  const counterFile = path.join(saveImagesFolder, `screenshot_counter_${profileId}.json`);

  try {
    fs.writeFileSync(counterFile, JSON.stringify({ counter }));
  } catch (error) {
    console.error('Error saving screenshot counter:', error);
  }
}

/**
 * Загрузить список обработанных твитов для профиля
 */
function loadProcessedTweets(saveImagesFolder, profileId) {
  if (!saveImagesFolder) return new Set();

  const tweetsFile = path.join(saveImagesFolder, `processed_tweets_${profileId}.json`);

  try {
    if (fs.existsSync(tweetsFile)) {
      const data = JSON.parse(fs.readFileSync(tweetsFile, 'utf8'));
      return new Set(data.tweets || []);
    }
  } catch (error) {
    console.error('Error loading processed tweets:', error);
  }

  return new Set();
}

/**
 * Сохранить список обработанных твитов для профиля
 */
function saveProcessedTweets(saveImagesFolder, profileId, tweets) {
  if (!saveImagesFolder) return;

  const tweetsFile = path.join(saveImagesFolder, `processed_tweets_${profileId}.json`);

  try {
    fs.writeFileSync(tweetsFile, JSON.stringify({ tweets: Array.from(tweets) }));
  } catch (error) {
    console.error('Error saving processed tweets:', error);
  }
}

/**
 * Измерить расстояние до поля ввода комментария
 */
async function measureDistanceToCommentInput(page) {
  return await page.evaluate(() => {
    const inputField = document.querySelector('div[data-testid="tweetTextarea_0RichTextInputContainer"]');

    if (!inputField) {
      window.scrollBy({ top: 500, behavior: 'smooth' });
      return null;
    }

    const rect = inputField.getBoundingClientRect();
    const distanceFromTop = window.pageYOffset + rect.bottom;

    console.log(`📏 Поле ввода найдено на расстоянии ${distanceFromTop}px от верха страницы`);
    return distanceFromTop;
  });
}

/**
 * Вычислить оптимальную высоту viewport для скриншота
 */
async function calculateOptimalViewportHeight(page) {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const distance = await measureDistanceToCommentInput(page);

    if (distance !== null) {
      const optimalHeight = Math.round(Math.min(distance + 400, 3000));
      console.log(`🔧 Рассчитанная оптимальная высота вьюпорта: ${optimalHeight}px`);
      return optimalHeight;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  console.log('⚠️ Не удалось найти поле ввода, используем стандартную высоту');
  return 1080;
}

/**
 * Создать скриншот области контента Twitter
 */
async function captureTwitterContentScreenshot(page, screenshotPath) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      type: 'png',
    });

    console.log(`📸 Скриншот сохранен: ${screenshotPath}`);
  } catch (error) {
    console.error('Ошибка при создании скриншота:', error);
  }
}

async function executeScript(context) {
  const { page, browser, config, profile } = context;

  console.log('🚀 Starting Twitter GM Commenter');
  console.log('📋 Profile:', profile.name);
  console.log('⚙️ Config:', config);

  // Получаем конфигурацию из customData или используем дефолты
  const navigationUrl = config.navigationUrl || "https://x.com/search?q=(web3%20OR%20crypto%20OR%20ticker)%20AND%20(GM%20or%20%22good%20morning%22%20OR%20%22shill%22)%20-god%20-bot%20(include%3Anativeretweets%20(filter%3Aself_threads%20OR%20-filter%3Anativeretweets%20-filter%3Aretweets%20-filter%3Aquote%20-filter%3Areplies))%20filter%3Ablue_verified%20lang%3Aen&src=typed_query&f=live";

  const regexPattern = config.regexPattern || "\\b(crypto|web3|ticker|memecoin)\\b";

  // Получаем шаблоны комментариев напрямую как массив
  const commentTemplates = Array.isArray(config.commentTemplates)
    ? config.commentTemplates
    : [];

  const delayBetweenActions = config.delayBetweenActions || 2000;
  const maxWordCount = config.maxWordCount || 200;
  const notOlderThanHours = config.notOlderThanHours || 5; // Временное ограничение в часах
  const saveImagesFolder = config.saveImagesFolder || "";

  console.log(`⏱️ Time filter: Not older than ${notOlderThanHours} hours`);
  console.log(`💬 Comment templates loaded: ${commentTemplates.length} templates`);
  console.log(`📁 Save images folder: ${saveImagesFolder || 'Not set'}`);

  // Генерируем уникальный ID профиля из прокси
  const profileId = profile.proxy ? `${profile.proxy.ip}_${profile.proxy.port}` : 'default';

  // Загружаем обработанные твиты из файла для этого профиля
  const processedTweets = loadProcessedTweets(saveImagesFolder, profileId);
  console.log(`📋 Loaded ${processedTweets.size} processed tweets from file`);

  // Загружаем счетчик скриншотов для этого профиля
  let screenshotCounter = loadScreenshotCounter(saveImagesFolder, profileId);
  console.log(`📸 Screenshot counter initialized: ${screenshotCounter}`);

  // Навигация на целевую страницу
  await page.goto(navigationUrl, {
    waitUntil: "networkidle2",
  });

  console.log(`✅ Navigated to: ${navigationUrl}`);

  // Проверка на ошибки страницы
  const errorType = await checkPageErrors(page);
  if (errorType) {
    return {
      success: false,
      error: `Page error detected: ${errorType}`,
      errorType
    };
  }

  // Основной цикл обработки твитов
  let processedCount = 0;
  const maxScrolls = 10; // Максимум прокруток
  let scrollCount = 0;

  while (scrollCount < maxScrolls) {
    console.log(`📊 Обработано: ${processedCount}, Прокрутка: ${scrollCount}/${maxScrolls}`);

    // Поиск подходящих твитов
    const gmTweets = await page.evaluate((pattern, maxHours) => {
      const gmRegex = new RegExp(pattern, 'i');
      const tweets = Array.from(document.querySelectorAll("article"));
      const now = new Date();

      return tweets
        .map((tweet) => {
          const userDescription = tweet.closest('[data-testid="UserDescription"]');
          if (userDescription) return null;

          const tweetText = tweet.textContent || tweet.innerText;
          if (!gmRegex.test(tweetText)) return null;

          const timeElement = tweet.querySelector("time");
          if (!timeElement) return null;

          const datetime = timeElement.getAttribute("datetime");
          if (!datetime) return null;

          const tweetTime = new Date(datetime);
          const diffHours = (now - tweetTime) / (1000 * 60 * 60);
          if (diffHours > maxHours) return null;

          const tweetLink = tweet.querySelector('a[href*="/status/"]');
          const userLink = tweet.querySelector('a[href^="/"][role="link"]');
          if (!tweetLink || !userLink) return null;

          return {
            tweetUrl: tweetLink.href,
            userHref: userLink.getAttribute("href"),
            tweetText: tweetText.substring(0, 500) // Ограничиваем длину для передачи
          };
        })
        .filter(Boolean);
    }, regexPattern, notOlderThanHours);

    console.log(`🔍 Found ${gmTweets.length} matching tweets`);

    // Обработка найденных твитов
    for (const tweet of gmTweets) {
      if (processedTweets.has(tweet.tweetUrl)) {
        console.log(`⏭ Tweet ${tweet.tweetUrl} already processed`);
        continue;
      }

      // Подсчет слов в твите
      const wordCount = tweet.tweetText.split(/\s+/).length;
      if (wordCount > maxWordCount) {
        console.log(`📊 Tweet too long: ${wordCount} words (max ${maxWordCount}) - skipping`);
        continue;
      }

      console.log(`📝 Processing tweet (${wordCount} words): ${tweet.tweetUrl}`);

      // Обработка твита в отдельной вкладке
      const result = await processTweet(browser, tweet, commentTemplates, delayBetweenActions, {
        saveImagesFolder,
        screenshotCounter,
        profileId
      });

      if (result.success) {
        processedTweets.add(tweet.tweetUrl);
        processedCount++;

        // Сохраняем обработанный твит в файл
        saveProcessedTweets(saveImagesFolder, profileId, processedTweets);

        // Если скриншот был сделан, обновляем счетчик
        if (result.screenshotTaken) {
          screenshotCounter++;
          saveScreenshotCounter(saveImagesFolder, profileId, screenshotCounter);
        }

        console.log(`✅ Tweet processed successfully (total: ${processedCount})`);
      } else {
        console.log(`❌ Failed to process tweet: ${result.error}`);
      }

      // Задержка между действиями
      await delay(delayBetweenActions);
    }

    // Прокрутка страницы для загрузки новых твитов
    await page.evaluate(() => {
      window.scrollBy({ top: 1000, behavior: "smooth" });
    });

    await delay(2000);
    scrollCount++;
  }

  return {
    success: true,
    processedCount,
    totalTweets: processedTweets.size,
    processedTweets: Array.from(processedTweets)
  };
}

/**
 * Обработка одного твита в отдельной вкладке (двухэтапный процесс)
 */
async function processTweet(browser, tweet, commentTemplates, delayTime, screenshotOptions = {}) {
  let tempPage = null;
  let tweetPage = null;

  try {
    const { saveImagesFolder, screenshotCounter, profileId } = screenshotOptions;

    // ЭТАП 1: Временная страница для измерения оптимальной высоты
    console.log(`🔗 Opening tweet in temporary tab for measurement: ${tweet.tweetUrl}`);
    tempPage = await browser.newPage();
    await tempPage.setViewport({ width: 1920, height: 1080 });
    await tempPage.goto(tweet.tweetUrl, { waitUntil: "networkidle2" });

    // Проверка на ошибки
    const errorType = await checkPageErrors(tempPage);
    if (errorType) {
      return { success: false, error: `Page error: ${errorType}` };
    }

    // Ожидание загрузки твита
    await tempPage.waitForSelector("article", { timeout: 5000 });

    // Если нет шаблонов комментариев, только просмотр
    if (!commentTemplates || commentTemplates.length === 0) {
      console.log('ℹ️ No comment templates, skipping comment');
      return { success: true, action: 'viewed', screenshotTaken: false };
    }

    // Измеряем оптимальную высоту viewport для скриншота
    console.log('📏 Измеряем расстояние до поля ввода комментария...');
    const optimalHeight = await calculateOptimalViewportHeight(tempPage);

    // Закрываем временную страницу
    await tempPage.close();
    tempPage = null;

    // ЭТАП 2: Новая страница с оптимальной высотой для комментария и скриншота
    console.log(`🖥️ Opening tweet with optimal viewport height: ${optimalHeight}px`);
    tweetPage = await browser.newPage();
    await tweetPage.setViewport({ width: 1920, height: optimalHeight });
    await tweetPage.goto(tweet.tweetUrl, { waitUntil: "networkidle2" });

    await tweetPage.waitForSelector("article", { timeout: 5000 });

    // Выбор случайного комментария
    const randomComment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
    console.log(`💬 Comment: ${randomComment}`);

    // Поиск поля для ввода комментария
    const commentInput = await tweetPage.$('div[data-testid="tweetTextarea_0RichTextInputContainer"]');

    if (!commentInput) {
      console.log('❌ Comment input not found');
      return { success: false, error: 'Comment input not found' };
    }

    // Клик на поле ввода
    await commentInput.click();
    await delay(500);

    // Ввод текста комментария
    const textArea = await tweetPage.$('div[data-testid="tweetTextarea_0"]');
    if (!textArea) {
      return { success: false, error: 'Text area not found' };
    }

    await textArea.type(randomComment, { delay: 50 }); // Имитация человеческого набора
    await delay(delayTime);

    // Отправка комментария
    const sendButton = await tweetPage.$('button[data-testid="tweetButtonInline"]');
    if (!sendButton) {
      return { success: false, error: 'Send button not found' };
    }

    await sendButton.click();
    await delay(8000); // Ждем 8 секунд перед скриншотом (как в bot5.js)

    console.log('✅ Comment sent successfully');

    // Сохранение скриншота после успешного комментария
    let screenshotTaken = false;
    if (saveImagesFolder && screenshotCounter !== undefined) {
      try {
        // Вычисляем номер папки (100 скриншотов на папку)
        const folderNumber = Math.floor((screenshotCounter - 1) / 100) + 1;
        const folderName = `screenshots_${folderNumber}`;
        const folderPath = path.join(saveImagesFolder, folderName);

        // Создаем папку если не существует
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
          console.log(`📁 Создана новая папка: ${folderPath}`);
        }

        // Формируем путь к скриншоту
        const screenshotFileName = `${screenshotCounter}.png`;
        const screenshotPath = path.join(folderPath, screenshotFileName);

        // Делаем скриншот
        await captureTwitterContentScreenshot(tweetPage, screenshotPath);
        screenshotTaken = true;
      } catch (screenshotError) {
        console.error('Ошибка при создании скриншота:', screenshotError);
      }
    }

    return { success: true, action: 'commented', comment: randomComment, screenshotTaken };

  } catch (error) {
    console.error(`Error processing tweet ${tweet.tweetUrl}:`, error);
    return { success: false, error: error.message };
  } finally {
    // Закрываем обе вкладки
    if (tempPage && !tempPage.isClosed()) {
      try {
        await tempPage.close();
        console.log('🗙 Temporary measurement tab closed');
      } catch (closeError) {
        console.error('Error closing temp tab:', closeError);
      }
    }

    if (tweetPage && !tweetPage.isClosed()) {
      try {
        await tweetPage.close();
        console.log('🗙 Tweet tab closed');
      } catch (closeError) {
        console.error('Error closing tweet tab:', closeError);
      }
    }
  }
}

/**
 * Проверка ошибок на странице
 */
async function checkPageErrors(page) {
  return page.evaluate(() => {
    // Проверка на несуществующую страницу
    const errorElement = document.querySelector('[data-testid="error-detail"]');
    if (errorElement && errorElement.textContent.includes("Такой страницы не существует")) {
      return "page_not_found";
    }

    // Проверка на CAPTCHA
    const captchaIndicatorText = document.querySelector(".core-msg.spacer.spacer-top");
    const verifyingIndicator = document.querySelector(".spacer.loading-verifying");
    const challengeSuccess = document.querySelector("#challenge-success-text");

    if (captchaIndicatorText || verifyingIndicator || challengeSuccess) {
      return "captcha";
    }

    // Проверка на ограничение аккаунта
    const spans = Array.from(document.querySelectorAll("span"));
    if (spans.some((span) => {
      const isInSidebar = span.closest('[data-testid="sidebarColumn"]');
      return !isInSidebar && span.innerText.includes("Что-то пошло не так");
    })) {
      return "restricted";
    }

    return null;
  });
}

/**
 * Задержка
 */
function delay(ms) {
  const min = ms || 28985;
  const max = ms ? ms + 20000 : 47987;
  const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, randomDelay));
}

// Экспорт функции для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = executeScript;
}