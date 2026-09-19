// Text-to-speech via the app's own /api/tts endpoint, which proxies to Azure
// Neural TTS and caches the generated audio server-side (see worker/tts.ts)
// so the same sentence is never re-synthesized. Falls back to the browser's
// built-in speech synthesis if the network request ever fails, so playback
// still works even if the backend or Azure is briefly unreachable.
import { getToken } from './api'

const audioUrlCache = new Map<string, string>() // cache key -> object URL, this tab only
let currentAudio: HTMLAudioElement | null = null

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

function stopCurrent() {
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio.pause()
    currentAudio = null
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
    const audio = new Audio(url)
    currentAudio = audio
    audio.onended = () => {
      currentAudio = null
      onEnd?.()
    }
    audio.onerror = () => {
      currentAudio = null
      fallbackSpeak(text, slow, onEnd)
    }
    await audio.play()
  } catch {
    fallbackSpeak(text, slow, onEnd)
  }
}

export function speak(text: string, opts: { slow?: boolean } = {}) {
  stopCurrent()
  void playOne(text, !!opts.slow)
}

export function speakSequence(texts: string[], slow?: boolean) {
  stopCurrent()
  if (!texts.length) return
  let i = 0
  const next = () => {
    if (i >= texts.length) return
    const text = texts[i]
    i++
    void playOne(text, !!slow, next)
  }
  next()
}
