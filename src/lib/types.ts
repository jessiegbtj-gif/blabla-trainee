export type QType = 'speaking' | 'listening'

export interface VocabItem {
  vid: string
  term: string
  zh: string
  addedBy: 'auto' | 'manual'
}

export interface Sentence {
  en: string
  zh: string
}

export interface Question {
  id: string
  type: QType
  subtype: string
  sentences: Sentence[]
  vocab: VocabItem[]
  notes: string
  source: string
  createdAt: string
}

export interface Progress {
  studiedCount: number
  correctCount: number
  wrongCount: number
  mastered: boolean
  flagged: boolean
  lastStudiedAt: string | null
}

export type ProgressMap = Record<string, Progress>

export interface VocabSrsItem {
  questionId: string
  vid: string
  box: number
  reviews: number
  nextReview: string | null
}

export type VocabSrsMap = Record<string, VocabSrsItem>

export interface StandaloneVocab {
  id: string
  term: string
  zh: string
  createdAt: string
}

export interface TestRating {
  qid: string
  rating: 'good' | 'ok' | 'hard'
}

export interface TestResult {
  id: string
  typeFilter: 'all' | QType
  count: number
  scorePct: number
  ratings: TestRating[]
  completedAt: string
}
