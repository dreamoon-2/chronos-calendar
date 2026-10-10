import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'
import { deleteDraft, listDrafts, type EventDraft } from './eventDrafts'

export function EventDraftList({ userId, onSelect, onClose }: {
  userId: string; onSelect: (draft: EventDraft) => void; onClose: () => void
}) {
  const [drafts, setDrafts] = useState(() => listDrafts(userId))
  const toast = useToast()
  return <Modal open title="日程草稿" onClose={onClose}>
    <p className="mb-4 text-xs leading-relaxed text-slate-500">草稿保存在当前设备。选择后可修改并创建新日程，不会覆盖原有日程。</p>
    {drafts.length === 0 && <p className="py-8 text-center text-sm text-slate-400">暂无草稿，在日程编辑器中点击「保存草稿」即可添加。</p>}
    <ul className="space-y-3">
      {drafts.map(draft => <li key={draft.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <h3 className="break-words text-sm font-semibold">{draft.values.title.trim() || '未命名草稿'}</h3>
        <p className="mt-1 text-xs text-slate-500">{draft.values.startDate} · {draft.values.allDay ? '全天' : `${draft.values.startTime}–${draft.values.endTime}`}</p>
        {draft.updatedAt && <p className="mt-1 text-xs text-slate-400">保存于 {new Date(draft.updatedAt).toLocaleString('zh-CN')}</p>}
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => onSelect(draft)}>修改并填入</Button>
          <Button variant="secondary" aria-label={`删除草稿 ${draft.values.title.trim() || '未命名草稿'}`} onClick={() => {
            try { deleteDraft(userId, draft.id); setDrafts(listDrafts(userId)) }
            catch { toast.error('草稿删除失败，请重试') }
          }}>删除</Button>
        </div>
      </li>)}
    </ul>
  </Modal>
}
