import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { colorPalette } from '../../lib/categories'
import { toErrorMessage } from '../../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { mapAuthError, setPassword } from '../auth/authService'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../categories/categoryQueries'

interface SettingsPageProps {
  open: boolean
  onClose: () => void
}

export function SettingsPage({ open, onClose }: SettingsPageProps) {
  const categories = useCategories()
  const createM = useCreateCategory()
  const updateM = useUpdateCategory()
  const deleteM = useDeleteCategory()
  const toast = useToast()

  const { user, isDemo } = useAuth()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(colorPalette()[0])
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const savePassword = async () => {
    if (newPassword.length < 6) return
    setSavingPassword(true)
    try {
      await setPassword(newPassword)
      setNewPassword('')
      toast.success('密码已设置，可在其他设备用邮箱 + 密码登录')
    } catch (err) {
      toast.error(mapAuthError(err))
    } finally {
      setSavingPassword(false)
    }
  }

  const add = async () => {
    if (!newName.trim()) return
    try {
      await createM.mutateAsync({
        name: newName.trim(),
        color: newColor,
        sort_order: (categories.data?.length ?? 0) + 1,
      })
      setNewName('')
      toast.success('已新增分类')
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  const changeColor = async (id: string, color: string) => {
    try {
      await updateM.mutateAsync({ id, patch: { color } })
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  const rename = async (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      await updateM.mutateAsync({ id, patch: { name: trimmed } })
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteM.mutateAsync(id)
      toast.success('已删除分类')
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="设置" wide>
      <div className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            分类管理
          </h3>

          <ul className="space-y-2">
            {(categories.data ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => void changeColor(c.id, e.target.value)}
                  aria-label={`${c.name} 的颜色`}
                  className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600"
                />
                <input
                  defaultValue={c.name}
                  onBlur={(e) => {
                    if (e.target.value !== c.name) void rename(c.id, e.target.value)
                  }}
                  maxLength={40}
                  className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-800 outline-none hover:border-slate-200 focus:border-brand-500 dark:text-slate-100 dark:hover:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => void remove(c.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  删除
                </button>
              </li>
            ))}
            {(categories.data ?? []).length === 0 && (
              <li className="text-sm text-slate-400">暂无分类，可添加一个。</li>
            )}
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              aria-label="新分类颜色"
              className="h-9 w-11 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 dark:border-slate-600"
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void add()
              }}
              placeholder="新分类名称"
              maxLength={40}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <Button onClick={() => void add()} disabled={!newName.trim() || createM.isPending}>
              添加
            </Button>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-6 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            账号
          </h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            登录邮箱：<span className="text-slate-700 dark:text-slate-200">{user?.email ?? '—'}</span>
          </p>

          {isDemo ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              演示模式下不支持账号设置，请先配置 Supabase 凭证。
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="设置密码（至少 6 位）"
                  minLength={6}
                  autoComplete="new-password"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <Button
                  onClick={() => void savePassword()}
                  disabled={newPassword.length < 6 || savingPassword}
                >
                  {savingPassword ? '保存中…' : '设置密码'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                设置后可在其他设备用「邮箱 + 密码」直接登录，不再依赖登录邮件。
              </p>
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
