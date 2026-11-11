import { useId, useState, type FormEvent } from 'react'
import { Globe, Loader2 } from 'lucide-react'

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
import {
  normalizeIcon,
  normalizeLink,
  type Bookmark,
  type BookmarkInput,
} from '@/lib/bookmarks'

type BookmarkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  bookmark: Bookmark | null
  onSubmit: (values: BookmarkInput) => Promise<void>
}

type BookmarkFormProps = {
  bookmark: Bookmark | null
  onSubmit: (values: BookmarkInput) => Promise<void>
  onCancel: () => void
}

const emptyForm: BookmarkInput = { title: '', url: '', icon: '', description: '' }

const fieldClass =
  'h-11 rounded-xl border-slate-900/15 bg-white/70 px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus-visible:border-slate-900/30 focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10'

const textareaClass =
  'min-h-20 w-full resize-none rounded-xl border border-slate-900/15 bg-white/70 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus-visible:border-slate-900/30 focus-visible:ring-2 focus-visible:ring-slate-900/10 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-white/30 dark:focus-visible:ring-white/10'

const cancelButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-slate-900/15 bg-white/70 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'

const submitButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'

function BookmarkForm({ bookmark, onSubmit, onCancel }: BookmarkFormProps) {
  const fieldId = useId()
  const [values, setValues] = useState<BookmarkInput>(() =>
    bookmark
      ? {
          title: bookmark.title,
          url: bookmark.url,
          icon: bookmark.icon,
          description: bookmark.description,
        }
      : emptyForm,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [failedIcon, setFailedIcon] = useState<string | null>(null)

  function updateValue(key: keyof BookmarkInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const title = values.title.trim()
    if (!title) {
      setError('请输入书签标题')
      return
    }
    if (title.length > 80) {
      setError('标题不能超过 80 个字符')
      return
    }

    const url = normalizeLink(values.url)
    if (!url) {
      setError('请输入有效的链接，例如 https://example.com')
      return
    }

    const icon = normalizeIcon(values.icon)
    if (icon === null) {
      setError('图标链接格式不正确，需以 http:// 或 https:// 开头')
      return
    }

    const description = values.description.trim()
    if (description.length > 200) {
      setError('描述不能超过 200 个字符')
      return
    }

    setPending(true)
    setError(null)
    try {
      await onSubmit({ title, url, icon, description })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  const iconPreview = values.icon.trim()
  const showIconPreview = iconPreview !== '' && failedIcon !== iconPreview

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${fieldId}-title`} className="text-slate-600 dark:text-slate-300">
          标题
        </Label>
        <Input
          id={`${fieldId}-title`}
          value={values.title}
          onChange={(event) => updateValue('title', event.target.value)}
          placeholder="例如：GitHub"
          maxLength={80}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${fieldId}-url`} className="text-slate-600 dark:text-slate-300">
          链接
        </Label>
        <Input
          id={`${fieldId}-url`}
          value={values.url}
          onChange={(event) => updateValue('url', event.target.value)}
          placeholder="https://example.com"
          inputMode="url"
          maxLength={2048}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${fieldId}-icon`} className="text-slate-600 dark:text-slate-300">
          图标链接
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">可选</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={`${fieldId}-icon`}
            value={values.icon}
            onChange={(event) => updateValue('icon', event.target.value)}
            placeholder="https://example.com/favicon.ico"
            inputMode="url"
            maxLength={2048}
            className={`${fieldClass} flex-1`}
          />
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-900/10 bg-white/85 shadow-sm shadow-slate-900/5 dark:border-white/15 dark:bg-white/85">
            {showIconPreview ? (
              <img
                src={iconPreview}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setFailedIcon(iconPreview)}
                className="size-6 object-contain"
              />
            ) : (
              <Globe className="size-5 text-slate-400 dark:text-slate-500" aria-hidden />
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${fieldId}-description`} className="text-slate-600 dark:text-slate-300">
          描述
          <span className="text-xs font-normal text-slate-400 dark:text-slate-500">可选</span>
        </Label>
        <textarea
          id={`${fieldId}-description`}
          value={values.description}
          onChange={(event) => updateValue('description', event.target.value)}
          placeholder="一句话介绍这个网站"
          rows={3}
          maxLength={200}
          className={textareaClass}
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

export function BookmarkDialog({
  open,
  onOpenChange,
  groupName,
  bookmark,
  onSubmit,
}: BookmarkDialogProps) {
  const editing = bookmark !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{editing ? '编辑书签' : '新增书签'}</DialogTitle>
          <DialogDescription>
            {editing
              ? '修改后会立即同步到云端。'
              : `书签会保存到「${groupName}」分组。`}
          </DialogDescription>
        </DialogHeader>

        <BookmarkForm
          key={bookmark?.id ?? 'new'}
          bookmark={bookmark}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
