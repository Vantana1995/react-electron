# 🚀 Quick Start - Twitter Automation Platform

## ⚡ **Быстрый запуск для тестирования:**

### **Terminal 1 - Backend API:**

```bash
cd backend
npm run dev
# ✅ API Server: http://localhost:3000
```

### **Terminal 2 - Frontend Interface:**

```bash
cd frontend
npm start
# ✅ Frontend: http://localhost:3001
```

### **Terminal 3 - Callback Server:**

```bash
cd frontend
npm run callback
# ✅ Callbacks: http://localhost:8080
```

### **Browser:**

```
http://localhost:3001
```

## 🔧 **Что происходит:**

### **1. Сбор данных устройства:**

- Frontend собирает реальные данные браузера
- CPU cores, GPU info, Memory, OS platform
- Nonce генерируется на основе connection count из cache

### **2. Подключение к серверу:**

- Frontend → Backend: device data + nonce
- Backend: генерирует 3-step device hash
- Backend → Frontend: deviceHash + sessionToken

### **3. Регистрация для callbacks:**

- Frontend регистрируется для получения server callbacks
- Callback server получает session data
- Backend начинает отправлять ping'и каждые 30 сек

### **4. Реальная проверка подключения:**

- Backend → Callback Server: verification hash + instruction
- Callback Server: проверяет hash используя device data
- Callback Server → Backend: подтверждение
- Если нет ответа 40 сек - автоотключение

## 🔐 **Упрощенные ключи для тестов:**

```bash
# В .env файле
ENCRYPTION_KEY=1111111111111111111111111111111111111111111111111111111111111111
FINGERPRINT_SALT=0000000000000000000000000000000000000000000000000000000000000000
```

## 📊 **Что видно в интерфейсе:**

### **Device Information:**

- Реальные данные браузера/системы
- CPU model, cores, GPU renderer, vendor
- Memory total, OS platform

### **Security Keys:**

- Connection Count (из localStorage cache)
- Current Nonce (на основе connection count)
- Device Hash (сгенерированный сервером)
- Session Token (JWT-подобный токен)

### **Connection Log:**

- Реальные события подключения
- Статус server callbacks
- Ошибки и предупреждения

## ⚠️ **Важно:**

1. **Все 3 сервера должны работать** одновременно
2. **Callback server** получает реальные вызовы от backend
3. **Никаких симуляций** - только реальная связь
4. **Connection timeout 40 сек** - реальный, не симулированный
5. **Nonce management** через localStorage cache

## 🎯 **Ожидаемое поведение:**

1. ✅ Device info собирается автоматически
2. ✅ Connection count читается из cache
3. ✅ Nonce = connectionCount + 1
4. ✅ Подключение к backend успешно
5. ✅ Регистрация для callbacks
6. ✅ Каждые 30 сек реальные ping'и от backend
7. ✅ При отключении backend - frontend отключается через 40 сек

**Теперь система работает с реальными данными без заглушек!** 🎉
