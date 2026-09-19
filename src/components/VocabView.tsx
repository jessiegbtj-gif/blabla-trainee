import { useMemo, useState } from 'react'
import { useApp } from '../hooks/AppDataContext'
import { showToast } from '../lib/toast'
import { speak } from '../lib/tts'
import { getSrsEntry, isDue, isMastered, nextBoxAndInterval, SRS_MASTER_BOX } from '../lib/srs'
import { Btn, Card, ChipBtn, EmptyState, SrsBadge, TypeTag } from './ui'
import type { QType } from '../lib/types'

interface ReviewCandidate {
  qid: string
  vid: string
  term: string
  zh: string
  box: number
  nextReview: string | null
  qtype: QType
}

export default function VocabView({ active }: { active: boolean }) {
  const app = useApp()
  const [mode, setMode] = useState<'list' | 'review'>('list')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [newZh, setNewZh] = useState('')

  const allVocab = useMemo(() => {
    const items: { term: string; zh: string; source: 'question' | 'standalone'; qid?: string; vid?: string; qtype?: QType; id?: string; box?: number }[] = []
    app.questions.forEach((q) => {
      q.vocab.forEach((v) => {
        items.push({ term: v.term, zh: v.zh, source: 'question', qid: q.id, vid: v.vid, qtype: q.type, box: getSrsEntry(app.vocabSrs, q.id, v.vid).box })
      })
    })
    app.vocabBank.forEach((v) => items.push({ term: v.term, zh: v.zh, source: 'standalone', id: v.id }))
    return items
  }, [app.questions, app.vocabBank, app.vocabSrs])

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return allVocab
    return allVocab.filter((v) => v.term.toLowerCase().includes(s) || (v.zh || '').includes(s))
  }, [allVocab, search])

  return (
    <div className={`flex flex-col gap-[14px] ${active ? '' : 'hidden'}`}>
      <div className="inline-flex w-fit gap-[2px] rounded-[11px] p-[3px]" style={{ background: 'var(--surface-2)' }}>
        <ChipBtn active={mode === 'list'} onClick={() => setMode('list')}>
          词汇本
        </ChipBtn>
        <ChipBtn active={mode === 'review'} onClick={() => setMode('review')}>
          复习
        </ChipBtn>
      </div>

      {mode === 'review' ? (
        <ReviewMode />
      ) : (
        <>
          <div className="font-display text-[19px] font-bold">词汇本 ({allVocab.length})</div>
          <div className="flex gap-[8px]">
            <input className="flex-1" placeholder="搜索词汇…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button
              className="rounded-[13px] px-3 py-2 text-[12px] font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              onClick={() => { setAddOpen((v) => !v); setNewTerm(''); setNewZh('') }}
            >
              + 新词
            </button>
          </div>
          {addOpen && (
            <div className="flex flex-wrap gap-[8px]">
              <input className="min-w-[110px] flex-1" placeholder="词/词组" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
              <input className="min-w-[110px] flex-1" placeholder="中文释义（可选）" value={newZh} onChange={(e) => setNewZh(e.target.value)} />
              <button
                className="rounded-[13px] px-3 py-2 text-[12px] font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                onClick={() => {
                  const term = newTerm.trim()
                  if (!term) { showToast('请输入词或词组'); return }
                  app.addStandaloneVocab(term, newZh.trim())
                  setNewTerm('')
                  setNewZh('')
                }}
              >
                添加
              </button>
            </div>
          )}
          <div className="flex flex-col gap-[10px]">
            {!visible.length ? (
              <p className="py-[6px] text-[13px]" style={{ color: 'var(--ink-muted)' }}>
                还没有收录词汇。
              </p>
            ) : (
              visible.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-[10px] rounded-[14px] p-[12px_14px]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                >
                  <div className="flex min-w-0 flex-1 flex-row items-center gap-[10px]">
                    <button
                      className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[12px]"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                      onClick={() => speak(v.term)}
                    >
                      🔈
                    </button>
                    <div>
                      <p className="text-[14px] font-semibold">{v.term}</p>
                      {v.zh ? (
                        <p className="mt-0.5 text-[12px]" style={{ color: 'var(--ink-secondary)' }}>
                          {v.zh}
                        </p>
                      ) : null}
                    </div>
                    {v.source === 'question' ? <SrsBadge box={v.box || 1} /> : null}
                  </div>
                  <div className="flex flex-shrink-0 gap-[6px]">
                    {v.source === 'question' ? (
                      <>
                        <span className="rounded-full px-[8px] py-[3px] text-[10px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}>
                          {v.qtype === 'speaking' ? 'Speaking' : 'Listening'}
                        </span>
                        <ChipBtn
                          onClick={() => {
                            const q = app.questions.find((x) => x.id === v.qid)
                            if (q) app.updateQuestionVocab(q.id, q.vocab.filter((x) => x.vid !== v.vid))
                          }}
                        >
                          移除 ×
                        </ChipBtn>
                      </>
                    ) : (
                      <ChipBtn onClick={() => app.deleteStandaloneVocab(v.id!)}>移除 ×</ChipBtn>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function collectCandidates(app: ReturnType<typeof useApp>): { due: ReviewCandidate[]; upcoming: ReviewCandidate[] } {
  const now = Date.now()
  const due: ReviewCandidate[] = []
  const upcoming: ReviewCandidate[] = []
  app.questions.forEach((q) => {
    if (!app.progress[q.id]) return
    q.vocab.forEach((v) => {
      const entry = getSrsEntry(app.vocabSrs, q.id, v.vid)
      if (isMastered(entry.box)) return
      const item: ReviewCandidate = { qid: q.id, vid: v.vid, term: v.term, zh: v.zh, box: entry.box, nextReview: entry.nextReview, qtype: q.type }
      if (isDue(entry.nextReview, now)) due.push(item)
      else upcoming.push(item)
    })
  })
  upcoming.sort((a, b) => new Date(a.nextReview || 0).getTime() - new Date(b.nextReview || 0).getTime())
  return { due, upcoming }
}

function ReviewMode() {
  const app = useApp()
  const [phase, setPhase] = useState<'idle' | 'running' | 'result'>('idle')
  const [queue, setQueue] = useState<ReviewCandidate[]>([])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<{ term: string; rating: 'good' | 'again'; graduated: boolean }[]>([])

  const cand = collectCandidates(app)

  function start(useUpcoming: boolean) {
    const pool = (useUpcoming ? cand.upcoming : cand.due).slice()
    if (!pool.length) { showToast('没有可复习的词汇'); return }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    setQueue(pool.slice(0, 15))
    setIdx(0)
    setResults([])
    setRevealed(false)
    setPhase('running')
  }

  function rate(rating: 'good' | 'again') {
    const item = queue[idx]
    if (!item) return
    const { box: newBox, days } = nextBoxAndInterval(item.box, rating)
    const graduated = rating === 'good' && newBox >= SRS_MASTER_BOX && item.box < SRS_MASTER_BOX
    const entry = getSrsEntry(app.vocabSrs, item.qid, item.vid)
    app.setVocabSrs(item.qid, item.vid, {
      box: newBox,
      reviews: (entry.reviews || 0) + 1,
      nextReview: new Date(Date.now() + days * 86400000).toISOString(),
    })
    const nextResults = [...results, { term: item.term, rating, graduated }]
    setResults(nextResults)
    setRevealed(false)
    const nextIdx = idx + 1
    if (nextIdx >= queue.length) setPhase('result')
    else setIdx(nextIdx)
  }

  if (phase === 'running' && queue.length) {
    const item = queue[idx]
    if (!item) return null
    return (
      <>
        <div className="flex items-center justify-between gap-[10px]">
          <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
            第 {idx + 1} / {queue.length} 个
          </span>
        </div>
        <Card className="items-center text-center">
          <TypeTag type={item.qtype} />
          <div className="flex cursor-pointer items-center justify-center gap-[10px] rounded-[14px] p-[10px_12px]" onClick={() => speak(item.term)}>
            <button
              aria-label="朗读"
              className="flex h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-full text-[14px]"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
            >
              🔊
            </button>
            <p className="font-display text-[26px]">{item.term}</p>
          </div>
          {revealed ? (
            <p className="text-[15px]" style={{ color: 'var(--ink-secondary)' }}>
              {item.zh || '（未收录释义）'}
            </p>
          ) : (
            <ChipBtn onClick={() => setRevealed(true)}>显示释义</ChipBtn>
          )}
        </Card>
        {revealed && (
          <div className="grid grid-cols-2 gap-[8px]">
            <Btn tone="critical" onClick={() => rate('again')}>
              👎 忘记了
            </Btn>
            <Btn tone="good" onClick={() => rate('good')}>
              👍 记得
            </Btn>
          </div>
        )}
      </>
    )
  }

  if (phase === 'result') {
    const total = results.length
    const goodCount = results.filter((r) => r.rating === 'good').length
    const graduated = results.filter((r) => r.graduated).length
    return (
      <Card className="items-center text-center">
        <h2 className="font-display text-[20px]">复习完成</h2>
        <p className="py-[6px] text-[13px]" style={{ color: 'var(--ink-muted)' }}>
          本轮复习了 {total} 个词，记得 {goodCount} 个{graduated ? `，其中 ${graduated} 个已达到"掌握"标准 🎉` : ''}
        </p>
        <Btn tone="primary" block onClick={() => setPhase('idle')}>
          完成
        </Btn>
      </Card>
    )
  }

  if (!cand.due.length && !cand.upcoming.length) {
    return <EmptyState emoji="🌟" text="暂时没有需要复习的词汇。练习题目后，题目里的生词会自动进入复习队列，按记忆曲线安排复习时间。" />
  }

  return (
    <Card>
      <h2 className="font-display text-[20px]">词汇复习</h2>
      <p className="text-[13px]" style={{ color: 'var(--ink-muted)' }}>
        已经学习过的题目中，还未掌握的生词：到期 <strong style={{ color: 'var(--ink)' }}>{cand.due.length}</strong> 个
        {cand.upcoming.length ? `，即将到期 ${cand.upcoming.length} 个` : ''}
      </p>
      {cand.due.length ? (
        <Btn tone="primary" block onClick={() => start(false)}>
          开始复习（{Math.min(cand.due.length, 15)}）
        </Btn>
      ) : (
        <Btn tone="ghost" block onClick={() => start(true)}>
          提前复习即将到期的词
        </Btn>
      )}
    </Card>
  )
}
