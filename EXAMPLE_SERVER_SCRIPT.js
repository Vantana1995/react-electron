/**
 * Example Server-Side Script
 * This script contains ONLY the execution logic
 * All configurations come from the client side
 */

async function executeScript(context) {
  const { page, browser, config, profile } = context;

  console.log('📜 Script started with config:', config);

  // Навигация на URL из конфига (или дефолтный Twitter)
  await page.goto(config.navigationUrl, {
    waitUntil: "networkidle2",
  });

  console.log(`✅ Navigated to: ${config.navigationUrl}`);

  // Ожидание загрузки страницы
  await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 10000 });

  // Используем regex из конфига
  const regexPattern = new RegExp(config.regexPattern, 'i');

  // Извлечение твитов с использованием regex из конфига
  const gmTweets = await page.evaluate((pattern) => {
    const gmRegex = new RegExp(pattern, 'i');
    const tweets = [];

    // Находим все твиты на странице
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');

    tweetElements.forEach((tweet) => {
      const textElement = tweet.querySelector('[data-testid="tweetText"]');
      if (textElement && gmRegex.test(textElement.textContent)) {
        tweets.push({
          text: textElement.textContent,
          element: tweet
        });
      }
    });

    return tweets;
  }, config.regexPattern);

  console.log(`🔍 Found ${gmTweets.length} matching tweets`);

  // Если есть шаблоны комментариев, используем их
  if (config.commentTemplates && config.commentTemplates.gm && config.commentTemplates.gm.length > 0) {
    const templates = config.commentTemplates.gm;
    const randomComment = templates[Math.floor(Math.random() * templates.length)];

    console.log(`💬 Would comment with: ${randomComment}`);

    // Здесь логика комментирования твитов
    // for (let i = 0; i < Math.min(gmTweets.length, 3); i++) {
    //   // Логика клика и комментирования
    // }
  } else {
    console.log('ℹ️ No comment templates provided, skipping comments');
  }

  // Возвращаем результат
  return {
    success: true,
    tweetsFound: gmTweets.length,
    profile: profile.name,
    timestamp: Date.now()
  };
}

// Экспортируем функцию для использования в main.ts
// В контексте eval это будет доступно как глобальная функция
if (typeof module !== 'undefined' && module.exports) {
  module.exports = executeScript;
}