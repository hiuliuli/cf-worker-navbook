import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginPageProps = {
  onAuthenticated: () => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    if (!password) {
      setError('请输入密码')
      return
    }

    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        onAuthenticated()
        return
      }

      if (response.status === 401) setError('密码错误，请重试')
      else if (response.status === 503) setError('服务端尚未配置访问密码')
      else setError('登录失败，请稍后重试')
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="navbook-bg flex min-h-svh items-center justify-center px-6 py-12 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-900/15 bg-white/70 p-7 shadow-sm shadow-slate-900/5 backdrop-blur-md dark:border-white/15 dark:bg-white/[0.06] dark:shadow-black/20 sm:p-8">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" width={44} height={44} className="size-11" />
            <h1 className="font-heading text-3xl font-bold tracking-tight">NavBook</h1>
          </div>
          <p className="mt-2 text-base text-slate-500 dark:text-slate-400">请输入密码以继续</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="sr-only">
                访问密码
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={revealed ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError(null)
                  }}
                  disabled={pending}
                  aria-invalid={error !== null}
                  aria-describedby={error ? 'password-error' : undefined}
                  className="h-12 rounded-xl border-slate-900/20 bg-white/80 pr-11 text-base placeholder:text-slate-400 focus-visible:border-slate-900/40 focus-visible:ring-slate-900/10 dark:border-white/15 dark:bg-white/[0.06] dark:placeholder:text-slate-500 dark:focus-visible:border-white/40 dark:focus-visible:ring-white/15"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setRevealed((value) => !value)}
                  disabled={pending}
                  aria-label={revealed ? '隐藏密码' : '显示密码'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  {revealed ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
              {error && (
                <p id="password-error" role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending || password.trim().length === 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  验证中…
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>
        </div>

        <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
          欢迎使用 NavBook
        </p>
      </div>
    </main>
  )
}
