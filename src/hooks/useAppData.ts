import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { showToast } from '../lib/toast'
import type { Progress, ProgressMap, Question, StandaloneVocab, TestResult, VocabItem, VocabSrsMap } from '../lib/types'
import { vocabSrsKey } from '../lib/srs'

export function useAppData() {
  const [ready, setReady] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [progress, setProgress] = useState<ProgressMap>({})
  const [vocabSrs, setVocabSrsMap] = useState<VocabSrsMap>({})
  const [vocabBank, setVocabBank] = useState<StandaloneVocab[]>([])
  const [tests, setTests] = useState<TestResult[]>([])

  const reloadAll = useCallback(async () => {
    const [q, p, s, vb, t] = await Promise.all([
      api.listQuestions(),
      api.getProgress(),
      api.getVocabSrs(),
      api.getVocabBank(),
      api.getTests(),
    ])
    setQuestions(q.questions)
    setProgress(p.progress)
    const srsMap: VocabSrsMap = {}
    s.items.forEach((it) => {
      srsMap[vocabSrsKey(it.questionId, it.vid)] = it
    })
    setVocabSrsMap(srsMap)
    setVocabBank(vb.items)
    setTests(t.tests)
    setReady(true)
  }, [])

  useEffect(() => {
    reloadAll().catch((e) => showToast(e.message || '加载失败'))
  }, [reloadAll])

  const addQuestion = useCallback(async (payload: Partial<Question>) => {
    const res = await api.addQuestion(payload)
    const q: Question = {
      id: res.id,
      type: (payload.type as any) || 'speaking',
      subtype: payload.subtype || '',
      sentences: payload.sentences || [],
      vocab: payload.vocab || [],
      notes: payload.notes || '',
      source: (payload.source as string) || 'manual',
      createdAt: res.createdAt,
    }
    setQuestions((prev) => [q, ...prev])
  }, [])

  const updateQuestionVocab = useCallback(async (qid: string, vocab: VocabItem[]) => {
    setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, vocab } : q)))
    await api.updateQuestionVocab(qid, vocab)
  }, [])

  const deleteQuestion = useCallback(async (qid: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qid))
    setProgress((prev) => {
      const next = { ...prev }
      delete next[qid]
      return next
    })
    await api.deleteQuestion(qid)
  }, [])

  const upsertProgress = useCallback(
    async (qid: string, patch: Partial<Progress>) => {
      const current: Progress = progress[qid] || {
        studiedCount: 0,
        correctCount: 0,
        wrongCount: 0,
        mastered: false,
        flagged: false,
        lastStudiedAt: null,
      }
      const merged = { ...current, ...patch }
      setProgress((prev) => ({ ...prev, [qid]: merged }))
      await api.putProgress(qid, merged)
    },
    [progress],
  )

  const setVocabSrs = useCallback(
    async (qid: string, vid: string, data: { box: number; reviews: number; nextReview: string | null }) => {
      const key = vocabSrsKey(qid, vid)
      setVocabSrsMap((prev) => ({ ...prev, [key]: { questionId: qid, vid, ...data } }))
      await api.putVocabSrs({ qid, vid, ...data })
    },
    [],
  )

  const addStandaloneVocab = useCallback(async (term: string, zh: string) => {
    const res = await api.addVocabBank(term, zh)
    setVocabBank((prev) => [{ id: res.id, term, zh, createdAt: res.createdAt }, ...prev])
  }, [])

  const deleteStandaloneVocab = useCallback(async (id: string) => {
    setVocabBank((prev) => prev.filter((v) => v.id !== id))
    await api.deleteVocabBank(id)
  }, [])

  const saveTestResult = useCallback(
    async (payload: { typeFilter: string; count: number; scorePct: number; ratings: { qid: string; rating: string }[] }) => {
      const res = await api.addTest(payload as any)
      setTests((prev) => [{ id: res.id, completedAt: res.completedAt, ...payload } as TestResult, ...prev])
    },
    [],
  )

  return {
    ready,
    questions,
    progress,
    vocabSrs,
    vocabBank,
    tests,
    reloadAll,
    addQuestion,
    updateQuestionVocab,
    deleteQuestion,
    upsertProgress,
    setVocabSrs,
    addStandaloneVocab,
    deleteStandaloneVocab,
    saveTestResult,
  }
}

export type AppData = ReturnType<typeof useAppData>
