import { useEffect, useRef, useState, type FormEvent } from 'react'
import { siBaidu } from 'simple-icons'
import {
  ArchiveRestore,
  Check,
  CircleUserRound,
  FolderPlus,
  Info,
  LogOut,
  Monitor,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import { AboutDialog } from '@/components/about-dialog'
import { BackupDialog } from '@/components/backup-dialog'
import { BookmarkContextMenu, type BookmarkMenuState } from '@/components/bookmark-context-menu'
import { BookmarkDialog } from '@/components/bookmark-dialog'
import { BookmarkGroupSection, BookmarkSkeleton } from '@/components/bookmark-group'
import { GroupDeleteDialog, GroupNameDialog } from '@/components/group-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  createBookmark,
  createGroup,
  deleteBookmark,
  deleteGroup,
  fetchBookmarks,
  renameGroup,
  reorderBookmarks,
  reorderGroups,
  restoreBackup,
  updateBookmark,
  type BackupData,
  type Bookmark,
  type BookmarkInput,
  type NavGroup,
} from '@/lib/bookmarks'

type NavHomeProps = {
  onLogout: () => void
}

type ThemeMode = 'system' | 'light' | 'dark'

const themeStorageKey = 'navbook-theme'
const REORDER_SAVE_DELAY = 400
const themeModes: ThemeMode[] = ['system', 'dark', 'light']
const themeMeta: Record<ThemeMode, { label: string; icon: typeof Monitor }> = {
  system: { label: '跟随系统', icon: Monitor },
  light: { label: '浅色', icon: Sun },
  dark: { label: '深色', icon: Moon },
}

const controlButtonClass =
  'flex size-10 items-center justify-center rounded-lg border border-slate-900/10 bg-white/70 text-slate-600 backdrop-blur-md transition-colors hover:bg-white hover:text-slate-900 data-[state=open]:bg-white data-[state=open]:text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.12] dark:hover:text-white dark:data-[state=open]:bg-white/[0.12] dark:data-[state=open]:text-white'

const searchEngines = {
  bing: { label: 'Bing', url: 'https://www.bing.com/search?q=' },
  google: { label: 'Google', url: 'https://www.google.com/search?q=' },
  baidu: { label: '百度', url: 'https://www.baidu.com/s?wd=' },
} as const

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function BingGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="#258FFA" aria-hidden className={className}>
      <path d="M8.35 5.046a.615.615 0 0 0-.54.575c-.009.13-.006.14.289.899.67 1.727.833 2.142.86 2.2q.101.215.277.395c.089.092.148.141.247.208.176.117.262.15.944.351.664.197 1.026.327 1.338.482.405.201.688.43.866.7.128.195.242.544.291.896.02.137.02.44 0 .564-.041.27-.124.495-.252.684-.067.1-.044.084.055-.039.278-.346.562-.938.707-1.475a4.42 4.42 0 0 0-2.14-5.028 70 70 0 0 0-.888-.465l-.53-.277-.353-.184c-.16-.082-.266-.138-.345-.18-.368-.192-.523-.27-.568-.283a1 1 0 0 0-.194-.03z" />
      <path d="M9.152 11.493a3 3 0 0 0-.135.083 320 320 0 0 0-1.513.934l-.8.496c-.012.01-.587.367-.876.543a1.9 1.9 0 0 1-.732.257c-.12.017-.349.017-.47 0a1.9 1.9 0 0 1-.884-.358 2.5 2.5 0 0 1-.365-.364 1.9 1.9 0 0 1-.34-.76 1 1 0 0 0-.027-.121c-.005-.006.004.092.022.22.018.132.057.324.098.489a4.1 4.1 0 0 0 2.487 2.796c.359.142.72.23 1.114.275.147.016.566.023.72.011a4.1 4.1 0 0 0 1.956-.661l.235-.149.394-.248.258-.163 1.164-.736c.51-.32.663-.433.9-.665.099-.097.248-.262.255-.283.002-.005.028-.046.059-.091a1.64 1.64 0 0 0 .25-.682c.02-.124.02-.427 0-.565a3 3 0 0 0-.213-.758c-.15-.314-.47-.6-.928-.83a2 2 0 0 0-.273-.12c-.006 0-.433.26-.948.58l-1.113.687z" />
      <path d="m3.004 12.184.03.129c.089.402.245.693.515.963a1.82 1.82 0 0 0 1.312.543c.361 0 .673-.09.994-.287l.472-.29.373-.23V5.334c0-1.537-.003-2.45-.008-2.521a1.82 1.82 0 0 0-.535-1.177c-.097-.096-.18-.16-.427-.33L4.183.24c-.239-.163-.258-.175-.33-.2a.63.63 0 0 0-.842.464c-.009.042-.01.603-.01 3.646l.003 8.035Z" />
    </svg>
  )
}

function EngineIcon({
  engine,
  className,
}: {
  engine: keyof typeof searchEngines
  className?: string
}) {
  if (engine === 'google') return <GoogleGlyph className={className} />
  if (engine === 'bing') return <BingGlyph className={className} />
  return (
    <svg role="img" aria-label={siBaidu.title} viewBox="0 0 24 24" className={className} fill="#5780DE">
      <path d={siBaidu.path} />
    </svg>
  )
}

function greetingFor(hour: number) {
  if (hour < 5 || hour >= 23) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return {
    greeting: greetingFor(now.getHours()),
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    date: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`,
  }
}

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = window.localStorage.getItem(themeStorageKey)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }

    apply()
    window.localStorage.setItem(themeStorageKey, mode)
    if (mode !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode])

  return { mode, setMode }
}

function GroupSkeleton() {
  return (
    <section>
      <div className="mb-3.5 flex h-8 items-center">
        <span className="h-5 w-20 animate-pulse rounded-lg bg-slate-900/[0.07] dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <BookmarkSkeleton key={index} />
        ))}
      </div>
    </section>
  )
}

export function NavHome({ onLogout }: NavHomeProps) {
  const { greeting, time, date } = useClock()
  const { mode: themeMode, setMode: setThemeMode } = useTheme()
  const ThemeIcon = themeMeta[themeMode].icon
  const [engine, setEngine] = useState<keyof typeof searchEngines>('bing')
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<NavGroup[]>([])
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loadingBookmarks, setLoadingBookmarks] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [editor, setEditor] = useState<{
    groupId: string
    groupName: string
    bookmark: Bookmark | null
  } | null>(null)
  const [groupEditor, setGroupEditor] = useState<
    { mode: 'create' } | { mode: 'rename'; group: NavGroup } | null
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<NavGroup | null>(null)
  const [sorting, setSorting] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [bookmarkDragId, setBookmarkDragId] = useState<string | null>(null)
  const [bookmarkDrop, setBookmarkDrop] = useState<{
    groupId: string
    beforeId: string | null
  } | null>(null)
  const [bookmarkMenu, setBookmarkMenu] = useState<BookmarkMenuState | null>(null)
  const [bookmarkError, setBookmarkError] = useState<string | null>(null)
  const [panel, setPanel] = useState<'backup' | 'about' | null>(null)
  const groupSaveTimer = useRef<number | null>(null)
  const groupSaveBase = useRef<NavGroup[] | null>(null)
  const groupSavePending = useRef<NavGroup[] | null>(null)
  const bookmarkSaveTimer = useRef<number | null>(null)
  const bookmarkSaveBase = useRef<Bookmark[] | null>(null)
  const bookmarkSavePending = useRef<Bookmark[] | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchBookmarks()
      .then((data) => {
        if (cancelled) return
        setGroups(data.groups)
        setBookmarks(data.bookmarks)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : '书签加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBookmarks(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (groupSaveTimer.current !== null) window.clearTimeout(groupSaveTimer.current)
      if (bookmarkSaveTimer.current !== null) window.clearTimeout(bookmarkSaveTimer.current)
    }
  }, [])

  function cycleTheme() {
    const next = (themeModes.indexOf(themeMode) + 1) % themeModes.length
    setThemeMode(themeModes[next])
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyword = query.trim()
    if (!keyword) return
    window.open(
      `${searchEngines[engine].url}${encodeURIComponent(keyword)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function flushGroupSave() {
    if (groupSaveTimer.current !== null) {
      window.clearTimeout(groupSaveTimer.current)
      groupSaveTimer.current = null
    }

    const pending = groupSavePending.current
    const base = groupSaveBase.current
    groupSavePending.current = null
    groupSaveBase.current = null
    if (!pending) return

    try {
      setGroups(await reorderGroups(pending.map((group) => group.id)))
      setReorderError(null)
    } catch (error) {
      if (base) setGroups(base)
      setReorderError(error instanceof Error ? error.message : '分组排序保存失败')
    }
  }

  async function flushBookmarkSave() {
    if (bookmarkSaveTimer.current !== null) {
      window.clearTimeout(bookmarkSaveTimer.current)
      bookmarkSaveTimer.current = null
    }

    const pending = bookmarkSavePending.current
    const base = bookmarkSaveBase.current
    bookmarkSavePending.current = null
    bookmarkSaveBase.current = null
    if (!pending) return

    try {
      setBookmarks(
        await reorderBookmarks(
          pending.map((bookmark) => ({ id: bookmark.id, group: bookmark.group })),
        ),
      )
      setBookmarkError(null)
    } catch (error) {
      if (base) setBookmarks(base)
      setBookmarkError(error instanceof Error ? error.message : '书签排序保存失败')
    }
  }

  function resetPendingSaves() {
    if (groupSaveTimer.current !== null) {
      window.clearTimeout(groupSaveTimer.current)
      groupSaveTimer.current = null
    }
    if (bookmarkSaveTimer.current !== null) {
      window.clearTimeout(bookmarkSaveTimer.current)
      bookmarkSaveTimer.current = null
    }
    groupSaveBase.current = null
    groupSavePending.current = null
    bookmarkSaveBase.current = null
    bookmarkSavePending.current = null
  }

  function commitGroupOrder(next: NavGroup[]) {
    if (groupSaveBase.current === null) groupSaveBase.current = groups
    groupSavePending.current = next
    setGroups(next)
    setReorderError(null)

    if (groupSaveTimer.current !== null) window.clearTimeout(groupSaveTimer.current)
    groupSaveTimer.current = window.setTimeout(() => {
      groupSaveTimer.current = null
      void flushGroupSave()
    }, REORDER_SAVE_DELAY)
  }

  function commitBookmarkOrder(next: Bookmark[]) {
    if (bookmarkSaveBase.current === null) bookmarkSaveBase.current = bookmarks
    bookmarkSavePending.current = next
    setBookmarks(next)
    setBookmarkError(null)

    if (bookmarkSaveTimer.current !== null) window.clearTimeout(bookmarkSaveTimer.current)
    bookmarkSaveTimer.current = window.setTimeout(() => {
      bookmarkSaveTimer.current = null
      void flushBookmarkSave()
    }, REORDER_SAVE_DELAY)
  }

  async function handleSave(values: BookmarkInput) {
    if (!editor) return
    await flushBookmarkSave()

    if (editor.bookmark) {
      const updated = await updateBookmark(editor.bookmark.id, values)
      setBookmarks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } else {
      const created = await createBookmark({ ...values, group: editor.groupId })
      setBookmarks((current) => [...current, created])
    }

    setEditor(null)
  }

  async function handleGroupName(name: string) {
    if (!groupEditor) return
    await flushGroupSave()

    if (groupEditor.mode === 'create') {
      const created = await createGroup(name)
      setGroups((current) => [...current, created])
    } else {
      const updated = await renameGroup(groupEditor.group.id, name)
      setGroups((current) =>
        current.map((group) => (group.id === updated.id ? updated : group)),
      )
    }

    setGroupEditor(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await flushGroupSave()
    await flushBookmarkSave()

    const groupId = deleteTarget.id
    await deleteGroup(groupId)
    const nextGroups = groups.filter((group) => group.id !== groupId)
    setGroups(nextGroups)
    setBookmarks((current) => current.filter((bookmark) => bookmark.group !== groupId))
    if (nextGroups.length === 0) {
      setSorting(false)
      setDraggingId(null)
      setDragOverId(null)
      setBookmarkDragId(null)
      setBookmarkDrop(null)
    }
    setDeleteTarget(null)
  }

  function toggleSorting() {
    if (sorting) {
      setDraggingId(null)
      setDragOverId(null)
      setBookmarkDragId(null)
      setBookmarkDrop(null)
    }
    setSorting(!sorting)
  }

  function handleGroupDrop(targetId: string) {
    const sourceId = draggingId
    setDraggingId(null)
    setDragOverId(null)
    if (!sorting || !sourceId || sourceId === targetId) return

    const from = groups.findIndex((group) => group.id === sourceId)
    const to = groups.findIndex((group) => group.id === targetId)
    if (from === -1 || to === -1) return

    const next = [...groups]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commitGroupOrder(next)
  }

  function handleBookmarkDragStart(bookmark: Bookmark) {
    setBookmarkDragId(bookmark.id)
    setBookmarkDrop(null)
    setDraggingId(null)
    setDragOverId(null)
  }

  function handleBookmarkDragEnd() {
    setBookmarkDragId(null)
    setBookmarkDrop(null)
  }

  function handleBookmarkDragOver(groupId: string, beforeId: string | null) {
    setBookmarkDrop((current) => {
      if (current && current.groupId === groupId && current.beforeId === beforeId) return current
      return { groupId, beforeId }
    })
  }

  function handleBookmarkDrop(groupId: string, beforeId: string | null) {
    const sourceId = bookmarkDragId
    setBookmarkDragId(null)
    setBookmarkDrop(null)
    if (!sourceId || beforeId === sourceId) return

    const source = bookmarks.find((bookmark) => bookmark.id === sourceId)
    if (!source) return

    const rest = bookmarks.filter((bookmark) => bookmark.id !== sourceId)
    const moved = source.group === groupId ? source : { ...source, group: groupId }

    let next: Bookmark[]
    if (beforeId) {
      const index = rest.findIndex((bookmark) => bookmark.id === beforeId)
      next =
        index === -1 ? [...rest, moved] : [...rest.slice(0, index), moved, ...rest.slice(index)]
    } else {
      let lastIndex = -1
      rest.forEach((bookmark, index) => {
        if (bookmark.group === groupId) lastIndex = index
      })
      next = [...rest.slice(0, lastIndex + 1), moved, ...rest.slice(lastIndex + 1)]
    }

    const unchanged = next.every(
      (bookmark, index) =>
        bookmark.id === bookmarks[index].id && bookmark.group === bookmarks[index].group,
    )
    if (unchanged) return

    commitBookmarkOrder(next)
  }

  function handleVisit(bookmark: Bookmark) {
    if (bookmark.url.startsWith('http')) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer')
      return
    }
    window.location.assign(bookmark.url)
  }

  function handleMenuEdit(bookmark: Bookmark) {
    const group = groups.find((item) => item.id === bookmark.group)
    setEditor({ groupId: bookmark.group, groupName: group?.name ?? '', bookmark })
  }

  async function handleDeleteBookmark(bookmark: Bookmark) {
    await flushBookmarkSave()
    const previous = bookmarks
    setBookmarkError(null)
    setBookmarks((current) => current.filter((item) => item.id !== bookmark.id))

    try {
      await deleteBookmark(bookmark.id)
    } catch (error) {
      setBookmarks(previous)
      setBookmarkError(error instanceof Error ? error.message : '删除书签失败')
    }
  }

  async function handleRestore(data: BackupData) {
    resetPendingSaves()
    const restored = await restoreBackup(data)

    setGroups(restored.groups)
    setBookmarks(restored.bookmarks)
    setSorting(false)
    setDraggingId(null)
    setDragOverId(null)
    setBookmarkDragId(null)
    setBookmarkDrop(null)
    setBookmarkMenu(null)
    setReorderError(null)
    setBookmarkError(null)
    setLoadError(null)
  }

  const deleteCount = deleteTarget
    ? bookmarks.filter((bookmark) => bookmark.group === deleteTarget.id).length
    : 0

  return (
    <div className="navbook-bg flex min-h-svh flex-col text-slate-900 dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl flex-1 px-5 pb-12 pt-6 sm:px-8">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" width={28} height={28} className="size-7" />
            <span className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              NavBook
            </span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleTheme}
              title={`主题：${themeMeta[themeMode].label}（点击切换）`}
              className={controlButtonClass}
            >
              <ThemeIcon className="size-5" aria-hidden />
              <span className="sr-only">切换主题（当前：{themeMeta[themeMode].label}）</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="用户菜单" className={controlButtonClass}>
                  <CircleUserRound className="size-5" aria-hidden />
                  <span className="sr-only">打开用户菜单</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-44 bg-white/95 text-slate-800 ring-slate-900/10 backdrop-blur-md [--accent-foreground:#334155] dark:bg-slate-900/95 dark:text-slate-200 dark:ring-white/10 dark:[--accent-foreground:#cbd5e1]"
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">
                  已登录
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-900/10 dark:bg-white/10" />
                <DropdownMenuItem
                  onSelect={() => setGroupEditor({ mode: 'create' })}
                  className="cursor-pointer gap-2 px-2 py-1.5 text-slate-700 focus:bg-slate-900/5 dark:text-slate-300 dark:focus:bg-white/10"
                >
                  <FolderPlus className="size-4" aria-hidden />
                  新建分组
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setPanel('backup')}
                  className="cursor-pointer gap-2 px-2 py-1.5 text-slate-700 focus:bg-slate-900/5 dark:text-slate-300 dark:focus:bg-white/10"
                >
                  <ArchiveRestore className="size-4" aria-hidden />
                  备份/恢复
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setPanel('about')}
                  className="cursor-pointer gap-2 px-2 py-1.5 text-slate-700 focus:bg-slate-900/5 dark:text-slate-300 dark:focus:bg-white/10"
                >
                  <Info className="size-4" aria-hidden />
                  关于
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-900/10 dark:bg-white/10" />
                <DropdownMenuItem
                  onSelect={onLogout}
                  className="cursor-pointer gap-2 px-2 py-1.5 text-slate-700 focus:bg-slate-900/5 dark:text-slate-300 dark:focus:bg-white/10"
                >
                  <LogOut className="size-4" aria-hidden />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <section className="flex flex-col items-center pt-16 sm:pt-20">
          <div className="flex items-center justify-center gap-4 sm:gap-5">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting}
            </h1>
            <span aria-hidden className="h-7 w-px bg-slate-900/15 sm:h-8 dark:bg-white/20" />
            <span className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
              {time}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{date}</p>

          <form
            onSubmit={handleSearch}
            className="mt-9 flex h-14 w-full max-w-2xl items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 p-2.5 shadow-sm shadow-slate-900/5 backdrop-blur-md transition-colors focus-within:border-slate-900/25 focus-within:bg-white/90 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20 dark:focus-within:border-white/25 dark:focus-within:bg-white/[0.09]"
          >
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={`切换搜索引擎（当前：${searchEngines[engine].label}）`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <EngineIcon engine={engine} className="size-5" />
                  <span className="sr-only">切换搜索引擎</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                alignOffset={-11}
                sideOffset={20}
                className="w-[672px] max-w-[calc(100vw_-_40px)] border border-slate-900/10 bg-white/95 p-1.5 text-slate-700 shadow-lg shadow-slate-900/5 ring-slate-900/10 backdrop-blur-md sm:max-w-[calc(100vw_-_64px)] dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-black/30 dark:ring-white/10 dark:[--accent-foreground:#cbd5e1]"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(searchEngines) as Array<keyof typeof searchEngines>).map((key) => (
                    <DropdownMenuItem
                      key={key}
                      onSelect={() => setEngine(key)}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-slate-700 focus:bg-slate-900/5 dark:text-slate-300 dark:focus:bg-white/10"
                    >
                      <EngineIcon engine={key} className="size-5 shrink-0" />
                      <span className="text-sm font-medium">{searchEngines[key].label}</span>
                      {engine === key && <Check className="ml-auto size-4" aria-hidden />}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`在 ${searchEngines[engine].label} 搜索`}
              aria-label="搜索内容"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              aria-label="搜索"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Search className="size-5" aria-hidden />
            </button>
          </form>
        </section>

        <div className="mt-12 space-y-9">
          {loadError ? (
            <p className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
              书签加载失败：{loadError}
            </p>
          ) : (
            <>
              {reorderError && (
                <p
                  role="alert"
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                >
                  分组排序保存失败：{reorderError}
                </p>
              )}

              {bookmarkError && (
                <p
                  role="alert"
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
                >
                  书签操作失败：{bookmarkError}
                </p>
              )}

              {loadingBookmarks && groups.length === 0 ? (
                <>
                  <GroupSkeleton />
                  <GroupSkeleton />
                </>
              ) : groups.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setGroupEditor({ mode: 'create' })}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-900/15 bg-white/40 px-4 py-7 text-sm text-slate-500 transition-colors hover:border-slate-900/25 hover:bg-white/70 hover:text-slate-700 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-white/25 dark:hover:bg-white/[0.07] dark:hover:text-slate-200"
                >
                  <FolderPlus className="size-4" aria-hidden />
                  还没有分组，新建一个
                </button>
              ) : (
                groups.map((group) => (
                  <BookmarkGroupSection
                    key={group.id}
                    group={group}
                    items={bookmarks.filter((bookmark) => bookmark.group === group.id)}
                    sorting={sorting}
                    groupDragging={draggingId === group.id}
                    groupDragOver={dragOverId === group.id && draggingId !== group.id}
                    bookmarkDragId={bookmarkDragId}
                    bookmarkDrop={
                      bookmarkDrop?.groupId === group.id
                        ? { beforeId: bookmarkDrop.beforeId }
                        : null
                    }
                    onToggleSorting={toggleSorting}
                    onAdd={() =>
                      setEditor({ groupId: group.id, groupName: group.name, bookmark: null })
                    }
                    onRename={() => setGroupEditor({ mode: 'rename', group })}
                    onDelete={() => setDeleteTarget(group)}
                    onGroupDragStart={() => {
                      setDraggingId(group.id)
                      setDragOverId(null)
                      setBookmarkDragId(null)
                      setBookmarkDrop(null)
                    }}
                    onGroupDragEnd={() => {
                      setDraggingId(null)
                      setDragOverId(null)
                    }}
                    onGroupDragOver={() => setDragOverId(group.id)}
                    onGroupDragLeave={() =>
                      setDragOverId((current) => (current === group.id ? null : current))
                    }
                    onGroupDrop={() => handleGroupDrop(group.id)}
                    onBookmarkMenu={(bookmark, x, y) => setBookmarkMenu({ bookmark, x, y })}
                    onBookmarkDragStart={handleBookmarkDragStart}
                    onBookmarkDragEnd={handleBookmarkDragEnd}
                    onBookmarkDragOver={(beforeId) => handleBookmarkDragOver(group.id, beforeId)}
                    onBookmarkDrop={(beforeId) => handleBookmarkDrop(group.id, beforeId)}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-9 sm:px-8">
        <div className="flex flex-col items-center gap-1.5 border-t border-slate-900/10 pt-6 text-xs text-slate-400 sm:flex-row sm:justify-between dark:border-white/10 dark:text-slate-500">
          <span className="font-heading text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">
            NavBook
          </span>
          <span>一个简洁的个人书签导航页</span>
        </div>
      </footer>

      <BookmarkDialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        groupName={editor?.groupName ?? ''}
        bookmark={editor?.bookmark ?? null}
        onSubmit={handleSave}
      />

      <GroupNameDialog
        open={groupEditor !== null}
        onOpenChange={(open) => {
          if (!open) setGroupEditor(null)
        }}
        mode={groupEditor?.mode ?? 'rename'}
        group={groupEditor?.mode === 'rename' ? groupEditor.group : null}
        onSubmit={handleGroupName}
      />

      <GroupDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        group={deleteTarget}
        bookmarkCount={deleteCount}
        onConfirm={handleDelete}
      />

      <BookmarkContextMenu
        state={bookmarkMenu}
        onClose={() => setBookmarkMenu(null)}
        onVisit={handleVisit}
        onEdit={handleMenuEdit}
        onDelete={(bookmark) => {
          void handleDeleteBookmark(bookmark)
        }}
      />

      <BackupDialog
        open={panel === 'backup'}
        onOpenChange={(open) => setPanel(open ? 'backup' : null)}
        groups={groups}
        bookmarks={bookmarks}
        onRestore={handleRestore}
      />

      <AboutDialog
        open={panel === 'about'}
        onOpenChange={(open) => setPanel(open ? 'about' : null)}
      />
    </div>
  )
}
