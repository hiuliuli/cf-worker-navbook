import { useId, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NavGroup } from '@/lib/bookmarks'

const fieldClass =
  'h-11 rounded-xl border-slate-900/15 bg-white/70 px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus-visible:border-slate-900/30 focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10'

const cancelButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-slate-900/15 bg-white/70 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'

const submitButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'

const destructiveButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:pointer-events-none disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400'

type GroupNameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'rename'
  group: NavGroup | null
  onSubmit: (name: string) => Promise<void>
}

type GroupNameFormProps = {
  mode: 'create' | 'rename'
  group: NavGroup | null
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

function GroupNameForm({ mode, group, onSubmit, onCancel }: GroupNameFormProps) {
  const fieldId = useId()
  const [name, setName] = useState(mode === 'rename' ? (group?.name ?? '') : '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const next = name.trim()
    if (!next) {
      setError('请输入分组名称')
      return
    }
    if (next.length > 40) {
      setError('分组名称不能超过 40 个字符')
      return
    }
    if (mode === 'rename' && group && next === group.name) {
      onCancel()
      return
    }

    setPending(true)
    setError(null)
    try {
      await onSubmit(next)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={fieldId} className="text-slate-600 dark:text-slate-300">
          分组名称
        </Label>
        <Input
          id={fieldId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：常用"
          maxLength={40}
          autoFocus
          className={fieldClass}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <DialogFooter className="mt-1">
        <button type="button" onClick={onCancel} className={cancelButtonClass}>
          取消
        </button>
        <button type="submit" disabled={pending} className={submitButtonClass}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? '保存中…' : '保存'}
        </button>
      </DialogFooter>
    </form>
  )
}

export function GroupNameDialog({
  open,
  onOpenChange,
  mode,
  group,
  onSubmit,
}: GroupNameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '新建分组' : '重命名分组'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '创建后会立即同步到云端，并添加到分组列表末尾。'
              : '修改后立即同步到云端。'}
          </DialogDescription>
        </DialogHeader>

        {(mode === 'create' || group) && (
          <GroupNameForm
            key={mode === 'create' ? 'create' : (group?.id ?? 'rename')}
            mode={mode}
            group={group}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type GroupDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: NavGroup | null
  bookmarkCount: number
  onConfirm: () => Promise<void>
}

type DeleteGroupConfirmationProps = {
  group: NavGroup
  bookmarkCount: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function DeleteGroupConfirmation({
  group,
  bookmarkCount,
  onConfirm,
  onCancel,
}: DeleteGroupConfirmationProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    if (pending) return

    setPending(true)
    setError(null)
    try {
      await onConfirm()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : '删除失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>删除分组</DialogTitle>
        <DialogDescription>
          {bookmarkCount > 0
            ? `确定删除「${group.name}」吗？分组内的 ${bookmarkCount} 个书签会一并删除，此操作无法撤销。`
            : `确定删除「${group.name}」吗？此操作无法撤销。`}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <DialogFooter>
        <button type="button" onClick={onCancel} className={cancelButtonClass}>
          取消
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className={destructiveButtonClass}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? '删除中…' : '删除分组'}
        </button>
      </DialogFooter>
    </>
  )
}

export function GroupDeleteDialog({
  open,
  onOpenChange,
  group,
  bookmarkCount,
  onConfirm,
}: GroupDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(event) => event.preventDefault()}>
        {group && (
          <DeleteGroupConfirmation
            key={group.id}
            group={group}
            bookmarkCount={bookmarkCount}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
