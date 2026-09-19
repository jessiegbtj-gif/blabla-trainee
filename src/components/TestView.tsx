import { useEffect, useRef, useState } from 'react'
import { useApp } from '../hooks/AppDataContext'
import { showToast } from '../lib/toast'
import { speak } from '../lib/tts'
import { Btn, Card, ChipBtn, TypeTag } from './ui'
import type { QType, Question, TestRating } from '../lib/types'

type Phase = 'setup' | 'running' | 'result'

export default function TestView({ active }: { active: boolean }) {
  const app = useApp()
  const [phase, setPhase] = useState<Phase>('setup')
  const [typeFilter, setTypeFilter] = useState<'all' | QType>('all')
  const [count, setCount] = useState(8)
  const [queue, setQueue] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [ratings, setRatings] = useState<TestRating[]>([])
  const [elapsedSec, setElapsedSec] = useState(0)
  const [showZh, setShowZh] = useState(true)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  function startTest() {
    let pool = app.questions.slice()
    if (typeFilter !== 'all') pool = pool.filter((q) => q.type === typeFilter)
    if (!pool.length) {
      showToast('没有符合条件的题目')
      return
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    setQueue(pool.slice(0, Math.min(count, pool.length)))
    setIdx(0)
    setRatings([])
    setElapsedSec(0)
    setPhase('running')
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => setElapsedSec((s) => s + 1), 1000)
  }

  function finish(finalRatings: TestRating[]) {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const total = finalRatings.length || 1
    const goodCount = finalRatings.filter((r) => r.rating === 'good').length
    const scorePct = Math.round((goodCount / total) * 100)
    setPhase('result')
    app.saveTestResult({ typeFilter, count: queue.length, scorePct, ratings: finalRatings })
  }

  function rate(rating: 'good' | 'ok' | 'hard') {
    const q = queue[idx]
    if (!q) return
    const next = [...ratings, { qid: q.id, rating }]
    setRatings(next)
    const cur = app.progress[q.id] || { studiedCount: 0, correctCount: 0, wrongCount: 0 }
    const base = { studiedCount: (cur.studiedCount || 0) + 1, lastStudiedAt: new Date().toISOString() }
    if (rating === 'good') app.upsertProgress(q.id, { ...base, mastered: true, flagged: false, correctCount: (cur.correctCount || 0) + 1 })
    else if (rating === 'hard') app.upsertProgress(q.id, { ...base, flagged: true, mastered: false, wrongCount: (cur.wrongCount || 0) + 1 })
    else app.upsertProgress(q.id, base)

    const nextIdx = idx + 1
    if (nextIdx >= queue.length) finish(next)
    else setIdx(nextIdx)
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0')
  const ss = String(elapsedSec % 60).padStart(2, '0')

  return (
    <div className={`flex flex-col gap-[14px] ${active ? '' : 'hidden'}`}>
      {phase === 'setup' && (
        <>
          <Card>
            <h2 className="font-display text-[20px]">模拟测试设置</h2>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
                题型
              </label>
              <div className="inline-flex w-fit gap-[2px] rounded-[11px] p-[3px]" style={{ background: 'var(--surface-2)' }}>
                {(['all', 'speaking', 'listening'] as const).map((f) => (
                  <ChipBtn key={f} active={typeFilter === f} onClick={() => setTypeFilter(f)}>
                    {f === 'all' ? '全部' : f === 'speaking' ? 'Speaking' : 'Listening'}
                  </ChipBtn>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
                题量
              </label>
              <div className="inline-flex w-fit gap-[2px] rounded-[11px] p-[3px]" style={{ background: 'var(--surface-2)' }}>
                {[5, 8, 15].map((n) => (
                  <ChipBtn key={n} active={count === n} onClick={() => setCount(n)}>
                    {n}题
                  </ChipBtn>
                ))}
              </div>
            </div>
            <Btn tone="primary" block onClick={startTest}>
              开始测试
            </Btn>
          </Card>
          <TestHistory />
        </>
      )}

      {phase === 'running' &&
        (() => {
          const q = queue[idx]
          if (!q) return null
          return (
            <>
              <div className="flex items-center justify-between gap-[10px]">
                <span className="font-display text-[16px] font-bold tabular-nums">⏱ {mm}:{ss}</span>
                <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                  第 {idx + 1} / {queue.length} 题
                </span>
                <Btn tone="ghost" onClick={() => finish(ratings)}>
                  结束
                </Btn>
              </div>
              <Card>
                <TypeTag type={q.type} subtype={q.subtype} />
                <div className="flex flex-col gap-[10px]">
                  {q.sentences.map((s, i) => (
                    <div
                      key={i}
                      className="flex cursor-pointer items-start gap-[10px] rounded-[14px] p-[10px_12px]"
                      style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}
                      onClick={() => speak(s.en)}
                    >
                      <button
                        className="flex h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-full text-[14px]"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                      >
                        🔊
                      </button>
                      <div className="flex flex-col gap-1">
                        <p className="font-display text-[17px] leading-[1.55]">{s.en}</p>
                        {showZh && s.zh ? (
                          <p className="text-[13px] leading-[1.5]" style={{ color: 'var(--ink-secondary)' }}>
                            {s.zh}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <ChipBtn active={showZh} onClick={() => setShowZh((v) => !v)}>
                  译文
                </ChipBtn>
              </Card>
              <div className="grid grid-cols-3 gap-[8px]">
                <Btn tone="good" onClick={() => rate('good')}>
                  👍 顺利
                </Btn>
                <Btn tone="warning" onClick={() => rate('ok')}>
                  😐 一般
                </Btn>
                <Btn tone="critical" onClick={() => rate('hard')}>
                  👎 困难
                </Btn>
              </div>
            </>
          )
        })()}

      {phase === 'result' &&
        (() => {
          const total = ratings.length || 0
          const goodCount = ratings.filter((r) => r.rating === 'good').length
          const okCount = ratings.filter((r) => r.rating === 'ok').length
          const hardCount = ratings.filter((r) => r.rating === 'hard').length
          const scorePct = total ? Math.round((goodCount / total) * 100) : 0
          return (
            <Card className="items-center text-center">
              <h2 className="font-display text-[20px]">测试完成</h2>
              <div
                className="relative m-[6px_auto] flex h-[150px] w-[150px] items-center justify-center rounded-full"
                style={{ background: `conic-gradient(var(--accent) calc(${scorePct}*1%), var(--surface-2) 0)` }}
              >
                <div className="absolute inset-[13px] rounded-full" style={{ background: 'var(--surface)' }} />
                <span className="relative z-[1] font-display text-[30px] font-bold tabular-nums">{scorePct}%</span>
              </div>
              <div className="flex flex-wrap justify-center gap-[8px]">
                <span className="rounded-full px-[10px] py-[4px] text-[12px] font-bold" style={{ background: 'var(--good-soft)', color: 'var(--good)' }}>
                  👍 顺利 {goodCount}
                </span>
                <span className="rounded-full px-[10px] py-[4px] text-[12px] font-bold" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                  😐 一般 {okCount}
                </span>
                <span className="rounded-full px-[10px] py-[4px] text-[12px] font-bold" style={{ background: 'var(--critical-soft)', color: 'var(--critical)' }}>
                  👎 困难 {hardCount}
                </span>
              </div>
              <Btn tone="primary" block onClick={() => setPhase('setup')}>
                完成
              </Btn>
            </Card>
          )
        })()}
    </div>
  )
}

function TestHistory() {
  const app = useApp()
  const recent = app.tests.slice(0, 8)
  if (!recent.length) return null
  const bars = recent.slice().reverse()
  return (
    <Card>
      <h3 className="text-[14px] font-bold">最近测试</h3>
      <div className="flex h-[100px] items-end gap-[10px] overflow-x-auto pt-[14px]">
        {bars.map((r, i) => {
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
  )
}
