/** 运行时平台检测：区分 Web / Tauri 桌面 / Capacitor 移动。 */

export interface PlatformInfo {
  isTauri: boolean
  isCapacitor: boolean
  isNative: boolean
  isWeb: boolean
}

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return { isTauri: false, isCapacitor: false, isNative: false, isWeb: true }
  }
  const w = window as Window & {
    __TAURI_INTERNALS__?: unknown
    Capacitor?: { isNativePlatform?: () => boolean }
  }
  const isTauri = '__TAURI_INTERNALS__' in w
  const isCapacitor = Boolean(w.Capacitor?.isNativePlatform?.())
  return {
    isTauri,
    isCapacitor,
    isNative: isTauri || isCapacitor,
    isWeb: !isTauri && !isCapacitor,
  }
}

export const platform: PlatformInfo = detectPlatform()
