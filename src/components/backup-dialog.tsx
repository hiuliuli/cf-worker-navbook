import { useRef, useState, type ChangeEvent } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  parseBackupPayload,
  type BackupData,
  type Bookmark,
  type NavGroup,
} from '@/lib/bookmarks'

type BackupDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NavGroup[]
  bookmarks: Bookmark[]
  onRestore: (data: BackupData) => Promise<void>
}

const panelClass =
  'rounded-2xl border border-slate-900/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]'

const sectionTitleClass =
  'flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100'

const hintClass = 'mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400'

const fileLimit = 2 * 1024 * 1024

function secondaryButtonClass(extra = '') {
  return `inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-900/15 bg-white/70 px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900 disabled:pointer-events-none disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white ${extra}`
}

export function BackupDialog({
  open,
  onOpenChange,
  groups,
  bookmarks,
  onRestore,
}: BackupDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [candidate, setCandidate] = useState<BackupData | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCandidate(null)
      setFileName('')
      setError(null)
    }
    onOpenChange(next)
  }

  function handleExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      groups,
      bookmarks,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    const link = document.createElement('a')
    link.href = url
    link.download = `navbook-backup-${stamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setCandidate(null)
    setError(null)
    setFileName(file.name)

    if (file.size > fileLimit) {
      setError('备份文件不能超过 2 MB')
      return
    }

    try {
      const parsed = parseBackupPayload(JSON.parse(await file.text()))
      if (!parsed) {
        setError('备份文件格式不正确，请选择 NavBook 导出的 JSON 文件')
        return
      }
      setCandidate(parsed)
    } catch {
      setError('无法解析备份文件，请确认文件内容是有效的 JSON')
    }
  }

  async function handleRestore() {
    if (!candidate || pending) return

    setPending(true)
    setError(null)
    try {
      await onRestore(candidate)
      handleOpenChange(false)
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : '恢复失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>备份 / 恢复</DialogTitle>
          <DialogDescription>
            导出当前数据留作备份，或从备份文件恢复分组与书签。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <section className={panelClass}>
            <h3 className={sectionTitleClass}>
              <Download className="size-4" aria-hidden />
              导出备份
            </h3>
            <p className={hintClass}>
              将当前 {groups.length} 个分组、{bookmarks.length} 个书签保存为 JSON 文件。
            </p>
            <button
              type="button"
              onClick={handleExport}
              className={secondaryButtonClass('mt-3')}
            >
              <Download className="size-4" aria-hidden />
              导出备份
            </button>
          </section>

          <section className={panelClass}>
            <h3 className={sectionTitleClass}>
              <Upload className="size-4" aria-hidden />
              恢复备份
            </h3>
            <p className={hintClass}>恢复会用备份内容覆盖当前所有分组和书签，此操作无法撤销。</p>

            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className={secondaryButtonClass('mt-3')}
            >
              <Upload className="size-4" aria-hidden />
              选择备份文件
            </button>

            {candidate && (
              <>
                <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                  {fileName}：{candidate.groups.length} 个分组、{candidate.bookmarks.length} 个书签
                </p>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={pending}
                  className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:pointer-events-none disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {pending ? '恢复中…' : '覆盖并恢复'}
                </button>
              </>
            )}

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
              >
                {error}
              </p>
            )}
          </section>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className={secondaryButtonClass()}
          >
            关闭
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
