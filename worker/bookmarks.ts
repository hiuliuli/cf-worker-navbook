export type NavGroup = {
  id: string
  name: string
}

export type Bookmark = {
  id: string
  group: string
  title: string
  url: string
  icon: string
  description: string
}

export type BookmarkInput = {
  title: string
  url: string
  icon: string
  description: string
}

type ParseResult =
  | { ok: true; data: BookmarkInput }
  | { ok: false; error: string }

export type BackupData = {
  groups: NavGroup[]
  bookmarks: Bookmark[]
}

const BOOKMARKS_KEY = 'bookmarks:v1'
const GROUPS_KEY = 'groups:v1'
const TITLE_LIMIT = 80
const DESCRIPTION_LIMIT = 200
const URL_LIMIT = 2048
const GROUP_NAME_LIMIT = 40
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const ID_LENGTH = 10
const ID_LIMIT = 64
const BACKUP_GROUP_LIMIT = 500
const BACKUP_BOOKMARK_LIMIT = 5000

const defaultGroups: NavGroup[] = [
  { id: 'frequent', name: '常用' },
  { id: 'favorite', name: '收藏' },
]

function normalizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value || value.length > URL_LIMIT) return null

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? candidate : null
  } catch {
    return null
  }
}

function normalizeLink(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const value = raw.trim()
    if (value.startsWith('/') && !value.startsWith('//')) {
      return value.length <= URL_LIMIT ? value : null
    }
  }
  return normalizeHttpUrl(raw)
}

export function parseBookmarkInput(value: unknown): ParseResult {
  if (!value || typeof value !== 'object') return { ok: false, error: '请求数据格式错误' }
  const body = value as Record<string, unknown>

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return { ok: false, error: '请输入书签标题' }
  if (title.length > TITLE_LIMIT) {
    return { ok: false, error: `标题不能超过 ${TITLE_LIMIT} 个字符` }
  }

  const url = normalizeLink(body.url)
  if (!url) return { ok: false, error: '请输入有效的链接' }

  let icon = ''
  if (typeof body.icon === 'string' && body.icon.trim()) {
    const parsedIcon = normalizeHttpUrl(body.icon)
    if (!parsedIcon) return { ok: false, error: '图标链接格式不正确' }
    icon = parsedIcon
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > DESCRIPTION_LIMIT) {
    return { ok: false, error: `描述不能超过 ${DESCRIPTION_LIMIT} 个字符` }
  }

  return { ok: true, data: { title, url, icon, description } }
}

function createId(): string {
  let id = ''
  while (id.length < ID_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH))
    for (const byte of bytes) {
      if (byte >= 248) continue
      id += ID_ALPHABET[byte % ID_ALPHABET.length]
      if (id.length === ID_LENGTH) break
    }
  }
  return id
}

function createUniqueId(taken: Iterable<string>): string {
  const used = new Set(taken)
  let id = createId()
  while (used.has(id)) id = createId()
  return id
}

export function parseBackup(
  value: unknown,
): { ok: true; data: BackupData } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') return { ok: false, error: '备份格式错误' }
  const { groups, bookmarks } = value as { groups?: unknown; bookmarks?: unknown }
  if (!Array.isArray(groups) || !Array.isArray(bookmarks)) {
    return { ok: false, error: '备份格式错误' }
  }
  if (groups.length > BACKUP_GROUP_LIMIT) return { ok: false, error: '备份分组数量超出限制' }
  if (bookmarks.length > BACKUP_BOOKMARK_LIMIT) {
    return { ok: false, error: '备份书签数量超出限制' }
  }

  const nextGroups: NavGroup[] = []
  const groupIds = new Set<string>()
  for (const item of groups) {
    if (!item || typeof item !== 'object') return { ok: false, error: '备份中的分组格式错误' }
    const { id, name } = item as Record<string, unknown>
    const parsedId = typeof id === 'string' ? id.trim() : ''
    if (!parsedId || parsedId.length > ID_LIMIT || groupIds.has(parsedId)) {
      return { ok: false, error: '备份中的分组 ID 无效' }
    }
    const parsedName = parseGroupName(name)
    if (!parsedName.ok) return { ok: false, error: `分组名称无效：${parsedName.error}` }

    groupIds.add(parsedId)
    nextGroups.push({ id: parsedId, name: parsedName.name })
  }

  const nextBookmarks: Bookmark[] = []
  const bookmarkIds = new Set<string>()
  for (const item of bookmarks) {
    if (!item || typeof item !== 'object') return { ok: false, error: '备份中的书签格式错误' }
    const body = item as Record<string, unknown>
    const parsedId = typeof body.id === 'string' ? body.id.trim() : ''
    if (!parsedId || parsedId.length > ID_LIMIT || bookmarkIds.has(parsedId)) {
      return { ok: false, error: '备份中的书签 ID 无效' }
    }
    if (typeof body.group !== 'string' || !groupIds.has(body.group)) {
      return { ok: false, error: '备份中的书签分组不存在' }
    }
    const parsed = parseBookmarkInput(body)
    if (!parsed.ok) return { ok: false, error: `书签「${body.title ?? ''}」无效：${parsed.error}` }

    bookmarkIds.add(parsedId)
    nextBookmarks.push({ id: parsedId, group: body.group, ...parsed.data })
  }

  return { ok: true, data: { groups: nextGroups, bookmarks: nextBookmarks } }
}

export function parseBookmarkOrder(
  value: unknown,
): Array<{ id: string; group: string }> | null {
  if (!value || typeof value !== 'object') return null
  const items = (value as { items?: unknown }).items
  if (!Array.isArray(items)) return null

  const result: Array<{ id: string; group: string }> = []
  for (const item of items) {
    if (!item || typeof item !== 'object') return null
    const { id, group } = item as Record<string, unknown>
    if (typeof id !== 'string' || typeof group !== 'string') return null
    result.push({ id, group })
  }
  return result
}

export function parseGroupName(value: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== 'string') return { ok: false, error: '请输入分组名称' }
  const name = value.trim()
  if (!name) return { ok: false, error: '请输入分组名称' }
  if (name.length > GROUP_NAME_LIMIT) {
    return { ok: false, error: `分组名称不能超过 ${GROUP_NAME_LIMIT} 个字符` }
  }
  return { ok: true, name }
}

async function writeGroups(env: Env, groups: NavGroup[]): Promise<void> {
  await env.NAVBOOK_KV.put(GROUPS_KEY, JSON.stringify(groups))
}

export async function listGroups(env: Env): Promise<NavGroup[]> {
  const stored = await env.NAVBOOK_KV.get<NavGroup[]>(GROUPS_KEY, 'json')
  if (Array.isArray(stored)) return stored

  await writeGroups(env, defaultGroups)
  return structuredClone(defaultGroups)
}

export async function createGroup(env: Env, name: string): Promise<NavGroup> {
  const groups = await listGroups(env)
  const group: NavGroup = {
    id: createUniqueId(groups.map((item) => item.id)),
    name,
  }
  await writeGroups(env, [...groups, group])
  return group
}

export async function renameGroup(env: Env, id: string, name: string): Promise<NavGroup | null> {
  const groups = await listGroups(env)
  const index = groups.findIndex((group) => group.id === id)
  if (index === -1) return null

  const updated = { ...groups[index], name }
  groups[index] = updated
  await writeGroups(env, groups)
  return updated
}

export async function reorderGroups(env: Env, ids: string[]): Promise<NavGroup[] | null> {
  const groups = await listGroups(env)
  if (ids.length !== groups.length) return null

  const byId = new Map(groups.map((group) => [group.id, group]))
  const seen = new Set<string>()
  const next: NavGroup[] = []

  for (const id of ids) {
    const group = byId.get(id)
    if (!group || seen.has(id)) return null
    seen.add(id)
    next.push(group)
  }

  await writeGroups(env, next)
  return next
}

export async function removeGroup(env: Env, id: string): Promise<boolean> {
  const groups = await listGroups(env)
  const next = groups.filter((group) => group.id !== id)
  if (next.length === groups.length) return false

  await writeGroups(env, next)
  return true
}

export async function removeBookmarksInGroup(env: Env, group: string): Promise<void> {
  const bookmarks = await listBookmarks(env)
  const next = bookmarks.filter((bookmark) => bookmark.group !== group)
  if (next.length !== bookmarks.length) await writeBookmarks(env, next)
}

async function writeBookmarks(env: Env, bookmarks: Bookmark[]): Promise<void> {
  await env.NAVBOOK_KV.put(BOOKMARKS_KEY, JSON.stringify(bookmarks))
}

export async function replaceAll(env: Env, data: BackupData): Promise<void> {
  await writeGroups(env, data.groups)
  await writeBookmarks(env, data.bookmarks)
}

export async function listBookmarks(env: Env): Promise<Bookmark[]> {
  const stored = await env.NAVBOOK_KV.get<Bookmark[]>(BOOKMARKS_KEY, 'json')
  return Array.isArray(stored) ? stored : []
}

export async function createBookmark(
  env: Env,
  group: string,
  input: BookmarkInput,
): Promise<Bookmark> {
  const bookmarks = await listBookmarks(env)
  const bookmark: Bookmark = {
    id: createUniqueId(bookmarks.map((item) => item.id)),
    group,
    ...input,
  }
  await writeBookmarks(env, [...bookmarks, bookmark])
  return bookmark
}

export async function updateBookmark(
  env: Env,
  id: string,
  input: BookmarkInput,
): Promise<Bookmark | null> {
  const bookmarks = await listBookmarks(env)
  const index = bookmarks.findIndex((bookmark) => bookmark.id === id)
  if (index === -1) return null

  const updated: Bookmark = { ...bookmarks[index], ...input }
  bookmarks[index] = updated
  await writeBookmarks(env, bookmarks)
  return updated
}

export async function removeBookmark(env: Env, id: string): Promise<boolean> {
  const bookmarks = await listBookmarks(env)
  const next = bookmarks.filter((bookmark) => bookmark.id !== id)
  if (next.length === bookmarks.length) return false

  await writeBookmarks(env, next)
  return true
}

export async function reorderBookmarks(
  env: Env,
  items: Array<{ id: string; group: string }>,
): Promise<Bookmark[] | null> {
  const bookmarks = await listBookmarks(env)
  if (items.length !== bookmarks.length) return null

  const groups = await listGroups(env)
  const byId = new Map(bookmarks.map((item) => [item.id, item]))
  const groupIds = new Set(groups.map((group) => group.id))
  const seen = new Set<string>()
  const next: Bookmark[] = []

  for (const item of items) {
    const bookmark = byId.get(item.id)
    if (!bookmark || seen.has(item.id) || !groupIds.has(item.group)) return null
    seen.add(item.id)
    next.push({ ...bookmark, group: item.group })
  }

  await writeBookmarks(env, next)
  return next
}
