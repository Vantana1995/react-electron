/**
 * Script Manager Service
 * Управляет скриптами и их выполнением
 */

import fs from "fs";
import path from "path";

interface ScriptConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  requirements: {
    node_modules: string[];
    permissions: string[];
  };
  entry_point: string;
  config: Record<string, any>;
  features: string[];
  usage: {
    description: string;
    parameters: Record<string, any>;
  };
  security: {
    sandbox: boolean;
    memory_limit: string;
    timeout: number;
    allowed_domains: string[];
  };
}

interface ScriptInstance {
  id: string;
  config: ScriptConfig;
  path: string;
  loaded: boolean;
  lastUsed: Date;
}

export class ScriptManager {
  private scripts: Map<string, ScriptInstance> = new Map();
  private scriptsPath: string;

  constructor(scriptsPath: string = path.join(process.cwd(), "scripts")) {
    this.scriptsPath = scriptsPath;
    this.loadScripts();
  }

  /**
   * Загрузить все скрипты из папки
   */
  private loadScripts(): void {
    try {
      if (!fs.existsSync(this.scriptsPath)) {
        console.log("📁 Scripts directory not found, creating...");
        fs.mkdirSync(this.scriptsPath, { recursive: true });
        return;
      }

      const scriptDirs = fs
        .readdirSync(this.scriptsPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      console.log(`📁 Found ${scriptDirs.length} script directories`);

      for (const scriptDir of scriptDirs) {
        const scriptPath = path.join(this.scriptsPath, scriptDir);
        const configPath = path.join(scriptPath, "script.json");

        if (fs.existsSync(configPath)) {
          try {
            const configData = fs.readFileSync(configPath, "utf8");
            const config: ScriptConfig = JSON.parse(configData);

            const scriptInstance: ScriptInstance = {
              id: config.id,
              config,
              path: scriptPath,
              loaded: false,
              lastUsed: new Date(),
            };

            this.scripts.set(config.id, scriptInstance);
            console.log(`✅ Loaded script: ${config.name} v${config.version}`);
          } catch (error) {
            console.error(`❌ Failed to load script ${scriptDir}:`, error);
          }
        } else {
          console.warn(`⚠️ Script ${scriptDir} missing script.json`);
        }
      }
    } catch (error) {
      console.error("❌ Failed to load scripts:", error);
    }
  }

  /**
   * Получить список всех скриптов
   */
  getScripts(): ScriptInstance[] {
    return Array.from(this.scripts.values());
  }

  /**
   * Получить скрипт по ID
   */
  getScript(scriptId: string): ScriptInstance | null {
    return this.scripts.get(scriptId) || null;
  }

  /**
   * Получить код скрипта по ID
   */
  getScriptCode(scriptId: string): string | null {
    const script = this.getScript(scriptId);
    if (!script) {
      return null;
    }

    try {
      const scriptFilePath = path.join(script.path, script.config.entry_point);
      if (fs.existsSync(scriptFilePath)) {
        return fs.readFileSync(scriptFilePath, "utf8");
      }
    } catch (error) {
      console.error(`❌ Failed to read script code for ${scriptId}:`, error);
    }

    return null;
  }

  /**
   * Получить скрипты по категории
   */
  getScriptsByCategory(category: string): ScriptInstance[] {
    return Array.from(this.scripts.values()).filter(
      (script) => script.config.category === category
    );
  }

  /**
   * Получить скрипты по тегам
   */
  getScriptsByTags(tags: string[]): ScriptInstance[] {
    return Array.from(this.scripts.values()).filter((script) =>
      tags.some((tag) => script.config.tags.includes(tag))
    );
  }

  /**
   * Выполнить скрипт
   */
  async executeScript(
    scriptId: string,
    params: Record<string, any>,
    deviceData: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const script = this.getScript(scriptId);

    if (!script) {
      return {
        success: false,
        error: `Script ${scriptId} not found`,
      };
    }

    try {
      // Проверяем безопасность
      const securityCheck = this.checkSecurity(script, params, deviceData);
      if (!securityCheck.allowed) {
        return {
          success: false,
          error: `Security check failed: ${securityCheck.reason}`,
        };
      }

      // Загружаем скрипт
      const scriptModule = await this.loadScriptModule(script);
      if (!scriptModule) {
        return {
          success: false,
          error: "Failed to load script module",
        };
      }

      // Выполняем скрипт
      console.log(`🚀 Executing script: ${script.config.name}`);
      console.log(`📋 Script parameters:`, params);
      console.log(`📱 Device data keys:`, Object.keys(deviceData));

      // Проверяем, является ли модуль функцией
      if (typeof scriptModule === "function") {
        const result = await scriptModule(params, deviceData);

        // Обновляем время последнего использования
        script.lastUsed = new Date();

        return {
          success: true,
          result,
        };
      } else {
        // Если модуль экспортирует объект, ищем функцию execute или main
        const executeFunction =
          scriptModule.execute || scriptModule.main || scriptModule.default;

        if (typeof executeFunction === "function") {
          const result = await executeFunction(params, deviceData);

          // Обновляем время последнего использования
          script.lastUsed = new Date();

          return {
            success: true,
            result,
          };
        } else {
          return {
            success: false,
            error: "Script module does not export a valid execution function",
          };
        }
      }
    } catch (error) {
      console.error(`❌ Script execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Загрузить модуль скрипта
   */
  private async loadScriptModule(script: ScriptInstance): Promise<any> {
    try {
      const modulePath = path.join(script.path, script.config.entry_point);

      if (!fs.existsSync(modulePath)) {
        throw new Error(
          `Script entry point not found: ${script.config.entry_point}`
        );
      }

      console.log(`📦 Loading script module from: ${modulePath}`);

      // Используем динамический импорт вместо require
      const scriptModule = await import(modulePath);

      console.log(`📦 Script module loaded:`, typeof scriptModule);
      console.log(`📦 Script module keys:`, Object.keys(scriptModule));

      script.loaded = true;
      return scriptModule;
    } catch (error) {
      console.error(`❌ Failed to load script module:`, error);
      return null;
    }
  }

  /**
   * Проверить безопасность скрипта
   */
  private checkSecurity(
    script: ScriptInstance,
    params: Record<string, any>,
    deviceData: any
  ): { allowed: boolean; reason?: string } {
    const { security } = script.config;

    // Проверяем таймаут
    if (security.timeout && security.timeout > 60000) {
      return {
        allowed: false,
        reason: "Script timeout too high",
      };
    }

    // Проверяем разрешенные домены
    if (params.url) {
      const url = new URL(params.url);
      const allowedDomains = security.allowed_domains || [];

      if (allowedDomains.length > 0 && !allowedDomains.includes(url.hostname)) {
        return {
          allowed: false,
          reason: `Domain ${url.hostname} not allowed`,
        };
      }
    }

    // Проверяем sandbox
    if (!security.sandbox) {
      return {
        allowed: false,
        reason: "Script must run in sandbox",
      };
    }

    return { allowed: true };
  }

  /**
   * Получить статистику скриптов
   */
  getStats(): {
    total: number;
    loaded: number;
    categories: Record<string, number>;
    lastUsed: ScriptInstance[];
  } {
    const scripts = Array.from(this.scripts.values());
    const categories: Record<string, number> = {};

    scripts.forEach((script) => {
      const category = script.config.category;
      categories[category] = (categories[category] || 0) + 1;
    });

    return {
      total: scripts.length,
      loaded: scripts.filter((s) => s.loaded).length,
      categories,
      lastUsed: scripts
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 5),
    };
  }

  /**
   * Перезагрузить скрипты
   */
  reloadScripts(): void {
    this.scripts.clear();
    this.loadScripts();
    console.log("🔄 Scripts reloaded");
  }
}

// Создаем глобальный экземпляр
export const scriptManager = new ScriptManager();
