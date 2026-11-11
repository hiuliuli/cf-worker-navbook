import {
  createBookmark,
  createGroup,
  listBookmarks,
  listGroups,
  parseBackup,
  parseBookmarkInput,
  parseBookmarkOrder,
  parseGroupName,
  removeBookmark,
  removeBookmarksInGroup,
  removeGroup,
  renameGroup,
  reorderBookmarks,
  reorderGroups,
  replaceAll,
  updateBookmark,
} from './bookmarks.ts'

const COOKIE_NAME = 'navbook_auth'
const TOKEN_SALT = 'cf-worker-navbook:v1'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const encoder = new TextEncoder()

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${TOKEN_SALT}:${password}`),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return null
}

function sessionCookie(token: string, maxAge: number, request: Request): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`
}

async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  if (!env.APP_PASSWORD) return false
  const token = readCookie(request, COOKIE_NAME)
  if (!token) return false
  return timingSafeEqual(token, await hashPassword(env.APP_PASSWORD))
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 404 })
    }

    if (url.pathname === '/api/session' && request.method === 'GET') {
      return json({ authenticated: await isAuthenticated(request, env) })
    }

    if (url.pathname === '/api/login' && request.method === 'POST') {
      if (!env.APP_PASSWORD) {
        return json({ error: '服务端未配置 APP_PASSWORD' }, 503)
      }

      let password: unknown
      try {
        const body = (await request.json()) as { password?: unknown }
        password = body?.password
      } catch {
        return json({ error: '请求格式错误' }, 400)
      }

      if (typeof password !== 'string' || password.length === 0) {
        return json({ error: '请输入密码' }, 400)
      }

      const token = await hashPassword(password)
      if (!timingSafeEqual(token, await hashPassword(env.APP_PASSWORD))) {
        return json({ error: '密码错误' }, 401)
      }

      return new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': sessionCookie(token, SESSION_MAX_AGE, request) },
      })
    }

    if (url.pathname === '/api/logout' && request.method === 'POST') {
      return new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': sessionCookie('', 0, request) },
      })
    }

    if (url.pathname === '/api/backup') {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      if (request.method !== 'PUT') {
        return json({ error: 'Method not allowed' }, 405)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求格式错误' }, 400)
      }

      const parsed = parseBackup(body)
      if (!parsed.ok) return json({ error: parsed.error }, 400)

      await replaceAll(env, parsed.data)
      return json(parsed.data)
    }

    if (url.pathname === '/api/groups/order') {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      if (request.method !== 'PUT') {
        return json({ error: 'Method not allowed' }, 405)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求格式错误' }, 400)
      }

      const ids = (body as { ids?: unknown }).ids
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
        return json({ error: '分组顺序无效' }, 400)
      }

      const groups = await reorderGroups(env, ids as string[])
      if (!groups) return json({ error: '分组顺序无效' }, 400)
      return json({ groups })
    }

    if (url.pathname === '/api/groups') {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求格式错误' }, 400)
      }

      const parsed = parseGroupName((body as { name?: unknown }).name)
      if (!parsed.ok) return json({ error: parsed.error }, 400)

      const group = await createGroup(env, parsed.name)
      return json({ group }, 201)
    }

    const groupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/)
    if (groupMatch) {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      const groupId = decodeURIComponent(groupMatch[1])

      if (request.method === 'PUT') {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return json({ error: '请求格式错误' }, 400)
        }

        const parsed = parseGroupName((body as { name?: unknown }).name)
        if (!parsed.ok) return json({ error: parsed.error }, 400)

        const group = await renameGroup(env, groupId, parsed.name)
        if (!group) return json({ error: '未找到该分组' }, 404)
        return json({ group })
      }

      if (request.method === 'DELETE') {
        const groups = await listGroups(env)
        const target = groups.find((group) => group.id === groupId)
        if (!target) return json({ error: '未找到该分组' }, 404)

        await removeGroup(env, groupId)
        await removeBookmarksInGroup(env, groupId)
        return new Response(null, {
          status: 204,
          headers: { 'Cache-Control': 'no-store' },
        })
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    if (url.pathname === '/api/bookmarks') {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      if (request.method === 'GET') {
        return json({
          groups: await listGroups(env),
          bookmarks: await listBookmarks(env),
        })
      }

      if (request.method === 'POST') {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return json({ error: '请求格式错误' }, 400)
        }

        const parsed = parseBookmarkInput(body)
        if (!parsed.ok) return json({ error: parsed.error }, 400)

        const group = (body as { group?: unknown }).group
        if (typeof group !== 'string') return json({ error: '请选择分组' }, 400)

        const groups = await listGroups(env)
        if (!groups.some((item) => item.id === group)) {
          return json({ error: '分组不存在' }, 400)
        }

        const bookmark = await createBookmark(env, group, parsed.data)
        return json({ bookmark }, 201)
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    if (url.pathname === '/api/bookmarks/order') {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      if (request.method !== 'PUT') {
        return json({ error: 'Method not allowed' }, 405)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求格式错误' }, 400)
      }

      const items = parseBookmarkOrder(body)
      if (!items) return json({ error: '书签顺序无效' }, 400)

      const bookmarks = await reorderBookmarks(env, items)
      if (!bookmarks) return json({ error: '书签顺序无效' }, 400)
      return json({ bookmarks })
    }

    const bookmarkMatch = url.pathname.match(/^\/api\/bookmarks\/([^/]+)$/)
    if (bookmarkMatch) {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }

      const bookmarkId = decodeURIComponent(bookmarkMatch[1])

      if (request.method === 'DELETE') {
        const removed = await removeBookmark(env, bookmarkId)
        if (!removed) return json({ error: '未找到该书签' }, 404)
        return new Response(null, {
          status: 204,
          headers: { 'Cache-Control': 'no-store' },
        })
      }

      if (request.method !== 'PUT') {
        return json({ error: 'Method not allowed' }, 405)
      }

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: '请求格式错误' }, 400)
      }

      const parsed = parseBookmarkInput(body)
      if (!parsed.ok) return json({ error: parsed.error }, 400)

      const bookmark = await updateBookmark(env, bookmarkId, parsed.data)
      if (!bookmark) return json({ error: '未找到该书签' }, 404)
      return json({ bookmark })
    }

    if (url.pathname === '/api/' && request.method === 'GET') {
      if (!(await isAuthenticated(request, env))) {
        return json({ error: '未认证' }, 401)
      }
      return json({ name: 'NavBook' })
    }

    return json({ error: 'Not found' }, 404)
  },
} satisfies ExportedHandler<Env>
