// Leitner-style spaced repetition, ported 1:1 from the original app.
export const SRS_MASTER_BOX = 5
export const SRS_INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

export function vocabSrsKey(qid: string, vid: string): string {
  return qid + ':' + vid
}

export function isMastered(box: number): boolean {
  return box >= SRS_MASTER_BOX
}

export function isDue(nextReview: string | null, nowMs: number): boolean {
  if (!nextReview) return true
  return new Date(nextReview).getTime() <= nowMs
}

export function nextBoxAndInterval(currentBox: number, rating: 'good' | 'again'): { box: number; days: number } {
  const box = rating === 'good' ? Math.min(currentBox + 1, SRS_MASTER_BOX) : 1
  return { box, days: SRS_INTERVAL_DAYS[box] || 1 }
}

import type { VocabSrsMap } from './types'

export function getSrsEntry(map: VocabSrsMap, qid: string, vid: string) {
  return map[vocabSrsKey(qid, vid)] || { questionId: qid, vid, box: 1, reviews: 0, nextReview: null }
}
