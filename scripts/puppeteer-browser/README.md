# Puppeteer Browser Launcher

## Описание

Скрипт для автоматического запуска Puppeteer браузера с настройками экрана пользователя. Автоматически определяет характеристики устройства и настраивает браузер для максимальной совместимости.

## Возможности

- 🖥️ Автоматическое определение настроек экрана
- 🕵️ Stealth режим для обхода детекции
- 🌐 Настройка viewport под устройство пользователя
- 🔄 Ротация User-Agent
- 🍪 Управление cookies и localStorage
- 📸 Создание скриншотов
- 🖱️ Выполнение действий на странице

## Использование

### Базовый запуск

```javascript
const { launchBrowser } = require("./index.js");

const result = await launchBrowser(
  {
    url: "https://twitter.com",
    wait_for: '[data-testid="primaryColumn"]',
  },
  deviceData
);
```

### Параметры

- `url` (string, обязательный) - URL для открытия
- `wait_for` (string, опциональный) - Селектор элемента для ожидания

### Доступные действия

```javascript
const { performAction } = require("./index.js");

// Клик по элементу
await performAction(page, "click", { selector: "#button" });

// Ввод текста
await performAction(page, "type", { selector: "#input", text: "Hello" });

// Ожидание элемента
await performAction(page, "wait", { selector: "#content" });

// Скриншот
const screenshot = await performAction(page, "screenshot", { fullPage: true });

// Выполнение функции на странице
const result = await performAction(page, "evaluate", {
  function: () => document.title,
});
```

## Настройки экрана

Скрипт автоматически определяет следующие параметры:

- Ширина и высота экрана
- Масштаб (deviceScaleFactor)
- Мобильное устройство (isMobile)
- Поддержка touch (hasTouch)
- Глубина цвета (colorDepth)

## User-Agent

Автоматически генерируется на основе:

- Операционной системы
- Версии ОС
- Архитектуры процессора

## Безопасность

- Sandbox режим включен
- Ограничение памяти: 512MB
- Таймаут: 30 секунд
- Разрешенные домены: twitter.com, x.com

## Требования

- Node.js 16+
- puppeteer
- puppeteer-extra
- puppeteer-extra-plugin-stealth

## Примеры использования

### Запуск браузера для Twitter

```javascript
const deviceData = {
  screen: { width: 1920, height: 1080 },
  os: { platform: "Windows", version: "10" },
  browser: { userAgent: "Mozilla/5.0..." },
};

const result = await launchBrowser(
  {
    url: "https://twitter.com",
    wait_for: '[data-testid="primaryColumn"]',
  },
  deviceData
);

if (result.success) {
  console.log("Браузер запущен:", result.pageInfo);

  // Выполняем действия
  await performAction(result.page, "click", {
    selector: '[data-testid="SideNav_NewTweet_Button"]',
  });

  // Закрываем браузер
  await closeBrowser(result.browser);
}
```

### Создание скриншота

```javascript
const result = await launchBrowser(
  {
    url: "https://twitter.com",
  },
  deviceData
);

if (result.success) {
  const screenshot = await performAction(result.page, "screenshot", {
    fullPage: true,
    path: "./screenshot.png",
  });

  await closeBrowser(result.browser);
}
```
