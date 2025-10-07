# Dynamic NFT Listeners System

## Обзор

Система динамических NFT слушателей автоматически управляет блокчейн слушателями для NFT контрактов на основе активных скриптов в базе данных. Вместо жестко закодированного контракта, система динамически добавляет и удаляет слушатели по мере изменения скриптов.

## Архитектура

### Компоненты

1. **DynamicNFTListenerManager** - Основной менеджер, управляющий всеми слушателями
2. **NFTContractListener** - Индивидуальный слушатель для каждого NFT контракта
3. **Admin API** - API для управления и мониторинга слушателей
4. **Auto-refresh** - Автоматическое обновление при изменении скриптов

### Поток данных

```
Admin добавляет скрипт с NFT адресами
    ↓
API автоматически вызывает forceRefresh()
    ↓
DynamicNFTListenerManager сканирует активные скрипты
    ↓
Запускает слушатели для новых NFT контрактов
    ↓
Слушатели отслеживают Transfer события (минты)
    ↓
При минте вызывается handleNFTMint()
    ↓
Обновляется подписка пользователя
```

## API Endpoints

### 1. Управление NFT слушателями

#### GET /api/admin/nft-contracts

Получить статус всех NFT слушателей

**Ответ:**

```json
{
  "success": true,
  "data": {
    "manager": {
      "isRunning": true,
      "totalListeners": 3,
      "activeListeners": 2,
      "listeners": [...]
    },
    "summary": {
      "totalContracts": 3,
      "activeListeners": 2,
      "inactiveListeners": 1
    }
  }
}
```

#### POST /api/admin/nft-contracts/refresh

Управление слушателями

**Тело запроса:**

```json
{
  "action": "refresh" // или "start", "stop"
}
```

#### PUT /api/admin/nft-contracts/contracts

Получить список всех NFT контрактов с их скриптами

**Ответ:**

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "contractAddress": "0x1234...",
        "scriptCount": 2,
        "scriptNames": ["Script 1", "Script 2"],
        "scripts": [...],
        "listener": {
          "isListening": true,
          "uptime": 3600,
          "lastEventAt": "2024-01-01T12:00:00Z"
        }
      }
    ]
  }
}
```

### 2. Обновленные скрипты API

#### POST /api/admin/scripts/add

Добавление скрипта с автоматическим запуском слушателей

**Новое поле в ответе:**

```json
{
  "success": true,
  "data": {
    "message": "Script added successfully",
    "script": {...},
    "nftListenersRefreshed": true
  }
}
```

#### PUT /api/admin/scripts/add

Обновление скрипта с автоматическим обновлением слушателей

### 3. Системная статистика

#### GET /api/admin/system-stats

Теперь включает информацию о NFT слушателях

**Новое поле в ответе:**

```json
{
  "success": true,
  "data": {
    "system": {...},
    "nftContracts": [...],
    "nftListeners": {
      "isRunning": true,
      "totalListeners": 3,
      "activeListeners": 2,
      "listeners": [...]
    }
  }
}
```

## Конфигурация

### Переменные окружения

```env
# WebSocket URL для Alchemy (уже настроено)
ALCHEMY_WSS_URL=wss://eth-sepolia.g.alchemy.com/v2/...

# Admin IP адреса
ADMIN_IPS=127.0.0.1,::1,your-admin-ip
```

### Настройки слушателей

```typescript
// В DynamicNFTListenerManager
private readonly REFRESH_INTERVAL = 60000; // 1 минута
private readonly MAX_RECONNECT_ATTEMPTS = 10;
private readonly RECONNECT_DELAY = 5000; // 5 секунд
```

## Мониторинг

### Статус слушателя

```typescript
interface ListenerStatus {
  contractAddress: string;
  isListening: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  uptime: number; // секунды
  lastEventAt: Date | null;
}
```

### Логи

Система выводит подробные логи:

```
🎨 Dynamic NFT Listener Manager initialized
🚀 Starting Dynamic NFT Listener Manager...
🔄 Refreshing NFT listeners based on active scripts...
📋 Found 3 unique NFT contract(s) in active scripts
🎧 Starting listener for contract: 0x1234...
✅ Listener started for contract: 0x1234...
🎉 NFT MINT EVENT DETECTED for 0x1234!
```

## Автоматическое управление

### При добавлении скрипта

1. Админ добавляет скрипт с `nft_addresses`
2. API автоматически вызывает `forceRefresh()`
3. Менеджер сканирует все активные скрипты
4. Запускает слушатели для новых NFT контрактов

### При удалении скрипта

1. Скрипт деактивируется или удаляется
2. При следующем refresh (каждую минуту)
3. Менеджер останавливает слушатели для неиспользуемых контрактов

### Переподключение

- Автоматическое переподключение при ошибках WebSocket
- Максимум 10 попыток с экспоненциальной задержкой
- Логирование всех ошибок

## Использование

### 1. Запуск системы

Система автоматически запускается при старте сервера через `instrumentation.ts`.

### 2. Добавление NFT контракта

```bash
# Добавить скрипт с NFT адресами
curl -X POST http://localhost:3000/api/admin/scripts/add \
  -H "Content-Type: application/json" \
  -d '{
    "script_id": "my-script",
    "name": "My Script",
    "version": "1.0.0",
    "script_content": "console.log(\"Hello\");",
    "nft_addresses": ["0x1234567890123456789012345678901234567890"]
  }'
```

### 3. Мониторинг слушателей

```bash
# Получить статус всех слушателей
curl http://localhost:3000/api/admin/nft-contracts

# Принудительно обновить слушатели
curl -X POST http://localhost:3000/api/admin/nft-contracts/refresh \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh"}'
```

### 4. Системная статистика

```bash
# Получить полную статистику системы
curl http://localhost:3000/api/admin/system-stats
```

## Преимущества новой системы

1. **Динамичность** - Автоматическое управление слушателями
2. **Масштабируемость** - Поддержка множественных NFT контрактов
3. **Надежность** - Автоматическое переподключение
4. **Мониторинг** - Подробная статистика и логи
5. **Простота** - Автоматическая интеграция с существующими API

## Миграция

Старый `nft-event-listener.ts` больше не используется. Система автоматически переключилась на новый `DynamicNFTListenerManager`.

Все существующие скрипты с NFT адресами будут автоматически обработаны при следующем refresh.

## Устранение неполадок

### Слушатель не запускается

1. Проверьте логи сервера
2. Убедитесь, что NFT адрес корректный
3. Проверьте WebSocket соединение
4. Используйте API для принудительного refresh

### События не обрабатываются

1. Проверьте статус слушателя через API
2. Убедитесь, что контракт поддерживает Transfer события
3. Проверьте, что события минта (from = 0x0)

### Высокое потребление ресурсов

1. Система автоматически останавливает неиспользуемые слушатели
2. Каждую минуту происходит cleanup
3. Можно вручную остановить менеджер через API
