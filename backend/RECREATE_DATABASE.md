# Пересоздание базы данных

## Проблема

База данных не была полностью очищена, и при попытке добавить новые колонки возникают ошибки.

## Решение

Полностью пересоздать базу данных с новой схемой.

## Шаги

### 1. Остановите бэкенд сервер

```bash
# Остановите сервер если он запущен
# Ctrl+C в терминале где запущен npm run dev
```

### 2. Подключитесь к PostgreSQL

```bash
psql -h localhost -U postgres
```

### 3. Удалите существующую базу данных

```sql
-- Завершите все подключения к базе данных
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'twitter_automation' AND pid <> pg_backend_pid();

-- Удалите базу данных
DROP DATABASE IF EXISTS twitter_automation;
```

### 4. Создайте новую базу данных

```sql
CREATE DATABASE twitter_automation;
```

### 5. Выйдите из psql

```sql
\q
```

### 6. Инициализируйте новую схему

```bash
psql -h localhost -U postgres -d twitter_automation -f database-init.sql
```

### 7. Проверьте результат

```bash
psql -h localhost -U postgres -d twitter_automation -c "\d scripts_library"
```

Должны увидеть колонки:

- metadata (jsonb)
- nft_addresses (text[])

### 8. Протестируйте загрузку скрипта

```bash
cd ..
node upload-script.js ./backend/scripts/twitter-gm-commenter
```

## Ожидаемый результат

- ✅ Чистая база данных без старых данных
- ✅ Новая схема с колонками metadata и nft_addresses
- ✅ Успешная загрузка скрипта
