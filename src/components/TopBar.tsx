import { useState } from 'react'
import { api, clearSession } from '../lib/api'

export default function TopBar({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [infoOpen, setInfoOpen] = useState(false)

  async function logout() {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    clearSession()
    onLogout()
  }

  return (
    <>
      <header
        className="sticky top-0 z-20 flex items-center justify-between gap-[10px] p-[14px_16px]"
        style={{ top: 'env(safe-area-inset-top, 0px)', background: 'var(--paper)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-[10px]">
          <span className="text-[26px] leading-none">🎧</span>
          <div>
            <h1 className="font-display text-[20px] font-bold">PTE陪练</h1>
            <p className="mt-[2px] text-[12px]" style={{ color: 'var(--ink-muted)' }}>
              {username} · 云端同步
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            aria-label="使用说明"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[15px]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
            onClick={() => setInfoOpen((v) => !v)}
          >
            ?
          </button>
          <button
            className="rounded-[10px] px-[10px] py-[8px] text-[12px] font-bold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
            onClick={logout}
          >
            退出
          </button>
        </div>
      </header>

      {infoOpen && (
        <div
          className="fixed z-30 flex w-[min(300px,calc(100vw-32px))] flex-col gap-[8px] rounded-[14px] p-[14px]"
          style={{ top: 'calc(64px + env(safe-area-inset-top, 0px))', right: '16px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <p className="font-display text-[14px] font-semibold">使用提示</p>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--ink-secondary)' }}>
            在"练习"页点击右下角的 + 手动添加题目；也可以把学习时用到的内容告诉 Claude，请它帮你整理后加进来。
          </p>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--ink-secondary)' }}>
            点击句子或词汇旁的 🔊 可以听发音，用来跟读模仿；不需要的词汇可以直接移除，保持列表干净。
          </p>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--ink-secondary)' }}>
            "词汇"页里的"复习"模式会按记忆曲线，只挑已经练过的题目中还没掌握的生词出小测验，记得的词会拉长下次复习的间隔，忘记的词会重新从头开始。
          </p>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--ink-secondary)' }}>
            题库是所有登录用户共享的，但每个人自己的学习进度、词汇复习记录都是独立保存、互不影响的。
          </p>
        </div>
      )}
    </>
  )
}
