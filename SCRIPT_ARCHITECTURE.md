# 🏗️ Архитектура выполнения скриптов

## Разделение ответственности

### 🖥️ Клиент (Electron Main Process)
**Файл**: `electron/main.ts` - функция `launchBrowserWithProfile()`

**Ответственность**:
- Запуск Puppeteer браузера
- Применение настроек профиля (прокси, куки)
- Настройка headless/non-headless режима
- Управление вьюпортом
- Аутентификация прокси
- Очистка кеша
- Установка куков из профиля

**Код**:
```javascript
async function launchBrowserWithProfile() {
  const browserArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ];

  if (profile.proxy) {
    browserArgs.push(`--proxy-server=${profile.proxy}`);
  }

  if (!headlessMode) {
    browserArgs.push("--start-maximized");
  }

  const browser = await puppeteer.launch({
    headless: headlessMode,
    args: browserArgs,
    userDataDir: `./puppeteer_profile_${profile.id}`,
  });

  // ... установка прокси, куков, viewport
}
```

---

### ☁️ Сервер (IPFS/Backend)
**Файл**: `backend/scripts/twitter-gm-commenter.js`

**Ответственность**:
- ТОЛЬКО логика выполнения скрипта
- Взаимодействие с Twitter
- Поиск твитов
- Комментирование
- Обработка ошибок

**Код**:
```javascript
async function executeScript(context) {
  const { page, browser, config, profile } = context;

  // Используем конфигурацию от клиента
  const navigationUrl = config.navigationUrl || "https://x.com";
  const regexPattern = config.regexPattern || "\\b(crypto|web3)\\b";
  const commentTemplates = config.commentTemplates?.gm || [];

  // Навигация
  await page.goto(navigationUrl, { waitUntil: "networkidle2" });

  // Логика поиска и обработки твитов
  // ...
}
```

---

## 📦 Структура данных

### 1. Профиль пользователя
```typescript
interface UserProfile {
  id: string;
  name: string;
  proxy: string;              // "username:password@host:port" или "host:port"
  cookies: ProfileCookie[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

**Пример**:
```json
{
  "id": "uuid-123",
  "name": "Profile 1",
  "proxy": "user324168:8q3c5a@93.127.154.112:8602",
  "cookies": [...],
  "isActive": true
}
```

---

### 2. Custom Data (JSON конфигурация)
```typescript
interface ScriptConfig {
  navigationUrl?: string;
  regexPattern?: string;
  commentTemplates?: {
    gm?: string[];
    reactions?: string[];
  };
  maxTweetsToProcess?: number;
  delayBetweenActions?: number;
  maxWordCount?: number;
  processedTweets?: string[];
}
```

**Пример** (вставляется в поле "Custom JSON Data"):
```json
{
  "navigationUrl": "https://x.com/search?q=(web3%20OR%20crypto)...",
  "regexPattern": "\\b(crypto|web3|ticker|memecoin)\\b",
  "commentTemplates": {
    "gm": [
      "gmski fren, TGIF - #MORICOIN weekend vibes incoming",
      "good morning legend, Friday feels and #MORICOIN weekend reels"
    ]
  },
  "maxTweetsToProcess": 5,
  "delayBetweenActions": 3000,
  "maxWordCount": 200
}
```

---

## 🔄 Поток выполнения

### Шаг 1: Пользователь настраивает выполнение
1. Выбирает профиль с прокси и куками
2. Выбирает headless/non-headless режим
3. Вводит Custom JSON Data (URL, regex, комментарии)
4. Нажимает "Execute Script"

### Шаг 2: Данные отправляются в Electron Main
```javascript
window.electronAPI.executeScript({
  script: {
    name: "Twitter GM Commenter",
    content: "async function executeScript(context) { ... }"
  },
  settings: {
    profile: { id, name, proxy, cookies },
    customData: "{ navigationUrl: ..., regexPattern: ... }",
    headless: true
  },
  nftData: { ... }
});
```

### Шаг 3: Main Process запускает браузер
```javascript
// electron/main.ts
const { browser, page } = await launchBrowserWithProfile();

// Парсим customData
const config = JSON.parse(customData);

// Передаем контекст в серверный скрипт
const context = { page, browser, config, profile };
```

### Шаг 4: Выполнение серверного скрипта
```javascript
// Серверный скрипт получает готовый контекст
async function executeScript(context) {
  const { page, config } = context;

  // Использует конфигурацию от клиента
  await page.goto(config.navigationUrl);

  // Ищет твиты по regex от клиента
  const tweets = await findTweets(config.regexPattern);

  // Комментирует используя шаблоны от клиента
  await commentTweet(config.commentTemplates.gm);
}
```

---

## 🎯 Преимущества новой архитектуры

### ✅ Гибкость
- Пользователи могут менять URL, regex, комментарии без изменения кода
- Один скрипт работает с разными конфигурациями

### ✅ Безопасность
- Прокси и куки хранятся только на клиенте
- Сервер не знает о приватных данных пользователя

### ✅ Масштабируемость
- Легко добавлять новые параметры в customData
- Серверный скрипт остается чистым и простым

### ✅ Переиспользование
- Один скрипт может работать для разных задач
- Конфигурация определяет поведение

---

## 📝 Как писать серверные скрипты

### Правило 1: Никаких хардкодов
❌ **Плохо**:
```javascript
const proxy = "93.127.154.112:8602";
const url = "https://x.com/search?q=crypto";
```

✅ **Хорошо**:
```javascript
const url = config.navigationUrl || "https://x.com";
const regex = config.regexPattern || "\\b(crypto)\\b";
```

### Правило 2: Всё из конфига
```javascript
async function executeScript(context) {
  const { page, config, profile } = context;

  // Все настройки из config
  const url = config.navigationUrl;
  const templates = config.commentTemplates?.gm || [];
  const maxTweets = config.maxTweetsToProcess || 5;
}
```

### Правило 3: Возвращайте результат
```javascript
return {
  success: true,
  processedCount: 5,
  totalTweets: 10,
  errors: []
};
```

---

## 🚀 Примеры использования

### Пример 1: Базовый поиск без комментариев
```json
{
  "navigationUrl": "https://x.com",
  "regexPattern": "\\b(crypto|web3)\\b",
  "commentTemplates": {},
  "maxTweetsToProcess": 10
}
```

### Пример 2: Комментирование GM твитов
```json
{
  "navigationUrl": "https://x.com/search?q=gm",
  "regexPattern": "\\b(gm|good morning)\\b",
  "commentTemplates": {
    "gm": ["GM! ☀️", "Good morning! 🌅"]
  },
  "maxTweetsToProcess": 5,
  "delayBetweenActions": 3000
}
```

### Пример 3: Поиск по сложному запросу
```json
{
  "navigationUrl": "https://x.com/search?q=(web3%20OR%20crypto)%20filter%3Ablue_verified",
  "regexPattern": "\\b(crypto|web3|ticker|memecoin|nft)\\b",
  "commentTemplates": {
    "gm": ["Interesting! 🚀", "Great project! 💎"]
  },
  "maxTweetsToProcess": 3,
  "maxWordCount": 150
}
```

---

## 🔧 Расширение системы

### Добавление новых параметров

1. **Обновите интерфейс** в `types/index.ts`:
```typescript
interface ScriptConfig {
  // ... существующие
  newParameter?: string;
}
```

2. **Используйте в скрипте**:
```javascript
const newParam = config.newParameter || "default";
```

3. **Добавьте в UI** (опционально):
- Новое поле в NFTDisplay
- Или просто через JSON в customData

---

## 📊 Мониторинг выполнения

Скрипты возвращают детальную информацию:
```javascript
{
  success: true,
  processedCount: 5,
  totalTweets: 10,
  processedTweets: ["url1", "url2", ...],
  errors: []
}
```

Это позволяет:
- Отслеживать прогресс
- Сохранять состояние между запусками
- Избегать дубликатов
- Показывать статистику пользователю