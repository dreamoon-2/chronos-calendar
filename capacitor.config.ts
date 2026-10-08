import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.chronos.calendar',
  appName: 'Chronos Calendar',
  webDir: 'dist',
  server: {
    // 使用 https 本地服务器，避免 Android 明文流量限制，并兼容后续 OAuth/深链。
    androidScheme: 'https',
  },
}

export default config
