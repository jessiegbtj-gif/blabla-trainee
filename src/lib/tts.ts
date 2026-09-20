// Text-to-speech via the app's own /api/tts endpoint, which proxies to Azure
// Neural TTS and caches the generated audio server-side (see worker/tts.ts)
// so the same sentence is never re-synthesized. Falls back to the browser's
// built-in speech synthesis if the network request ever fails.
//
// A single, reused <audio> element is used for every sentence rather than a
// fresh `new Audio()` each time. Strict mobile browsers (notably iOS Safari)
// only allow programmatic playback on a media element that was "unlocked" by
// a direct, synchronous user gesture; once unlocked, that same element can
// keep being re-played (even after an async network fetch) without a new
// tap. Creating a brand-new element per sentence loses that unlocked state,
// which is why longer passages used to stall partway through and require a
// manual tap to continue.
import { getToken } from './api'

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

const audioUrlCache = new Map<string, string>() // cache key -> object URL, this tab only
let audioEl: HTMLAudioElement | null = null

function getAudioEl(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.preload = 'auto'
  }
  return audioEl
}

// Must be called synchronously from within a user-gesture event handler.
function unlock() {
  const el = getAudioEl()
  try {
    el.src = SILENT_WAV
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* ignore */
  }
}

function cacheKeyFor(text: string, slow: boolean) {
  return (slow ? 'slow|' : 'normal|') + text
}

async function fetchAudioUrl(text: string, slow: boolean): Promise<string> {
  const key = cacheKeyFor(text, slow)
  const existing = audioUrlCache.get(key)
  if (existing) return existing

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = 'Bearer ' + token
  const params = new URLSearchParams({ text, slow: slow ? '1' : '0' })
  const res = await fetch('/api/tts?' + params.toString(), { headers })
  if (!res.ok) throw new Error('tts request failed: ' + res.status)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  audioUrlCache.set(key, url)
  return url
}

export function stop() {
  if (audioEl) {
    audioEl.onended = null
    audioEl.onerror = null
    audioEl.pause()
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
}

function fallbackSpeak(text: string, slow: boolean, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
    onEnd?.()
    return
  }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = slow ? 0.7 : 1
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

async function playOne(text: string, slow: boolean, onEnd?: () => void) {
  if (!text) {
    onEnd?.()
    return
  }
  try {
    const url = await fetchAudioUrl(text, slow)
    const el = getAudioEl()
    el.onended = () => onEnd?.()
    el.onerror = () => fallbackSpeak(text, slow, onEnd)
    el.src = url
    await el.play()
  } catch {
    fallbackSpeak(text, slow, onEnd)
  }
}

export function speak(text: string, opts: { slow?: boolean } = {}) {
  unlock()
  stop()
  void playOne(text, !!opts.slow)
}

export function speakSequence(texts: string[], slow?: boolean): Promise<void> {
  unlock()
  stop()
  if (!texts.length) return Promise.resolve()
  return new Promise((resolve) => {
    let i = 0
    const next = () => {
      if (i >= texts.length) {
        resolve()
        return
      }
      const text = texts[i]
      i++
      void playOne(text, !!slow, next)
    }
    next()
  })
}
