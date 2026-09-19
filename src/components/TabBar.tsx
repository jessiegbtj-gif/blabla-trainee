export type TabKey = 'practice' | 'test' | 'wrong' | 'vocab' | 'stats'

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'practice', icon: '📖', label: '练习' },
  { key: 'test', icon: '⏱️', label: '模拟测试' },
  { key: 'wrong', icon: '🚩', label: '错题本' },
  { key: 'vocab', icon: '🔤', label: '词汇' },
  { key: 'stats', icon: '📊', label: '统计' },
]

export default function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex p-[8px_6px]"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
    >
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="flex flex-1 flex-col items-center gap-[3px] rounded-[10px] p-[4px_0] text-[10px] font-bold"
          style={{ color: tab === t.key ? 'var(--accent)' : 'var(--ink-muted)' }}
        >
          <span className="text-[16px] leading-none">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
