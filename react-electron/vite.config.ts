import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        vite: {
          build: {
            commonjsOptions: {
              ignoreDynamicRequires: true,
            },
            rollupOptions: {
              external: [
                'nat-api',
                'electron',
                'electron/main',
                'electron/renderer',
                'electron/common',
                'socket.io-client',
                'ws',
                'bufferutil',
                'utf-8-validate',
              ],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
        // Build preload as ES module
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: "es",
              },
            },
          },
        },
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {},
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@/components": path.resolve(__dirname, "src/components"),
      "@/services": path.resolve(__dirname, "src/services"),
      "@/utils": path.resolve(__dirname, "src/utils"),
      "@/types": path.resolve(__dirname, "src/types"),
      "@/scripts": path.resolve(__dirname, "src/scripts"),
      "@/auth": path.resolve(__dirname, "src/auth"),
      "@/hooks": path.resolve(__dirname, "src/hooks"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: true,
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: [
        "puppeteer",
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
        "ghost-cursor",
      ],
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Optimize dependencies for better performance
  optimizeDeps: {
    include: ["react", "react-dom", "web3"],
    exclude: ["electron", "socket.io-client"],
  },
});
