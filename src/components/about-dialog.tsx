import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AboutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const rows = [
  ['存储', 'Cloudflare Workers KV'],
  ['主题', '浅色 / 深色 / 跟随系统'],
  ['排序', '分组与书签拖放排序'],
] as const

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(event) => event.preventDefault()}
        className="sm:max-w-sm"
      >
        <DialogHeader>
          <img src="/icon.svg" alt="" width={44} height={44} className="mb-1 size-11" />
          <DialogTitle>关于 NavBook</DialogTitle>
          <DialogDescription>一个简洁的个人书签导航页。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p className="leading-6">
            集中收纳常用站点与收藏，支持分组管理、拖放排序和深浅色主题，数据实时保存在云端。
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 rounded-xl border border-slate-900/10 bg-white/60 px-3.5 py-3 text-xs dark:border-white/10 dark:bg-white/[0.04]">
            {rows.map(([label, value]) => (
              <div key={label} className="col-span-2 grid grid-cols-subgrid">
                <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
                <dd className="text-slate-600 dark:text-slate-300">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-900/15 bg-white/70 px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
          >
            关闭
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
