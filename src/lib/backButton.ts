import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { platform } from './platform'

/**
 * 处理 Android 硬件返回键。
 * `onBack` 返回 true 表示已消费该事件（例如关闭了一个弹层）；
 * 返回 false 表示没有可关闭的内容，执行系统默认行为（退出应用）。
 */
export function useBackButton(onBack: () => boolean): void {
  useEffect(() => {
    if (!platform.isCapacitor) return

    let active = true
    const handle = App.addListener('backButton', () => {
      if (active && !onBack()) {
        void App.exitApp()
      }
    })

    return () => {
      active = false
      handle.then((h) => h.remove()).catch(() => undefined)
    }
  }, [onBack])
}
