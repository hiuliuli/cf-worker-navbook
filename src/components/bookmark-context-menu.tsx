import { useEffect, useRef } from 'react'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'

import type { Bookmark } from '@/lib/bookmarks'

export type BookmarkMenuState = {
  bookmark: Bookmark
  x: number
  y: number
}

type BookmarkContextMenuProps = {
  state: BookmarkMenuState | null
  onClose: () => void
  onVisit: (bookmark: Bookmark) => void
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmark: Bookmark) => void
}

const MENU_WIDTH = 168
const MENU_HEIGHT = 128

const itemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-900/5 hover:text-slate-900 focus-visible:bg-slate-900/5 focus-visible:text-slate-900 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100 dark:focus-visible:bg-white/10 dark:focus-visible:text-slate-100'

export function BookmarkContextMenu({
  state,
  onClose,
  onVisit,
  onEdit,
  onDelete,
}: BookmarkContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (!menuRef.current?.contains(event.target)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', onClose)
    window.addEventListener('blur', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [state, onClose])

  useEffect(() => {
    if (state) menuRef.current?.focus()
  }, [state])

  if (!state) return null

  const left = Math.max(8, Math.min(state.x, window.innerWidth - MENU_WIDTH - 8))
  const top = Math.max(8, Math.min(state.y, window.innerHeight - MENU_HEIGHT - 8))

  function run(action: (bookmark: Bookmark) => void) {
    return () => {
      if (!state) return
      action(state.bookmark)
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`书签操作：${state.bookmark.title}`}
      tabIndex={-1}
      style={{ left, top }}
      className="fixed z-50 w-42 rounded-xl border border-slate-900/10 bg-white/95 p-1 text-slate-700 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-md outline-none dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-black/40 dark:ring-white/10"
    >
      <button type="button" role="menuitem" onClick={run(onVisit)} className={itemClass}>
        <ExternalLink className="size-4" aria-hidden />
        访问
      </button>
      <button type="button" role="menuitem" onClick={run(onEdit)} className={itemClass}>
        <Pencil className="size-4" aria-hidden />
        编辑
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={run(onDelete)}
        className={`${itemClass} hover:text-rose-600 focus-visible:text-rose-600 dark:hover:text-rose-300 dark:focus-visible:text-rose-300`}
      >
        <Trash2 className="size-4" aria-hidden />
        删除
      </button>
    </div>
  )
}
