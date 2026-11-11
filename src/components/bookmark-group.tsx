import { useState, type DragEvent } from 'react'
import { GripVertical, Move, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from 'cn'

import type { Bookmark, NavGroup } from '@/lib/bookmarks'

const iconTones = [
  'bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300',
  'bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
  'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300',
  'bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300',
  'bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300',
]

const iconTileClass =
  'relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-900/5 bg-white/85 shadow-sm shadow-slate-900/5 dark:border-white/15 dark:bg-white/85'

const fallbackTileClass =
  'flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-900/5 text-sm font-semibold dark:border-white/10'

const iconButtonBase =
  'flex size-7 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-inset focus-visible:outline-none dark:focus-visible:ring-white/20'

const actionButtonClass = cn(
  iconButtonBase,
  'text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200',
)

const activeActionButtonClass = cn(
  iconButtonBase,
  'bg-slate-900/5 text-slate-700 hover:bg-slate-900/[0.08] dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/[0.15]',
)

const dropIndicatorClass =
  'pointer-events-none absolute inset-y-1.5 z-10 w-[3px] rounded-full bg-primary'

function hostOf(url: string): string {
  try {
    const { hostname } = new URL(url, window.location.origin)
    return hostname.replace(/^www\./, '') || url
  } catch {
    return url
  }
}

function BookmarkIcon({ bookmark }: { bookmark: Bookmark }) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null)
  const [loadedIcon, setLoadedIcon] = useState<string | null>(null)

  const letter = bookmark.title.slice(0, 1).toUpperCase()
  const tone =
    [...bookmark.title].reduce((total, char) => total + (char.codePointAt(0) ?? 0), 0) %
    iconTones.length

  if (!bookmark.icon || failedIcon === bookmark.icon) {
    return <span className={`${fallbackTileClass} ${iconTones[tone]}`}>{letter}</span>
  }

  const loaded = loadedIcon === bookmark.icon

  return (
    <span className={iconTileClass}>
      <span
        aria-hidden
        className={`text-sm font-semibold text-slate-400 transition-opacity duration-200 dark:text-slate-500 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {letter}
      </span>
      <img
        src={bookmark.icon}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoadedIcon(bookmark.icon)}
        onError={() => setFailedIcon(bookmark.icon)}
        className={`absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  )
}

type BookmarkCardProps = {
  bookmark: Bookmark
  nextId: string | null
  sorting: boolean
  dragging: boolean
  dropBefore: boolean
  dropAfter: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (beforeId: string | null) => void
  onDrop: (beforeId: string | null) => void
  onMenu: (x: number, y: number) => void
}

function BookmarkCard({
  bookmark,
  nextId,
  sorting,
  dragging,
  dropBefore,
  dropAfter,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMenu,
}: BookmarkCardProps) {
  const external = bookmark.url.startsWith('http')

  function beforeIdFor(event: DragEvent<HTMLDivElement>): string | null {
    const rect = event.currentTarget.getBoundingClientRect()
    const vertical = (event.clientY - rect.top) / rect.height
    const before =
      vertical < 0.3
        ? true
        : vertical > 0.7
          ? false
          : (event.clientX - rect.left) / rect.width < 0.5
    return before ? bookmark.id : nextId
  }

  return (
    <div
      draggable={sorting}
      onDragStart={(event) => {
        if (!sorting) return
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', bookmark.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!sorting) return
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'
        onDragOver(beforeIdFor(event))
      }}
      onDrop={(event) => {
        if (!sorting) return
        event.preventDefault()
        event.stopPropagation()
        onDrop(beforeIdFor(event))
      }}
      onClick={(event) => {
        if (!sorting) return
        event.preventDefault()
        event.stopPropagation()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        onMenu(event.clientX, event.clientY)
      }}
      className={cn(
        'group/card relative',
        sorting && 'cursor-grab select-none active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      {dropBefore && <span aria-hidden className={`${dropIndicatorClass} -left-2`} />}
      {dropAfter && <span aria-hidden className={`${dropIndicatorClass} -right-2`} />}

      <a
        href={bookmark.url}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        draggable={false}
        className="flex min-w-0 items-center gap-3.5 rounded-2xl border border-slate-900/5 bg-white/65 p-3.5 shadow-sm shadow-slate-900/5 backdrop-blur-md transition-colors group-hover/card:border-slate-900/10 group-hover/card:bg-white/90 dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-black/20 dark:group-hover/card:border-white/15 dark:group-hover/card:bg-white/[0.09]"
      >
        <BookmarkIcon bookmark={bookmark} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
            {bookmark.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
            {bookmark.description || hostOf(bookmark.url)}
          </span>
        </span>
      </a>
    </div>
  )
}

export function BookmarkSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-900/5 bg-white/45 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
      <span className="size-11 shrink-0 animate-pulse rounded-xl bg-slate-900/[0.06] dark:bg-white/10" />
      <span className="flex-1 space-y-2">
        <span className="block h-3 w-1/2 animate-pulse rounded bg-slate-900/[0.08] dark:bg-white/10" />
        <span className="block h-2.5 w-3/4 animate-pulse rounded bg-slate-900/[0.06] dark:bg-white/[0.07]" />
      </span>
    </div>
  )
}

type BookmarkGroupSectionProps = {
  group: NavGroup
  items: Bookmark[]
  sorting: boolean
  groupDragging: boolean
  groupDragOver: boolean
  bookmarkDragId: string | null
  bookmarkDrop: { beforeId: string | null } | null
  onToggleSorting: () => void
  onAdd: () => void
  onRename: () => void
  onDelete: () => void
  onGroupDragStart: () => void
  onGroupDragEnd: () => void
  onGroupDragOver: () => void
  onGroupDragLeave: () => void
  onGroupDrop: () => void
  onBookmarkMenu: (bookmark: Bookmark, x: number, y: number) => void
  onBookmarkDragStart: (bookmark: Bookmark) => void
  onBookmarkDragEnd: () => void
  onBookmarkDragOver: (beforeId: string | null) => void
  onBookmarkDrop: (beforeId: string | null) => void
}

export function BookmarkGroupSection({
  group,
  items,
  sorting,
  groupDragging,
  groupDragOver,
  bookmarkDragId,
  bookmarkDrop,
  onToggleSorting,
  onAdd,
  onRename,
  onDelete,
  onGroupDragStart,
  onGroupDragEnd,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onBookmarkMenu,
  onBookmarkDragStart,
  onBookmarkDragEnd,
  onBookmarkDragOver,
  onBookmarkDrop,
}: BookmarkGroupSectionProps) {
  const bookmarkDragging = bookmarkDragId !== null

  return (
    <section
      className={cn('relative transition-opacity duration-200', groupDragging && 'opacity-40')}
      onDragOver={(event) => {
        if (!sorting) return

        if (bookmarkDragging) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          onBookmarkDragOver(null)
          return
        }

        if (groupDragging) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onGroupDragOver()
      }}
      onDragLeave={(event) => {
        if (!sorting || bookmarkDragging) return
        const next = event.relatedTarget
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) onGroupDragLeave()
      }}
      onDrop={(event) => {
        if (!sorting) return
        event.preventDefault()
        if (bookmarkDragging) {
          onBookmarkDrop(null)
          return
        }
        onGroupDrop()
      }}
    >
      {groupDragOver && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-[19px] h-0.5 rounded-full bg-slate-900/25 dark:bg-white/35"
        />
      )}

      <div className="group/header mb-3.5 flex h-8 items-center gap-2">
        {sorting && (
          <button
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', group.id)
              onGroupDragStart()
            }}
            onDragEnd={onGroupDragEnd}
            title="拖放排序分组"
            aria-label={`拖放排序分组 ${group.name}`}
            className={cn(
              actionButtonClass,
              '-ml-1 shrink-0 cursor-grab active:cursor-grabbing',
            )}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        )}

        <h2 className="min-w-0 truncate font-heading text-lg font-bold tracking-tight text-slate-800 sm:text-xl dark:text-slate-100">
          {group.name}
        </h2>

        <div
          className={cn(
            'grid shrink-0',
            sorting
              ? 'grid-cols-[1fr]'
              : 'grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out group-hover/header:grid-cols-[1fr] group-focus-within/header:grid-cols-[1fr] [@media(hover:none)]:grid-cols-[1fr]',
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                'flex items-center gap-0.5 pl-1',
                sorting
                  ? 'opacity-100'
                  : 'opacity-0 -translate-x-2 transition-[opacity,transform] duration-300 ease-out group-hover/header:translate-x-0 group-hover/header:opacity-100 group-focus-within/header:translate-x-0 group-focus-within/header:opacity-100 [@media(hover:none)]:translate-x-0 [@media(hover:none)]:opacity-100',
              )}
            >
              <button
                type="button"
                onClick={onToggleSorting}
                aria-pressed={sorting}
                title={sorting ? '退出拖放排序' : '进入拖放排序'}
                aria-label={sorting ? '退出拖放排序' : '进入拖放排序'}
                className={cn(actionButtonClass, sorting && activeActionButtonClass)}
              >
                <Move className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onAdd}
                title="新增书签"
                aria-label={`在 ${group.name} 新增书签`}
                className={actionButtonClass}
              >
                <Plus className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onRename}
                title="重命名分组"
                aria-label={`重命名分组 ${group.name}`}
                className={actionButtonClass}
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="删除分组"
                aria-label={`删除分组 ${group.name}`}
                className={cn(
                  actionButtonClass,
                  'hover:text-rose-600 dark:hover:text-rose-300',
                )}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-7 text-sm transition-colors',
            sorting && bookmarkDrop
              ? 'border-primary/60 bg-primary/5 text-slate-600 dark:border-primary/50 dark:bg-primary/10 dark:text-slate-300'
              : 'border-slate-900/15 bg-white/40 text-slate-500 hover:border-slate-900/25 hover:bg-white/70 hover:text-slate-700 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-white/25 dark:hover:bg-white/[0.07] dark:hover:text-slate-200',
          )}
        >
          <Plus className="size-4" aria-hidden />
          还没有书签，添加一个
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((bookmark, index) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              nextId={items[index + 1]?.id ?? null}
              sorting={sorting}
              dragging={bookmarkDragId === bookmark.id}
              dropBefore={bookmarkDrop !== null && bookmarkDrop.beforeId === bookmark.id}
              dropAfter={
                bookmarkDrop !== null &&
                bookmarkDrop.beforeId === null &&
                index === items.length - 1
              }
              onDragStart={() => onBookmarkDragStart(bookmark)}
              onDragEnd={onBookmarkDragEnd}
              onDragOver={onBookmarkDragOver}
              onDrop={onBookmarkDrop}
              onMenu={(x, y) => onBookmarkMenu(bookmark, x, y)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
