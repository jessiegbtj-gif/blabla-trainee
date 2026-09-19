import { useApp } from '../hooks/AppDataContext'
import { Card } from './ui'

export default function StatsView({ active }: { active: boolean }) {
  const app = useApp()
  const totalQ = app.questions.length
  const masteredQ = app.questions.filter((q) => app.progress[q.id]?.mastered).length
  const flaggedQ = app.questions.filter((q) => app.progress[q.id]?.flagged).length
  const totalVocab = app.questions.reduce((n, q) => n + q.vocab.length, 0) + app.vocabBank.length
  const masteryPct = totalQ ? Math.round((masteredQ / totalQ) * 100) : 0
  const testsCount = app.tests.length
  const avgScore = testsCount ? Math.round(app.tests.reduce((a, r) => a + r.scorePct, 0) / testsCount) : 0
  const recent = app.tests.slice(0, 8).slice().reverse()

  return (
    <div className={`flex flex-col gap-[14px] ${active ? '' : 'hidden'}`}>
      <div className="font-display text-[19px] font-bold">学习统计</div>
      <div className="grid grid-cols-2 gap-[10px]">
        <StatTile value={totalQ} label="题库总数" />
        <StatTile value={masteredQ} label="已掌握" />
        <StatTile value={flaggedQ} label="错题本" />
        <StatTile value={totalVocab} label="收录词汇" />
      </div>
      <Card>
        <div
          className="relative m-[6px_auto] flex h-[150px] w-[150px] items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--accent) calc(${masteryPct}*1%), var(--surface-2) 0)` }}
        >
          <div className="absolute inset-[13px] rounded-full" style={{ background: 'var(--surface)' }} />
          <span className="relative z-[1] font-display text-[30px] font-bold tabular-nums">{masteryPct}%</span>
        </div>
        <div className="text-center text-[11px]" style={{ color: 'var(--ink-muted)' }}>
          总体掌握率
        </div>
      </Card>
      {testsCount ? (
        <Card>
          <h3 className="text-[14px] font-bold">
            模拟测试历史（共{testsCount}次，平均顺利率 {avgScore}%）
          </h3>
          <div className="flex h-[100px] items-end gap-[10px] overflow-x-auto pt-[14px]">
            {recent.map((r, i) => {
              const h = Math.max(6, Math.round((r.scorePct / 100) * 72))
              return (
                <div key={i} className="flex min-w-[26px] flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                    {r.scorePct}%
                  </span>
                  <div className="w-[16px] rounded-t-[4px]" style={{ height: h, background: 'var(--accent)' }} />
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-[13px]" style={{ color: 'var(--ink-muted)' }}>
            还没有模拟测试记录，去测试一下吧。
          </p>
        </Card>
      )}
    </div>
  )
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[16px] p-[16px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
    >
      <span className="font-display text-[28px] font-bold tabular-nums">{value}</span>
      <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
        {label}
      </span>
    </div>
  )
}
