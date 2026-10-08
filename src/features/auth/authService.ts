import { supabase } from '../../lib/supabase'

const RATE_LIMIT_MSG =
  '邮件发送已达上限：Supabase 内置邮件服务每小时仅允许 2 封。请改用「邮箱 + 密码」登录，或等待约 1 小时后重试，或在 Supabase 配置自定义 SMTP。'

/** 把 Supabase Auth 的英文错误转成可读中文提示。 */
export function mapAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const msg = raw.toLowerCase()
  if (msg.includes('rate limit')) return RATE_LIMIT_MSG
  if (msg.includes('invalid login credentials')) return '邮箱或密码不正确'
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return '该邮箱已注册，请切换到「密码登录」直接登录'
  }
  if (msg.includes('password should be at least')) return '密码太短，至少需要 6 位'
  if (msg.includes('email not confirmed')) return '邮箱尚未确认，请查收确认邮件后再登录'
  if (msg.includes('unable to validate email')) return '邮箱格式不正确'
  if (msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
    return '该项目已关闭注册功能'
  }
  return raw || '操作失败，请稍后重试'
}

/** 发送邮箱魔法链接（Magic Link）登录邮件。 */
export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('演示模式不支持登录')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // 邮件里的链接跳回应用首页；需在 Supabase Auth 的 redirect allowlist 中加入该域名。
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

/** 邮箱 + 密码登录（不消耗邮件配额，推荐多设备使用）。 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  if (!supabase) throw new Error('演示模式不支持登录')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * 邮箱 + 密码注册。
 * 若项目开启了 “Confirm email”，Supabase 会发确认邮件并且不立即建立会话；
 * 返回 needsEmailConfirmation 以便界面提示。
 */
export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  if (!supabase) throw new Error('演示模式不支持注册')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return { needsEmailConfirmation: !data.session }
}

/** 为当前登录用户设置/修改密码（让魔法链接账号也能用密码登录）。 */
export async function setPassword(password: string): Promise<void> {
  if (!supabase) throw new Error('演示模式不支持该操作')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}
