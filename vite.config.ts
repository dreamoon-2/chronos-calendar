import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Tauri 构建/开发时 CLI 会注入 TAURI_ENV_PLATFORM（如 "windows"）。
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Capacitor 构建用 `npm run build:cap`（--mode capacitor）；原生端不需要 Service Worker。
  const isCapacitor = mode === 'capacitor'
  const enablePWA = !isTauri && !isCapacitor

  return {
    plugins: [
      react(),
      ...(enablePWA
        ? [
            VitePWA({
              registerType: 'prompt',
              includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
              manifest: {
                name: 'Chronos Calendar',
                short_name: 'Chronos',
                description: '跨端同步日程表',
                lang: 'zh-CN',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                orientation: 'portrait-primary',
                background_color: '#ffffff',
                theme_color: '#5b4be3',
                icons: [
                  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                  {
                    src: 'icons/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                // 只服务同源 SPA 导航
                navigateFallback: '/index.html',
                // 绝不缓存 Supabase 的认证与数据请求
                runtimeCaching: [
                  {
                    urlPattern: ({ url }: { url: URL }) =>
                      url.hostname.includes('supabase.co'),
                    handler: 'NetworkOnly',
                  },
                ],
              },
            }),
          ]
        : []),
    ],

    // Tauri 开发服务器固定端口，避免窗口与 devUrl 失配
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: process.env.TAURI_DEV_HOST || false,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
  }
})
