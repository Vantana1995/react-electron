# UI Improvements Plan - NFT Display

## Текущее состояние
✅ Скрипт работает
✅ Можно запустить с профилем
✅ Можно остановить через console
❌ Нет визуального отображения логов
❌ Нет кнопки Disconnect
❌ Нет раскрывающейся формы конфигурации
❌ Нет проверки на дубликаты (один профиль - один скрипт)

## План улучшений

### 1. Headless режим - Показ логов
**Когда**: Пользователь запускает скрипт в headless режиме
**Что происходит**:
- Карточка NFT меняет содержимое
- Вместо картинки показывается консоль с логами
- Логи обновляются в реальном времени
- Кнопка "Disconnect" для остановки

**Макет**:
```
┌─────────────────────────────────────┐
│ 🖥️ Script Running (Headless)        │
├─────────────────────────────────────┤
│ Profile: Profile 1                  │
│ Script: Twitter GM Commenter        │
├─────────────────────────────────────┤
│ 📜 Console Logs:                    │
│                                     │
│ > 🚀 Starting script execution...   │
│ > 🌐 Proxy server: 93.127.154.112...│
│ > 🔐 Proxy auth: user324168         │
│ > 🚀 Launching browser with args... │
│ > ✅ Navigated to: https://x.com... │
│ > 🔍 Found 5 matching tweets        │
│ > 💬 Comment: gmski fren...         │
│                                     │
├─────────────────────────────────────┤
│ [🛑 Disconnect]                     │
└─────────────────────────────────────┘
```

### 2. Раскрывающаяся форма конфигурации
**Где**: Под карточкой NFT
**Триггер**: Клик на "⚙️ Configure Script..."

**Макет**:
```
┌─────────────────────────────────────┐
│ ⚙️ Configure Script...              │ ← Клик раскрывает
└─────────────────────────────────────┘
        ↓ раскрывается ↓
┌─────────────────────────────────────┐
│ 📋 Script Configuration             │
├─────────────────────────────────────┤
│ Navigation URL:                     │
│ [https://x.com/search?q=...       ]│
│                                     │
│ Regex Pattern:                      │
│ [\b(crypto|web3|ticker)..         ]│
│                                     │
│ Comment Templates (JSON):           │
│ ┌─────────────────────────────────┐│
│ │{                                ││
│ │  "gm": [                        ││
│ │    "gmski fren...",             ││
│ │    "good morning..."            ││
│ │  ]                              ││
│ │}                                ││
│ └─────────────────────────────────┘│
│                                     │
│ Max Tweets: [5 ]                   │
│ Delay (ms): [3000 ]                │
│ Max Words:  [200 ]                 │
│                                     │
│ [✅ Save Configuration]             │
└─────────────────────────────────────┘
```

### 3. Проверка дубликатов
**Логика**:
```javascript
// Ключ для проверки: IP прокси
const proxyKey = selectedProfile.proxy.ip;

// Проверка перед запуском
if (activeScriptsByProfile.has(proxyKey)) {
  alert(`Profile "${selectedProfile.name}" is already running a script!`);
  return;
}

// После успешного запуска
setActiveScriptsByProfile(prev => {
  const newMap = new Map(prev);
  newMap.set(proxyKey, scriptId);
  return newMap;
});
```

**UI индикация**:
```
Profiles dropdown:
- Profile 1 (Available) ✓
- Profile 2 (🔴 Running script)  ← disabled
- Profile 3 (Available) ✓
```

### 4. Non-Headless режим
**Когда**: Пользователь снимает галочку "Headless Mode"
**Что происходит**:
- Открывается видимое окно браузера
- Пользователь видит действия в реальном времени
- Карточка NFT остается с кнопкой Disconnect

**Макет**:
```
┌─────────────────────────────────────┐
│ 🖼️ NFT Image                        │
│                                     │
│        [NFT картинка]               │
│                                     │
├─────────────────────────────────────┤
│ ⚠️ Browser window is open          │
│ Profile: Profile 1                  │
│ Mode: Non-headless (visible)        │
│                                     │
│ [🛑 Stop Script]                    │
└─────────────────────────────────────┘
```

## Компоненты для реализации

### A. ScriptLogsViewer Component
```tsx
interface ScriptLogsViewerProps {
  logs: string[];
  profileName: string;
  scriptName: string;
  onDisconnect: () => void;
}
```

### B. ScriptConfigForm Component
```tsx
interface ScriptConfigFormProps {
  onSave: (config: ScriptConfig) => void;
  initialConfig?: ScriptConfig;
}

interface ScriptConfig {
  navigationUrl: string;
  regexPattern: string;
  commentTemplates: string; // JSON string
  maxTweetsToProcess: number;
  delayBetweenActions: number;
  maxWordCount: number;
}
```

### C. ProfileSelector Component (enhanced)
```tsx
interface ProfileSelectorProps {
  profiles: UserProfile[];
  activeScripts: Map<string, string>;  // proxyIP -> scriptId
  selectedProfile: UserProfile | null;
  onSelect: (profile: UserProfile) => void;
}
```

## Типы данных

```typescript
// Добавить в types/index.ts
export interface ActiveScript {
  id: string;
  scriptId: string;
  name: string;
  startTime: number;
  status: "running" | "completed" | "error";
  profileId: string;
  profileProxyIp: string;
}

export interface ScriptLog {
  timestamp: number;
  message: string;
  level: "info" | "success" | "warning" | "error";
}
```

## Приоритеты

1. **Высокий**: Кнопка Disconnect + показ логов в headless режиме
2. **Средний**: Раскрывающаяся форма конфигурации
3. **Средний**: Проверка дубликатов по профилям
4. **Низкий**: Красивое оформление и анимации

## Примеры кода

### Остановка скрипта:
```typescript
const handleDisconnect = async () => {
  if (!runningScriptId) return;

  try {
    const result = await window.electronAPI.stopScript(runningScriptId);
    if (result.success) {
      setIsExecuting(false);
      setRunningScriptId(null);
      setScriptLogs(prev => [...prev, "✅ Script stopped successfully"]);
    }
  } catch (error) {
    console.error("Failed to stop script:", error);
  }
};
```

### Создание конфигурации из полей:
```typescript
const buildCustomData = () => {
  const config: any = {};

  if (navigationUrl) config.navigationUrl = navigationUrl;
  if (regexPattern) config.regexPattern = regexPattern;
  if (maxTweetsToProcess) config.maxTweetsToProcess = maxTweetsToProcess;
  if (delayBetweenActions) config.delayBetweenActions = delayBetweenActions;

  // Парсим comment templates
  if (commentTemplates) {
    try {
      config.commentTemplates = JSON.parse(commentTemplates);
    } catch (e) {
      alert("Invalid comment templates JSON");
      return null;
    }
  }

  return JSON.stringify(config);
};
```