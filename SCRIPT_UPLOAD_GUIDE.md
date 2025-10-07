# 📤 Script Upload Utility - User Guide

## Overview

`upload-script.js` - это CLI утилита для загрузки automation скриптов на backend сервер. Скрипт автоматически читает метаданные и код, форматирует данные и отправляет на API.

## Prerequisites

1. **Backend сервер должен быть запущен:**

   ```bash
   cd backend
   npm run dev
   # Сервер должен быть доступен на http://localhost:3000
   ```

2. **Структура скрипта:**
   ```
   script-folder/
   ├── script.json   # Метаданные и конфигурация
   └── index.js      # Код скрипта
   ```

## Usage

### 1. Загрузка скрипта из папки (рекомендуемый способ)

```bash
node upload-script.js ./backend/scripts/twitter-gm-commenter
```

### 2. Загрузка с явным указанием файлов

```bash
node upload-script.js --json ./path/to/script.json --code ./path/to/index.js
```

### 3. Обновление существующего скрипта

```bash
node upload-script.js ./backend/scripts/twitter-gm-commenter --update
```

### 4. Просмотр справки

```bash
node upload-script.js --help
```

## Command Line Options

| Option          | Short | Description                  |
| --------------- | ----- | ---------------------------- |
| `<folder-path>` | -     | Путь к папке со скриптом     |
| `--json <path>` | `-j`  | Путь к script.json           |
| `--code <path>` | `-c`  | Путь к index.js              |
| `--update`      | `-u`  | Обновить существующий скрипт |
| `--help`        | `-h`  | Показать справку             |

## Environment Variables

Скрипт поддерживает настройку через переменные окружения:

```bash
# Изменить хост API
export API_HOST=192.168.1.100
export API_PORT=3000

# Затем запустить скрипт
node upload-script.js ./backend/scripts/twitter-gm-commenter
```

## Script.json Format

Скрипт ожидает следующую структуру `script.json`:

```json
{
  "id": "twitter-gm-commenter",
  "name": "Twitter GM Auto Commenter",
  "description": "Description of the script",
  "version": "2.0.0",
  "author": "Your Name",
  "category": "twitter",
  "tags": ["twitter", "automation"],
  "entry_point": "index.js",
  "nft_addresses": [],
  "requirements": {
    "node_modules": ["puppeteer"],
    "permissions": ["browser"]
  },
  "config": {
    "headless": true,
    "stealth_mode": true
  },
  "features": ["Feature 1", "Feature 2"],
  "usage": {},
  "security": {},
  "examples": {},
  "error_handling": {},
  "changelog": {}
}
```

### Required Fields

- ✅ `id` - Уникальный идентификатор скрипта
- ✅ `name` - Название скрипта
- ✅ `version` - Версия (semver формат)

### Optional Fields

- `description` - Описание скрипта
- `category` - Категория
- `nft_addresses` - Массив NFT адресов (пустой = публичный скрипт)
- `config` - Конфигурация JSONB
- `metadata` - Дополнительные метаданные

## NFT Access Control

### Public Scripts (доступны всем)

```json
{
  "nft_addresses": []
}
```

### NFT-Gated Scripts (только для NFT холдеров)

```json
{
  "nft_addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x1234567890123456789012345678901234567890"
  ]
}
```

## Output Examples

### Success Response

```
============================================
🚀 Script Upload Utility
============================================

ℹ️  INFO: Reading script from folder: d:\Twitter app\backend\scripts\twitter-gm-commenter
ℹ️  INFO: Building API payload...
✅ SUCCESS: Payload validated successfully

Script Summary:
  Script ID: twitter-gm-commenter
  Name: Twitter GM Auto Commenter
  Version: 2.0.0
  Category: twitter
  Code Length: 15234 characters
  NFT Addresses: Public (Free)
  Action: CREATE

ℹ️  INFO: Sending POST request to http://localhost:3000/api/admin/scripts/add

============================================
API Response
============================================

✅ SUCCESS: Status: 200
✅ SUCCESS: Script uploaded successfully!

Script Details:
  ID: twitter-gm-commenter
  Name: Twitter GM Auto Commenter
  Version: 2.0.0
  Category: twitter
  Active: Yes
  Access: Public (Free)

============================================
```

### Error Response - Script Already Exists

```
❌ ERROR: Status: 400
❌ ERROR: Code: SCRIPT_EXISTS
❌ ERROR: Message: Script with ID twitter-gm-commenter already exists. Use update endpoint to modify.

💡 TIP: Use --update flag to update existing script:
node upload-script.js ./backend/scripts/twitter-gm-commenter --update
```

### Error Response - Backend Not Running

```
❌ ERROR: Network error: connect ECONNREFUSED 127.0.0.1:3000
ℹ️  INFO: Make sure the backend server is running
```

## Common Issues & Solutions

### 1. Backend not running

```bash
# Ошибка: Network error: connect ECONNREFUSED
# Решение: Запустите backend сервер
cd backend
npm run dev
```

### 2. Admin IP not whitelisted

```bash
# Ошибка: This endpoint is restricted to admin IPs
# Решение: Добавьте ваш IP в backend/.env
ADMIN_IPS=127.0.0.1,::1,localhost,YOUR_IP_HERE
```

### 3. Script already exists

```bash
# Ошибка: Script with ID xxx already exists
# Решение: Используйте флаг --update
node upload-script.js ./path/to/script --update
```

### 4. Invalid file paths

```bash
# Ошибка: File not found
# Решение: Проверьте правильность пути (используйте относительные или абсолютные пути)
node upload-script.js ./backend/scripts/twitter-gm-commenter
```

## Workflow Examples

### Adding a New Script

1. Создайте папку для скрипта:

   ```bash
   mkdir -p backend/scripts/my-new-script
   ```

2. Создайте `script.json`:

   ```json
   {
     "id": "my-new-script",
     "name": "My New Script",
     "version": "1.0.0",
     "nft_addresses": []
   }
   ```

3. Создайте `index.js` с кодом скрипта

4. Загрузите на сервер:
   ```bash
   node upload-script.js ./backend/scripts/my-new-script
   ```

### Updating an Existing Script

1. Измените код в `index.js` или метаданные в `script.json`

2. Обновите версию в `script.json`:

   ```json
   {
     "version": "1.1.0"
   }
   ```

3. Загрузите обновление:
   ```bash
   node upload-script.js ./backend/scripts/my-script --update
   ```

## API Integration

Скрипт использует следующие API endpoints:

- **POST** `/api/admin/scripts/add` - Создание нового скрипта
- **PUT** `/api/admin/scripts/add` - Обновление существующего скрипта

### API Payload Format

```json
{
  "script_id": "twitter-gm-commenter",
  "name": "Twitter GM Auto Commenter",
  "description": "Script description",
  "version": "2.0.0",
  "script_content": "// Full script code here",
  "category": "twitter",
  "nft_addresses": [],
  "config": {},
  "metadata": {
    "author": "Author Name",
    "tags": [],
    "requirements": {},
    "features": [],
    "usage": {},
    "security": {},
    "examples": {},
    "error_handling": {},
    "changelog": {}
  }
}
```

## Debugging

Для детальной отладки можно использовать curl напрямую:

```bash
# Проверить доступность API
curl http://localhost:3000/api/admin/scripts/add

# Отправить тестовый запрос
curl -X POST http://localhost:3000/api/admin/scripts/add \
  -H "Content-Type: application/json" \
  -d '{"script_id":"test","name":"Test","version":"1.0.0","script_content":"console.log(\"test\")"}'
```

## Security Notes

1. **Admin IP Whitelist**: Убедитесь, что ваш IP в `ADMIN_IPS` в `.env`
2. **NFT Addresses**: Используйте валидные Ethereum адреса (0x + 40 hex символов)
3. **Script Content**: Скрипты выполняются на клиенте - избегайте вредоносного кода
4. **Rate Limiting**: API может иметь ограничения по количеству запросов

## Advanced Usage

### Custom API URL

```bash
# Для production сервера
API_HOST=api.yourdomain.com API_PORT=443 node upload-script.js ./script-folder
```

### Batch Upload

```bash
# Загрузить все скрипты из папки
for dir in backend/scripts/*/; do
  echo "Uploading $dir"
  node upload-script.js "$dir"
done
```

### With npm script

Добавьте в `package.json`:

```json
{
  "scripts": {
    "upload-script": "node upload-script.js"
  }
}
```

Используйте:

```bash
npm run upload-script -- ./backend/scripts/twitter-gm-commenter
```

## Support

Если возникли проблемы:

1. Проверьте, что backend запущен (`npm run dev` в папке backend)
2. Проверьте права доступа (ADMIN_IPS в .env)
3. Проверьте формат script.json (валидный JSON)
4. Проверьте логи backend сервера
5. Используйте `--help` для справки

## License

MIT License - свободно используйте и модифицируйте под свои нужды.
