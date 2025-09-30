# Scripts API Documentation

## Обзор

API для управления и выполнения скриптов в Twitter Automation Platform. Скрипты хранятся в папке `backend/scripts/` и автоматически загружаются при запуске сервера.

## Структура скрипта

Каждый скрипт должен содержать:

- `script.json` - конфигурация скрипта
- `index.js` - основной код скрипта
- `README.md` - документация (опционально)

## Endpoints

### GET /api/scripts/list

Получить список всех доступных скриптов.

**Query Parameters:**

- `category` (string, опционально) - фильтр по категории
- `tags` (string, опционально) - фильтр по тегам (через запятую)
- `include_config` (boolean, опционально) - включить полную конфигурацию

**Пример запроса:**

```bash
GET /api/scripts/list?category=browser&include_config=true
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "scripts": [
      {
        "id": "puppeteer-browser",
        "name": "Puppeteer Browser Launcher",
        "description": "Запускает Puppeteer браузер с настройками экрана пользователя",
        "version": "1.0.0",
        "author": "Twitter Automation Platform",
        "category": "browser",
        "tags": ["puppeteer", "browser", "automation"],
        "features": ["Автоматическое определение настроек экрана", "Stealth режим"],
        "loaded": true,
        "lastUsed": "2025-09-25T21:00:00.000Z"
      }
    ],
    "total": 1,
    "stats": {
      "total": 1,
      "loaded": 1,
      "categories": {
        "browser": 1
      },
      "lastUsed": [...]
    }
  }
}
```

### GET /api/scripts/[scriptId]

Получить информацию о конкретном скрипте.

**Параметры:**

- `scriptId` (string) - ID скрипта

**Пример запроса:**

```bash
GET /api/scripts/puppeteer-browser
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "id": "puppeteer-browser",
    "name": "Puppeteer Browser Launcher",
    "description": "Запускает Puppeteer браузер с настройками экрана пользователя",
    "version": "1.0.0",
    "author": "Twitter Automation Platform",
    "category": "browser",
    "tags": ["puppeteer", "browser", "automation"],
    "requirements": {
      "node_modules": [
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth"
      ],
      "permissions": ["browser", "screen", "network"]
    },
    "config": {
      "headless": false,
      "viewport": "auto",
      "user_agent": "auto",
      "stealth_mode": true
    },
    "features": ["Автоматическое определение настроек экрана", "Stealth режим"],
    "usage": {
      "description": "Скрипт автоматически определяет настройки экрана пользователя и запускает браузер с оптимальными параметрами",
      "parameters": {
        "url": {
          "type": "string",
          "required": true,
          "description": "URL для открытия в браузере"
        },
        "wait_for": {
          "type": "string",
          "required": false,
          "description": "Селектор элемента для ожидания загрузки"
        }
      }
    },
    "security": {
      "sandbox": true,
      "memory_limit": "512MB",
      "timeout": 30000,
      "allowed_domains": ["twitter.com", "x.com"]
    },
    "loaded": true,
    "lastUsed": "2025-09-25T21:00:00.000Z",
    "path": "/path/to/scripts/puppeteer-browser"
  }
}
```

### POST /api/scripts/execute

Выполнить скрипт.

**Тело запроса:**

```json
{
  "scriptId": "puppeteer-browser",
  "params": {
    "url": "https://twitter.com",
    "wait_for": "[data-testid=\"primaryColumn\"]"
  },
  "deviceData": {
    "screen": {
      "width": 1920,
      "height": 1080,
      "deviceScaleFactor": 1,
      "isMobile": false,
      "hasTouch": false,
      "colorDepth": 24
    },
    "os": {
      "platform": "Windows",
      "version": "10"
    },
    "browser": {
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }
}
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "script": {
      "id": "puppeteer-browser",
      "name": "Puppeteer Browser Launcher",
      "version": "1.0.0"
    },
    "result": {
      "success": true,
      "pageInfo": {
        "title": "Twitter",
        "url": "https://twitter.com",
        "viewport": {
          "width": 1920,
          "height": 1080
        },
        "userAgent": "Mozilla/5.0...",
        "language": "en-US",
        "platform": "Win32",
        "cookieEnabled": true,
        "onLine": true
      },
      "screenSettings": {
        "width": 1920,
        "height": 1080,
        "deviceScaleFactor": 1,
        "isMobile": false,
        "hasTouch": false,
        "colorDepth": 24
      },
      "userAgent": "Mozilla/5.0..."
    },
    "executedAt": "2025-09-25T21:00:00.000Z"
  }
}
```

### POST /api/scripts/test-puppeteer

Тестовый endpoint для запуска Puppeteer скрипта.

**Тело запроса:**

```json
{
  "url": "https://twitter.com",
  "wait_for": "[data-testid=\"primaryColumn\"]",
  "deviceData": {
    "screen": {
      "width": 1920,
      "height": 1080
    },
    "os": {
      "platform": "Windows",
      "version": "10"
    }
  }
}
```

## Создание нового скрипта

### 1. Создайте папку для скрипта

```bash
mkdir backend/scripts/my-script
```

### 2. Создайте script.json

```json
{
  "id": "my-script",
  "name": "My Script",
  "description": "Описание скрипта",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "automation",
  "tags": ["twitter", "automation"],
  "requirements": {
    "node_modules": ["some-package"],
    "permissions": ["network"]
  },
  "entry_point": "index.js",
  "config": {
    "timeout": 30000
  },
  "features": ["Feature 1", "Feature 2"],
  "usage": {
    "description": "Как использовать скрипт",
    "parameters": {
      "param1": {
        "type": "string",
        "required": true,
        "description": "Описание параметра"
      }
    }
  },
  "security": {
    "sandbox": true,
    "memory_limit": "256MB",
    "timeout": 30000,
    "allowed_domains": ["twitter.com"]
  }
}
```

### 3. Создайте index.js

```javascript
/**
 * Основной код скрипта
 * @param {Object} params - Параметры скрипта
 * @param {Object} deviceData - Данные устройства
 * @returns {Object} Результат выполнения
 */
module.exports = async function (params, deviceData) {
  try {
    // Ваш код здесь
    console.log("Выполнение скрипта с параметрами:", params);
    console.log("Данные устройства:", deviceData);

    // Возвращаем результат
    return {
      success: true,
      message: "Скрипт выполнен успешно",
      data: {
        // Ваши данные
      },
    };
  } catch (error) {
    console.error("Ошибка выполнения скрипта:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
```

## Безопасность

Все скрипты выполняются в sandbox режиме с ограничениями:

- Максимальное время выполнения: 30 секунд
- Ограничение памяти: 512MB
- Разрешенные домены: twitter.com, x.com
- Запрещены системные вызовы

## Примеры использования

### JavaScript (Frontend)

```javascript
// Получить список скриптов
const response = await fetch("/api/scripts/list");
const data = await response.json();

// Выполнить скрипт
const executeResponse = await fetch("/api/scripts/execute", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    scriptId: "puppeteer-browser",
    params: {
      url: "https://twitter.com",
      wait_for: '[data-testid="primaryColumn"]',
    },
    deviceData: session.deviceData,
  }),
});
```

### cURL

```bash
# Получить список скриптов
curl -X GET "http://localhost:3000/api/scripts/list"

# Выполнить скрипт
curl -X POST "http://localhost:3000/api/scripts/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "scriptId": "puppeteer-browser",
    "params": {
      "url": "https://twitter.com"
    },
    "deviceData": {
      "screen": { "width": 1920, "height": 1080 },
      "os": { "platform": "Windows", "version": "10" }
    }
  }'
```
