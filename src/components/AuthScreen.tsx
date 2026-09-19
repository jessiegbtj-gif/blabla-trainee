import { useState, type FormEvent } from 'react'
import { api, setSession } from '../lib/api'

export default function AuthScreen({ onAuthed }: { onAuthed: (username: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'register' && password !== password2) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      const res = mode === 'login' ? await api.login(username, password) : await api.register(username, password)
      setSession(res.token, res.username)
      onAuthed(res.username)
    } catch (err: any) {
      setError(err.message || '出错了，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6" style={{ background: 'var(--paper)' }}>
      <div
        className="w-full max-w-sm rounded-[20px] p-7"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[26px]">🎧</span>
          <h1 className="font-display text-[22px] font-bold" style={{ color: 'var(--ink)' }}>
            PTE陪练
          </h1>
        </div>
        <p className="mb-6 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
          {mode === 'login' ? '登录后继续你的学习进度' : '设置一个用户名和密码，换设备也能找回进度'}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
              用户名
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="2-20位中英文/数字"
              required
              autoComplete="username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
                确认密码
              </label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="text-[13px] font-semibold" style={{ color: 'var(--critical)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-[13px] py-3 text-[14px] font-bold disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <button
          className="mt-4 w-full text-center text-[13px] font-semibold"
          style={{ color: 'var(--accent-strong)' }}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? '还没有账号？去注册' : '已经有账号？去登录'}
        </button>
      </div>
    </div>
  )
}
