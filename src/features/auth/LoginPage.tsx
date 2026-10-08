import { useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { platform } from '../../lib/platform'
import {
  mapAuthError,
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from './authService'

type Tab = 'password' | 'magiclink'

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white'

const labelCls =
  'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

export function LoginPage() {
  const [tab, setTab] = useState<Tab>('password')
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const passwordReady = password.length >= 6
  const confirmMatches = !isRegister || confirmPassword === password
  const confirmMismatch =
    isRegister && confirmPassword.length > 0 && confirmPassword !== password

  const canSubmit =
    !submitting &&
    email.trim().length > 0 &&
    (tab === 'magiclink' || (passwordReady && confirmMatches))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      if (tab === 'magiclink') {
        await sendMagicLink(email.trim())
        setSent(true)
      } else if (isRegister) {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致')
          return
        }
        const { needsEmailConfirmation } = await signUpWithPassword(
          email.trim(),
          password,
        )
        if (needsEmailConfirmation) {
          setNotice('注册成功。请查收邮箱确认后再登录。')
        }
        // 若未开启邮箱确认，onAuthStateChange 会自动完成登录。
      } else {
        await signInWithPassword(email.trim(), password)
      }
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    setError(null)
    setNotice(null)
    setSent(false)
    setConfirmPassword('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl text-white">
            📅
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Chronos Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            登录后跨端同步你的日程
          </p>
        </div>

        <div className="mb-5 flex overflow-hidden rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {(
            [
              { id: 'password' as const, label: '邮箱 + 密码' },
              { id: 'magiclink' as const, label: '邮箱链接' },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={clsx(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
                tab === t.id
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {platform.isNative && (
          <p className="mb-4 rounded-lg bg-sky-50 p-3 text-xs leading-relaxed text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
            桌面/移动端请优先使用「邮箱 + 密码」登录；「邮箱链接」会在系统浏览器中打开，不会回到本应用。
          </p>
        )}

        {sent ? (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            已发送登录链接到 <span className="font-medium">{email}</span>
            ，请查收邮箱并点击链接完成登录。
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="email">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </div>

            {tab === 'password' && (
              <div>
                <label className={labelCls} htmlFor="password">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className={inputCls}
                />
              </div>
            )}

            {tab === 'password' && isRegister && (
              <div>
                <label className={labelCls} htmlFor="confirm-password">
                  确认密码
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className={inputCls}
                />
                {confirmMismatch && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    两次输入的密码不一致
                  </p>
                )}
              </div>
            )}

            {notice && (
              <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                {notice}
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? '处理中…'
                : tab === 'magiclink'
                  ? '发送登录链接'
                  : isRegister
                    ? '注册并登录'
                    : '登录'}
            </button>

            {tab === 'password' && (
              <button
                type="button"
                onClick={() => {
                  setIsRegister((v) => !v)
                  setConfirmPassword('')
                  setError(null)
                  setNotice(null)
                }}
                className="w-full text-center text-xs text-brand-600 hover:underline dark:text-brand-300"
              >
                {isRegister ? '已有账号？去登录' : '没有账号？注册一个'}
              </button>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          {tab === 'password'
            ? '推荐：密码登录不消耗邮件配额，多设备登录更方便。'
            : 'Supabase 内置邮件服务每小时仅 2 封；若提示超限请改用密码登录。'}
        </p>
      </div>
    </div>
  )
}
