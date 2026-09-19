import { useState } from 'react'
import { useApp } from '../hooks/AppDataContext'
import { useUi } from '../hooks/UiContext'
import { genId } from '../lib/id'
import { showToast } from '../lib/toast'
import type { QType } from '../lib/types'

interface SentenceRow {
  en: string
  zh: string
}
interface VocabRow {
  term: string
  zh: string
}

const emptyForm = () => ({
  type: 'speaking' as QType,
  subtype: '',
  sentences: [{ en: '', zh: '' }] as SentenceRow[],
  vocab: [{ term: '', zh: '' }] as VocabRow[],
  notes: '',
})

export default function AddQuestionSheet() {
  const ui = useUi()
  const app = useApp()
  const [form, setForm] = useState(emptyForm())

  if (!ui.addSheetOpen) return null

  function close() {
    ui.closeAddSheet()
    setForm(emptyForm())
  }

  function submit() {
    const sentences = form.sentences.filter((s) => s.en.trim()).map((s) => ({ en: s.en.trim(), zh: s.zh.trim() }))
    if (!sentences.length) {
      showToast('请至少填写一句英文原文')
      return
    }
    const vocab = form.vocab
      .filter((v) => v.term.trim())
      .map((v) => ({ vid: genId('w'), term: v.term.trim(), zh: v.zh.trim(), addedBy: 'manual' as const }))
    app.addQuestion({ type: form.type, subtype: form.subtype.trim(), sentences, vocab, notes: form.notes.trim(), source: 'manual' })
    close()
    showToast('已添加到题库')
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: 'rgba(20,18,30,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-t-[22px] p-[20px_18px]"
        style={{ background: 'var(--paper)', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-[14px] flex items-center justify-between">
          <h2 className="font-display text-[20px]">添加题目</h2>
          <button
            aria-label="关闭"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[15px]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}
            onClick={close}
          >
            ✕
          </button>
        </div>

        <Field label="题型">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QType })} className="w-full">
            <option value="speaking">Speaking</option>
            <option value="listening">Listening</option>
          </select>
        </Field>

        <Field label="子题型（选填）">
          <input
            className="w-full"
            placeholder="如 Read Aloud / Repeat Sentence / Summarize Spoken Text"
            value={form.subtype}
            onChange={(e) => setForm({ ...form, subtype: e.target.value })}
          />
        </Field>

        <Field label="原文 & 翻译">
          <div className="flex flex-col gap-2">
            {form.sentences.map((s, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-[6px]">
                  <textarea
                    className="w-full"
                    rows={2}
                    placeholder={`英文原句 ${i + 1}`}
                    value={s.en}
                    onChange={(e) => {
                      const sentences = [...form.sentences]
                      sentences[i] = { ...sentences[i], en: e.target.value }
                      setForm({ ...form, sentences })
                    }}
                  />
                  <input
                    className="w-full"
                    placeholder="中文翻译（可选）"
                    value={s.zh}
                    onChange={(e) => {
                      const sentences = [...form.sentences]
                      sentences[i] = { ...sentences[i], zh: e.target.value }
                      setForm({ ...form, sentences })
                    }}
                  />
                </div>
                {form.sentences.length > 1 && (
                  <button
                    className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full text-[16px]"
                    style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}
                    onClick={() => setForm({ ...form, sentences: form.sentences.filter((_, idx) => idx !== i) })}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-1 rounded-full px-[12px] py-[7px] text-[12px] font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}
            onClick={() => setForm({ ...form, sentences: [...form.sentences, { en: '', zh: '' }] })}
          >
            + 添加一句
          </button>
        </Field>

        <Field label="常用词 / 词组">
          <div className="flex flex-col gap-2">
            {form.vocab.map((v, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <div className="flex flex-1 flex-row gap-[6px]">
                  <input
                    className="w-full"
                    placeholder="词/词组"
                    value={v.term}
                    onChange={(e) => {
                      const vocab = [...form.vocab]
                      vocab[i] = { ...vocab[i], term: e.target.value }
                      setForm({ ...form, vocab })
                    }}
                  />
                  <input
                    className="w-full"
                    placeholder="中文释义"
                    value={v.zh}
                    onChange={(e) => {
                      const vocab = [...form.vocab]
                      vocab[i] = { ...vocab[i], zh: e.target.value }
                      setForm({ ...form, vocab })
                    }}
                  />
                </div>
                <button
                  className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full text-[16px]"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink-muted)' }}
                  onClick={() => setForm({ ...form, vocab: form.vocab.filter((_, idx) => idx !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-1 rounded-full px-[12px] py-[7px] text-[12px] font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}
            onClick={() => setForm({ ...form, vocab: [...form.vocab, { term: '', zh: '' }] })}
          >
            + 添加词汇
          </button>
        </Field>

        <Field label="备注（选填）">
          <textarea className="w-full" rows={2} placeholder="备注信息" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        <div className="mt-1 flex gap-[10px]">
          <button className="flex-1 rounded-[13px] py-3 text-[13px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }} onClick={close}>
            取消
          </button>
          <button className="flex-1 rounded-[13px] py-3 text-[13px] font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }} onClick={submit}>
            保存到题库
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <label className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
