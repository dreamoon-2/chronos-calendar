/** 版本冲突：同一事件已被其他设备修改/删除，必须回滚并提示。 */
export class ConflictError extends Error {
  constructor(message = '该日程已在其他设备更新，请重新加载') {
    super(message)
    this.name = 'ConflictError'
  }
}

/** 离线错误：首版离线不允许写入。 */
export class OfflineError extends Error {
  constructor(message = '当前处于离线状态，无法保存修改') {
    super(message)
    this.name = 'OfflineError'
  }
}

/** 从 Supabase 错误对象提取可读信息。 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof ConflictError || err instanceof OfflineError) {
    return err.message
  }
  if (err instanceof Error) {
    return err.message
  }
  return '操作失败，请稍后重试'
}
