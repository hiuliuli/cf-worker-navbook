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

export type NavData = {
  groups: NavGroup[]
  bookmarks: Bookmark[]
}

export type BackupData = NavData

const URL_LIMIT = 2048

export function normalizeLink(raw: string): string | null {
  const value = raw.trim()
  if (!value || value.length > URL_LIMIT) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? candidate : null
  } catch {
    return null
  }
}

export function normalizeIcon(raw: string): string | null {
  const value = raw.trim()
  if (!value) return ''
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return null
  return normalizeLink(value)
}

type ApiError = { error?: string }

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const data = (await response.json().catch(() => null)) as (T & ApiError) | null

  if (!response.ok) {
    throw new Error(data?.error ?? '请求失败，请稍后重试')
  }

  return data as T
}

export async function fetchBookmarks(): Promise<NavData> {
  return request<NavData>('/api/bookmarks')
}

export async function createBookmark(
  input: BookmarkInput & { group: string },
): Promise<Bookmark> {
  const data = await request<{ bookmark: Bookmark }>('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return data.bookmark
}

export async function updateBookmark(id: string, input: BookmarkInput): Promise<Bookmark> {
  const data = await request<{ bookmark: Bookmark }>(`/api/bookmarks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return data.bookmark
}

export function parseBackupPayload(value: unknown): BackupData | null {
  if (!value || typeof value !== 'object') return null
  const { groups, bookmarks } = value as { groups?: unknown; bookmarks?: unknown }
  if (!Array.isArray(groups) || !Array.isArray(bookmarks)) return null

  const nextGroups: NavGroup[] = []
  const groupIds = new Set<string>()
  for (const item of groups) {
    if (!item || typeof item !== 'object') return null
    const { id, name } = item as Record<string, unknown>
    if (typeof id !== 'string' || typeof name !== 'string' || groupIds.has(id)) return null
    groupIds.add(id)
    nextGroups.push({ id, name })
  }

  const nextBookmarks: Bookmark[] = []
  const bookmarkIds = new Set<string>()
  for (const item of bookmarks) {
    if (!item || typeof item !== 'object') return null
    const { id, group, title, url, icon, description } = item as Record<string, unknown>
    if (
      typeof id !== 'string' ||
      typeof group !== 'string' ||
      typeof title !== 'string' ||
      typeof url !== 'string' ||
      typeof icon !== 'string' ||
      typeof description !== 'string' ||
      bookmarkIds.has(id) ||
      !groupIds.has(group)
    ) {
      return null
    }
    bookmarkIds.add(id)
    nextBookmarks.push({ id, group, title, url, icon, description })
  }

  return { groups: nextGroups, bookmarks: nextBookmarks }
}

export async function restoreBackup(data: BackupData): Promise<BackupData> {
  return request<BackupData>('/api/backup', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groups: data.groups, bookmarks: data.bookmarks }),
  })
}

export async function deleteBookmark(id: string): Promise<void> {
  await request<null>(`/api/bookmarks/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function reorderBookmarks(
  items: Array<{ id: string; group: string }>,
): Promise<Bookmark[]> {
  const data = await request<{ bookmarks: Bookmark[] }>('/api/bookmarks/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  return data.bookmarks
}

export async function createGroup(name: string): Promise<NavGroup> {
  const data = await request<{ group: NavGroup }>('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return data.group
}

export async function renameGroup(id: string, name: string): Promise<NavGroup> {
  const data = await request<{ group: NavGroup }>(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return data.group
}

export async function deleteGroup(id: string): Promise<void> {
  await request<null>(`/api/groups/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function reorderGroups(ids: string[]): Promise<NavGroup[]> {
  const data = await request<{ groups: NavGroup[] }>('/api/groups/order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  return data.groups
}
