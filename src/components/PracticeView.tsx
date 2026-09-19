import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/AppDataContext'
import { useUi } from '../hooks/UiContext'
import { speak, speakSequence } from '../lib/tts'
import { getSrsEntry } from '../lib/srs'
import { genId } from '../lib/id'
import { showToast } from '../lib/toast'
import { Btn, Card, ChipBtn, EmptyState, Pill, SrsBadge, TypeTag } from './ui'
import type { QType } from '../lib/types'

export default function PracticeView({ active, jumpToQid, onJumped }: { active: boolean; jumpToQid: string | null; onJumped: () => void }) {
  const app = useApp()
  const ui = useUi()
  const [typeFilter, setTypeFilter] = useState<'all' | QType>('all')
  const [onlyReview, setOnlyReview] = useState(false)
  const [index, setIndex] = useState(0)
  const [showZh, setShowZh] = useState(true)
  const [slow, setSlow] = useState(false)
  const [addVocabOpenFor, setAddVocabOpenFor] = useState<string | null>(null)
  const [newTerm, setNewTerm] = useState('')
  const [newZh, setNewZh] = useState('')

  const list = useMemo(() => {
    let l = app.questions.slice()
    if (typeFilter !== 'all') l = l.filter((q) => q.type === typeFilter)
    if (onlyReview) l = l.filter((q) => { const p = app.progress[q.id]; return !p || !p.mastered })
    return l
  }, [app.questions, app.progress, typeFilter, onlyReview])

  useEffect(() => {
    if (!jumpToQid) return
    setTypeFilter('all')
    setOnlyReview(false)
    const idx = app.questions.findIndex((q) => q.id === jumpToQid)
    if (idx >= 0) setIndex(idx)
    onJumped()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToQid])

  const safeIndex = index >= list.length ? 0 : index
  const q = list[safeIndex]
  const total = list.length

  function goNext() {
    const next = safeIndex + 1
    if (next >= list.length) {
      setIndex(0)
      if (list.length) showToast('已完成本轮练习 🎉')
    } else {
      setIndex(next)
    }
  }

  return (
    <div className={`flex flex-col gap-[14px] ${active ? '' : 'hidden'}`}>
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <div className="inline-flex gap-[2px] rounded-[11px] p-[3px]" style={{ background: 'var(--surface-2)' }}>
          {(['all', 'speaking', 'listening'] as const).map((f) => (
            <ChipBtn key={f} active={typeFilter === f} onClick={() => { setTypeFilter(f); setIndex(0) }}>
              {f === 'all' ? '全部' : f === 'speaking' ? 'Speaking' : 'Listening'}
            </ChipBtn>
          ))}
        </div>
        <label className="flex items-center gap-[6px] text-[12px]" style={{ color: 'var(--ink-secondary)' }}>
          <input type="checkbox" className="h-[15px] w-[15px]" checked={onlyReview} onChange={(e) => { setOnlyReview(e.target.checked); setIndex(0) }} />
          只看待复习
        </label>
      </div>

      {!q ? (
        <EmptyState emoji="📭" text="题库里还没有符合条件的题目。">
          <Btn tone="primary" onClick={ui.openAddSheet}>
            添加第一道题
          </Btn>
        </EmptyState>
      ) : (
        <>
          <div className="text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
            第 {safeIndex + 1} / {total} 题
          </div>
          <Card className="!gap-4">
            <div className="flex items-start justify-between gap-2">
              <TypeTag type={q.type} subtype={q.subtype} />
              <button
                aria-label="删除题目"
                className="px-1 py-0.5 text-[15px]"
                style={{ color: 'var(--critical)' }}
                onClick={() => {
                  if (confirm('确定删除这道题目吗？')) app.deleteQuestion(q.id)
                }}
              >
                🗑️
              </button>
            </div>

            <StatusLine qid={q.id} />

            <div className="flex flex-col gap-[10px]">
              {q.sentences.map((s, i) => (
                <div
                  key={i}
                  className="flex cursor-pointer items-start gap-[10px] rounded-[14px] p-[10px_12px]"
                  style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}
                  onClick={() => speak(s.en, { slow })}
                >
                  <button
                    aria-label="朗读"
                    className="flex h-[30px] w-[30px] min-w-[30px] items-center justify-center rounded-full text-[14px]"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                  >
                    🔊
                  </button>
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-[17px] leading-[1.55]" style={{ color: 'var(--ink)' }}>
                      {s.en}
                    </p>
                    {showZh && s.zh ? (
                      <p className="text-[13px] leading-[1.5]" style={{ color: 'var(--ink-secondary)' }}>
                        {s.zh}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-[8px]">
              <ChipBtn active={showZh} onClick={() => setShowZh((v) => !v)}>
                译文
              </ChipBtn>
              <ChipBtn active={slow} onClick={() => setSlow((v) => !v)}>
                🐢 慢速
              </ChipBtn>
              <ChipBtn onClick={() => speakSequence(q.sentences.map((s) => s.en), slow)}>▶️ 整段朗读</ChipBtn>
            </div>

            <div className="flex flex-col gap-[10px] pt-[14px]" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
                  常用词 &amp; 词组 ({q.vocab.length})
                </h3>
                <ChipBtn
                  small
                  onClick={() => {
                    setAddVocabOpenFor(addVocabOpenFor === q.id ? null : q.id)
                    setNewTerm('')
                    setNewZh('')
                  }}
                >
                  + 添加
                </ChipBtn>
              </div>
              {addVocabOpenFor === q.id && (
                <div className="flex flex-wrap gap-[8px]">
                  <input className="min-w-[110px] flex-1" placeholder="词/词组" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
                  <input className="min-w-[110px] flex-1" placeholder="中文释义（可选）" value={newZh} onChange={(e) => setNewZh(e.target.value)} />
                  <button
                    className="rounded-[13px] px-3 py-2 text-[12px] font-bold"
                    style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                    onClick={() => {
                      const term = newTerm.trim()
                      if (!term) { showToast('请输入词或词组'); return }
                      const next = [...q.vocab, { vid: genId('w'), term, zh: newZh.trim(), addedBy: 'manual' as const }]
                      app.updateQuestionVocab(q.id, next)
                      setNewTerm('')
                      setNewZh('')
                    }}
                  >
                    添加
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-[8px]">
                {q.vocab.length === 0 ? (
                  <p className="py-[6px] text-[13px]" style={{ color: 'var(--ink-muted)' }}>
                    暂无收录词汇，可手动添加。
                  </p>
                ) : (
                  q.vocab.map((v) => {
                    const entry = getSrsEntry(app.vocabSrs, q.id, v.vid)
                    return (
                      <div
                        key={v.vid}
                        className="flex items-center gap-[9px] rounded-[12px] p-[8px_10px]"
                        style={{ background: 'var(--paper)', border: '1px solid var(--border)' }}
                      >
                        <button
                          className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[12px]"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
                          onClick={() => speak(v.term)}
                        >
                          🔈
                        </button>
                        <span className="text-[14px] font-bold">{v.term}</span>
                        <span className="flex-1 text-[12px]" style={{ color: 'var(--ink-secondary)' }}>
                          {v.zh}
                        </span>
                        <SrsBadge box={entry.box} />
                        <button
                          aria-label="从列表移除"
                          className="ml-auto px-[6px] text-[18px] leading-none"
                          style={{ color: 'var(--ink-muted)' }}
                          onClick={() => app.updateQuestionVocab(q.id, q.vocab.filter((x) => x.vid !== v.vid))}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-4 gap-[8px]">
            <Btn tone="ghost" onClick={() => setIndex(Math.max(0, safeIndex - 1))}>
              ‹ 上一题
            </Btn>
            <Btn
              tone="critical"
              onClick={() => {
                const cur = app.progress[q.id] || { wrongCount: 0, studiedCount: 0 }
                app.upsertProgress(q.id, {
                  flagged: true,
                  mastered: false,
                  wrongCount: (cur.wrongCount || 0) + 1,
                  studiedCount: (cur.studiedCount || 0) + 1,
                  lastStudiedAt: new Date().toISOString(),
                })
                goNext()
              }}
            >
              🚩 较难
            </Btn>
            <Btn
              tone="good"
              onClick={() => {
                const cur = app.progress[q.id] || { correctCount: 0, studiedCount: 0 }
                app.upsertProgress(q.id, {
                  mastered: true,
                  flagged: false,
                  correctCount: (cur.correctCount || 0) + 1,
                  studiedCount: (cur.studiedCount || 0) + 1,
                  lastStudiedAt: new Date().toISOString(),
                })
                goNext()
              }}
            >
              ✅ 掌握了
            </Btn>
            <Btn tone="ghost" onClick={goNext}>
              下一题 ›
            </Btn>
          </div>
        </>
      )}
    </div>
  )
}

function StatusLine({ qid }: { qid: string }) {
  const app = useApp()
  const p = app.progress[qid]
  return (
    <div className="flex items-center justify-between gap-2">
      {p?.mastered ? (
        <Pill tone="good">✅ 已掌握</Pill>
      ) : p?.flagged ? (
        <Pill tone="critical">🚩 错题</Pill>
      ) : (
        <Pill tone="muted">🕘 待复习</Pill>
      )}
      <span className="text-[12px] tabular-nums" style={{ color: 'var(--ink-muted)' }}>
        练习 {p?.studiedCount || 0} 次
      </span>
    </div>
  )
}
