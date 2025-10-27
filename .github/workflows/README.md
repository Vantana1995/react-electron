# GitHub Actions Workflows

## Build macOS Application

Автоматическая сборка macOS версии приложения с использованием GitHub Actions.

### Как запустить сборку вручную:

1. Перейдите на страницу Actions вашего репозитория:
   ```
   https://github.com/Vantana1995/react-electron/actions
   ```

2. Выберите workflow "Build macOS Application" в левом меню

3. Нажмите кнопку **"Run workflow"** справа

4. Выберите branch (обычно `main`)

5. Опционально: включите "Upload to GitHub Releases" для создания релиза

6. Нажмите **"Run workflow"** (зеленая кнопка)

### Как скачать собранный DMG:

1. Дождитесь завершения сборки (обычно 5-7 минут)

2. Откройте завершенный workflow run

3. Пролистайте вниз до секции **"Artifacts"**

4. Скачайте `macos-app-xxxxx.zip`

5. Разархивируйте ZIP - внутри готовый `.dmg` файл

### Автоматическая сборка:

Workflow также запускается автоматически при:
- Пуше в ветку `main`
- Изменении файлов в папке `react-electron/`

Чтобы отключить автоматическую сборку, закомментируйте секцию `push:` в файле `build-mac.yml`.

### Тарификация:

- **Публичный репозиторий:** неограниченные бесплатные минуты ✅
- **Приватный репозиторий:**
  - Free план: 2000 минут/месяц (200 минут macOS с множителем 10x)
  - Одна сборка занимает ~5-7 минут (50-70 из квоты)

### Структура:

```
.github/
└── workflows/
    ├── build-mac.yml    # Конфигурация сборки macOS
    └── README.md        # Эта инструкция
```

### Возможные проблемы:

#### ❌ Build fails with "command not found"
Убедитесь, что в `react-electron/package.json` есть скрипт:
```json
"scripts": {
  "build:mac": "npm run build && electron-builder --mac"
}
```

#### ❌ "No artifacts found"
Проверьте, что сборка завершилась успешно и файл `.dmg` создан в `release/` директории.

#### ❌ Out of minutes (приватный репо)
- Проверьте оставшиеся минуты: Settings → Billing → Plans and usage
- Отключите автоматическую сборку на каждый пуш
- Используйте только ручной запуск workflow

### Дополнительные настройки:

#### Сборка только определенных веток:
```yaml
on:
  push:
    branches: [ main, develop ]  # Добавьте нужные ветки
```

#### Изменение срока хранения artifacts:
```yaml
- uses: actions/upload-artifact@v4
  with:
    retention-days: 7  # Хранить 7 дней вместо 30
```

#### Добавить уведомления:
```yaml
- name: Notify on success
  if: success()
  run: echo "Build successful! 🎉"
```

### Полезные ссылки:

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Electron Builder Documentation](https://www.electron.build/)
- [Actions Billing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
