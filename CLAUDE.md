# Claude Code Instructions

## Project Context

You are working on a **Twitter Automation Platform** - a subscription-based desktop application with crypto payments. The system consists of an Electron frontend and Next.js backend that enables users to automate Twitter interactions through DOM manipulation scripts delivered securely from IPFS.

## Current Priority

**CRITICAL ISSUE**: Script execution system setup

- ✅ User receives encrypted scripts from server
- ✅ WebSocket connection and keep-alive working
- ✅ UI updates and counters working
- 🔴 **Scripts arrive but don't execute** - THIS IS THE MAIN PROBLEM
- Need to configure Puppeteer browsers (headless/non-headless) with user settings
- Scripts should run in RAM only, deleted on app close

## Architecture Overview

### Frontend (Electron + JavaScript/TypeScript)

- **Main Process**: Window management, IPC, security measures
- **Renderer Process**: UI components, user interactions
- **Script Executor**: Memory-only script execution environment
- **Puppeteer Integration**: Browser automation with stealth plugins
- **Security**: Anti-debugging, DevTools blocking, device fingerprinting

### Backend (Next.js + PostgreSQL)

- **API Routes**: Authentication, script delivery, payments
- **WebSocket**: Real-time monitoring (30s ping intervals)
- **IPFS Integration**: Decentralized script storage and delivery
- **Blockchain**: Smart contract integration for payments
- **Database**: User management, subscriptions, activity logging

## Key Technologies

- **Frontend**: Electron, Puppeteer, Web3.js, Socket.io-client
- **Backend**: Next.js, PostgreSQL, Socket.io, IPFS, Web3.js
- **Security**: Anti-debugging, fingerprinting, encryption
- **Automation**: Puppeteer-extra with stealth plugins

## Code Style & Standards

### Preferred Style

```javascript
// Use async/await with proper error handling
const executeScript = async (scriptContent, userSettings) => {
  try {
    const browser = await launchPuppeteerBrowser(userSettings);
    const result = await runScriptInMemory(scriptContent, browser);
    return { success: true, data: result };
  } catch (error) {
    logger.error("Script execution failed:", error);
    return { success: false, error: error.message };
  }
};

// Modular, security-first approach
const securityCheck = () => {
  if (isDebuggingDetected()) {
    setTimeout(() => app.quit(), 500);
  }
};
```

### File Naming Conventions

- Files/folders: `kebab-case`
- Functions/variables: `camelCase`
- Classes/components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

## Development Guidelines

### Security First

- All scripts execute in memory only
- Anti-debugging measures always active
- Device fingerprint validation on every request
- Encrypted communication between client/server
- WebSocket monitoring every 30 seconds

### Performance Optimization

- Modular script loading system
- IPFS content caching
- Database connection pooling
- Lazy loading of components
- Efficient memory management

### Code Quality

- Single responsibility principle
- Comprehensive error handling
- Detailed logging for debugging
- Input validation on all endpoints
- Consistent API response format

## Project Structure

```
project-root/
├── frontend/                 # Electron Application
│   ├── src/
│   │   ├── main/            # Main Electron process
│   │   ├── renderer/        # Renderer processes
│   │   ├── scripts/         # Script execution environment
│   │   └── auth/            # Authentication logic
│   └── package.json
├── backend/                 # Next.js API Server
│   ├── pages/api/           # API endpoints
│   ├── services/            # Business logic
│   ├── database/            # Database models
│   └── package.json
└── smart-contracts/         # Blockchain contracts
```

## API Response Format

```javascript
{
  success: boolean,
  data?: any,
  error?: {
    code: string,
    message: string,
    details?: any
  },
  timestamp: string
}
```

## Current Focus Areas

### Script Execution Priority

1. **Memory-only execution**: Scripts loaded and run in RAM
2. **Puppeteer configuration**: Headless/non-headless with user settings
3. **Anti-detection**: Stealth plugins, human-like behavior
4. **Error handling**: Comprehensive logging and recovery
5. **Security**: Isolated execution environment

## Important Notes

- Never save scripts to disk - memory only
- Always validate device fingerprints
- Maintain WebSocket connection for security
- Use stealth plugins to avoid Twitter detection
- Clean up resources on app close

## When Making Changes

1. **Analyze the problem**: Understand the current issue before coding
2. **Security considerations**: Always consider security implications
3. **Performance impact**: Optimize for memory and CPU usage
4. **Error handling**: Include comprehensive error handling
5. **Logging**: Add appropriate logging for debugging
6. **Testing**: Consider edge cases and failure scenarios

## Tools & Libraries in Use

- **Puppeteer-extra**: Browser automation with stealth
- **Ghost-cursor**: Human-like mouse movements
- **Web3.js**: Blockchain interactions
- **Socket.io**: Real-time communication
- **Farmhash**: Fast fingerprint hashing
- **IPFS**: Decentralized script storage
