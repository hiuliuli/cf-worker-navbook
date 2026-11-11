import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { LoginPage } from '@/components/login-page'
import { NavHome } from '@/components/nav-home'

type AuthStatus = 'checking' | 'guest' | 'authenticated'

function BootScreen() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">正在验证登录状态</span>
    </main>
  )
}

export default function App() {
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/session', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('session check failed')
        const data = (await response.json()) as { authenticated?: boolean }
        setStatus(data.authenticated ? 'authenticated' : 'guest')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('guest')
      })

    return () => controller.abort()
  }, [])

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      setStatus('guest')
    }
  }

  if (status === 'checking') return <BootScreen />
  if (status === 'guest') return <LoginPage onAuthenticated={() => setStatus('authenticated')} />

  return <NavHome onLogout={handleLogout} />
}
