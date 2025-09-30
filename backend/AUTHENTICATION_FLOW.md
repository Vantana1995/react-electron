# Authentication Flow - Twitter Automation Platform

## Overview

Платформа использует **device fingerprinting** без паролей. Весь процесс аутентификации основан на уникальном отпечатке устройства.

## 🔄 Enhanced Authentication Flow with Double Hashing

### 🛡️ **Security Architecture**

Система использует **двухэтапное хеширование** для максимальной безопасности:

1. **Step 1**: `deviceFingerprint = SHA-256(salt + deviceData + salt)`
2. **Step 2**: `deviceHash = SHA-256(salt + deviceFingerprint + IP + nonce + salt)`

**Преимущества:**

- Атакующий видит данные устройства, но не знает алгоритм хеширования
- IP адрес добавляет привязку к местоположению
- Nonce предотвращает replay атаки
- Соль защищает от rainbow table атак

### 1. **Сбор данных устройства (Frontend)**

Electron приложение собирает данные об устройстве:

```javascript
const fingerprintData = {
  // Hardware
  cpu: {
    cores: navigator.hardwareConcurrency,
    architecture: process.arch,
    model: os.cpus()[0].model,
  },
  gpu: {
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
  },
  memory: {
    total: os.totalmem(),
  },

  // System
  os: {
    platform: os.platform(),
    version: os.release(),
    architecture: os.arch(),
  },
  screen: {
    width: screen.width,
    height: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
  },
  timezone: {
    offset: new Date().getTimezoneOffset(),
    name: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  language: navigator.languages,
  userAgent: navigator.userAgent,
};
```

### 2. **Генерация Device Hash (Backend) - Двухэтапный процесс**

#### **Временная генерация (для тестирования):**

```http
POST /api/auth/fingerprint
Content-Type: application/json

{
  "cpu": { ... },
  "gpu": { ... },
  "memory": { ... },
  "os": { ... },
  "screen": { ... },
  "timezone": { ... },
  "language": [...],
  "userAgent": "..."
}
```

**Ответ:**

```json
{
  "success": true,
  "data": {
    "deviceHash": "a1b2c3d4e5f6...", // Final hash (step 1 + step 2)
    "sessionToken": "eyJ0eXAiOiJKV1Q...",
    "expiresIn": 86400000,
    "debug": {
      "clientIP": "IP detected",
      "fingerprintLength": 64,
      "hashLength": 64
    }
  }
}
```

#### **Регистрация устройства:**

```http
POST /api/auth/register
Content-Type: application/json

{
  "cpu": { ... },
  "gpu": { ... },
  "memory": { ... },
  "os": { ... },
  "screen": { ... },
  "timezone": { ... },
  "language": [...],
  "userAgent": "...",
  "backupEmails": [
    "email1@example.com",
    "email2@example.com",
    "email3@example.com",
    "email4@example.com",
    "email5@example.com"
  ]
}
```

**Backend процесс:**

1. `deviceFingerprint = SHA-256(salt + deviceData + salt)`
2. `nonce = generateRandomNonce()` (6-digit number)
3. `clientIP = extractIP(request)`
4. `deviceHash = SHA-256(salt + deviceFingerprint + clientIP + nonce + salt)`
5. Сохранение в БД: `{deviceHash, deviceFingerprint, IP, nonce, emails}`

### 3. **Сохранение в приложении**

Frontend сохраняет:

- `deviceHash` - для всех запросов в header `X-Device-Hash`
- `sessionToken` - для авторизованных запросов в header `X-Session-Token`

### 4. **Верификация устройства**

```http
POST /api/auth/verify
X-Device-Hash: a1b2c3d4e5f6...
```

**Если устройство НЕ зарегистрировано:**

```json
{
  "success": false,
  "error": {
    "code": "DEVICE_NOT_REGISTERED",
    "message": "Device not found. Please register first."
  }
}
```

**Если устройство зарегистрировано:**

```json
{
  "success": true,
  "data": {
    "verified": true,
    "deviceHash": "a1b2c3d4e5f6...",
    "registeredAt": "2024-01-15T10:30:00Z",
    "lastActive": "2024-01-20T15:45:00Z",
    "backupEmailsCount": 3
  }
}
```

## 🛡️ Security Headers

### Middleware добавляет headers:

1. **x-device-hash** - оригинальный hash из запроса
2. **x-validated-device-hash** - hash из проверенного session token

API endpoints получают оба header'а для дополнительной проверки.

## 📋 API Endpoints по уровням доступа

### **Публичные** (без проверок):

- `POST /api/auth/fingerprint` - генерация device hash
- `GET /api/health` - статус сервера
- `GET /api/status` - информация о сервисе

### **Device Hash только** (middleware проверяет device hash):

- `POST /api/auth/verify` - проверка регистрации устройства
- `POST /api/auth/backup-emails` - управление backup emails

### **Полная авторизация** (device hash + session token):

- `GET /api/scripts/*` - доставка скриптов
- `POST /api/payments/*` - обработка платежей
- Все остальные защищенные endpoints

## 🔐 Session Token Structure

```javascript
// Payload
{
  "deviceHash": "a1b2c3d4e5f6...",
  "timestamp": 1705752300000,
  "random": "abc123def456..."
}

// Signature: HMAC-SHA256(payload, ENCRYPTION_KEY)
```

## ⚡ Quick Start Example

```javascript
// 1. Сбор fingerprint данных
const fingerprint = await collectDeviceFingerprint();

// 2. Генерация hash на сервере
const response = await fetch("/api/auth/fingerprint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(fingerprint),
});

const { deviceHash, sessionToken } = await response.json();

// 3. Сохранение для будущих запросов
localStorage.setItem("deviceHash", deviceHash);
localStorage.setItem("sessionToken", sessionToken);

// 4. Использование в запросах
fetch("/api/scripts/deliver", {
  headers: {
    "X-Device-Hash": deviceHash,
    "X-Session-Token": sessionToken,
  },
});
```

## 🚨 Important Notes

- **Device hash генерируется ТОЛЬКО на сервере** для безопасности
- **Session token** действует 24 часа
- **Никаких паролей** - только device fingerprinting
- **Backup emails** для восстановления доступа при смене устройства
