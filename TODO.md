- main.ts electron directory,
  1. We dont need all of this methods `  res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );` check at backend which we are currently use and remove not important and non usable
  2. ` const ipAddress = "::1";` change usage of hardcoded ip to use real users ip
  3. Update `ipcMain.handle("disconnect-wallet"` so it will clean up cache from script usage
  4. Need to add hashing or hiding where we currently store `// Записываем скрипт в файл
fs.writeFileSync(scriptPath, puppeteerScript);` so user cont find it at their devices, how we can do that?
  5. ` // Удаляем временный файл через 30 секунд (даем время скрипту запуститься)` we need to clean script from memory only at logout or wallet disconnect wallet or not getting ping from server within 40 sec, also i dont know how to protect code from script at sutiations like when someone switch off electricity and how script will clean up from memory


# Styles

Need to change all styles into simple light/dark mode, no emoji, no onHover moving effects, lets create simple UI
At NFT card we need to do some work, so RN we have fixed 33% and when we click on image its stable, but i want when we click to image the NFT got unwrapped and open a section where you can manage your script execution, which account with what setting is use this script currently and user can simply hit Add Profile and set up all settings
