/**
 * Twitter GM Commenter Script
 * Адаптирован для новой архитектуры - только логика выполнения
 * Все конфигурации приходят от клиента
 */

async function executeScript(context) {
  const { page, browser, config, profile } = context;

  console.log('🚀 Starting Twitter GM Commenter');
  console.log('📋 Profile:', profile.name);
  console.log('⚙️ Config:', config);

  // Получаем конфигурацию из customData или используем дефолты
  const navigationUrl = config.navigationUrl || "https://x.com/search?q=(web3%20OR%20crypto%20OR%20ticker)%20AND%20(GM%20or%20%22good%20morning%22%20OR%20%22shill%22)%20-god%20-bot%20(include%3Anativeretweets%20(filter%3Aself_threads%20OR%20-filter%3Anativeretweets%20-filter%3Aretweets%20-filter%3Aquote%20-filter%3Areplies))%20filter%3Ablue_verified%20lang%3Aen&src=typed_query&f=live";

  const regexPattern = config.regexPattern || "\\b(crypto|web3|ticker|memecoin)\\b";
  const commentTemplates = config.commentTemplates?.gm || [];
  const maxTweetsToProcess = config.maxTweetsToProcess || 5;
  const delayBetweenActions = config.delayBetweenActions || 2000;
  const maxWordCount = config.maxWordCount || 200;

  // Загружаем обработанные твиты из конфигурации или создаем новый Set
  const processedTweets = new Set(config.processedTweets || []);

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

  while (processedCount < maxTweetsToProcess && scrollCount < maxScrolls) {
    console.log(`📊 Обработано: ${processedCount}/${maxTweetsToProcess}, Прокрутка: ${scrollCount}/${maxScrolls}`);

    // Поиск подходящих твитов
    const gmTweets = await page.evaluate((pattern) => {
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
          if (diffHours > 5) return null;

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
    }, regexPattern);

    console.log(`🔍 Found ${gmTweets.length} matching tweets`);

    // Обработка найденных твитов
    for (const tweet of gmTweets) {
      if (processedCount >= maxTweetsToProcess) break;

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

      // Обработка твита
      const result = await processTweet(page, tweet, commentTemplates, delayBetweenActions);

      if (result.success) {
        processedTweets.add(tweet.tweetUrl);
        processedCount++;
        console.log(`✅ Tweet processed successfully (${processedCount}/${maxTweetsToProcess})`);
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
 * Обработка одного твита
 */
async function processTweet(page, tweet, commentTemplates, delayTime) {
  try {
    // Переход на страницу твита
    await page.goto(tweet.tweetUrl, { waitUntil: "networkidle2" });

    // Проверка на ошибки
    const errorType = await checkPageErrors(page);
    if (errorType) {
      return { success: false, error: `Page error: ${errorType}` };
    }

    // Ожидание загрузки твита
    await page.waitForSelector("article", { timeout: 5000 });

    // Если нет шаблонов комментариев, только лайк
    if (!commentTemplates || commentTemplates.length === 0) {
      console.log('ℹ️ No comment templates, skipping comment');
      return { success: true, action: 'viewed' };
    }

    // Выбор случайного комментария
    const randomComment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
    console.log(`💬 Comment: ${randomComment}`);

    // Поиск поля для ввода комментария
    const commentInput = await page.$('div[data-testid="tweetTextarea_0RichTextInputContainer"]');

    if (!commentInput) {
      console.log('❌ Comment input not found');
      return { success: false, error: 'Comment input not found' };
    }

    // Клик на поле ввода
    await commentInput.click();
    await delay(500);

    // Ввод текста комментария
    const textArea = await page.$('div[data-testid="tweetTextarea_0"]');
    if (!textArea) {
      return { success: false, error: 'Text area not found' };
    }

    await textArea.type(randomComment, { delay: 50 }); // Имитация человеческого набора
    await delay(delayTime);

    // Отправка комментария
    const sendButton = await page.$('button[data-testid="tweetButtonInline"]');
    if (!sendButton) {
      return { success: false, error: 'Send button not found' };
    }

    await sendButton.click();
    await delay(2000);

    console.log('✅ Comment sent successfully');

    return { success: true, action: 'commented', comment: randomComment };

  } catch (error) {
    console.error(`Error processing tweet ${tweet.tweetUrl}:`, error);
    return { success: false, error: error.message };
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