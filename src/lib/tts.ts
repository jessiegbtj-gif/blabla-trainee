// Text-to-speech via the Web Speech API, ported from the original app.
let voicesCache: SpeechSynthesisVoice[] = []

function loadVoices() {
  voicesCache = window.speechSynthesis ? window.speechSynthesis.getVoices() : []
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!voicesCache.length) return null
  return (
    voicesCache.find((v) => /^en-US/i.test(v.lang) && /Google|Samantha|Natural|Aria/i.test(v.name)) ||
    voicesCache.find((v) => /^en-US/i.test(v.lang)) ||
    voicesCache.find((v) => /^en/i.test(v.lang)) ||
    null
  )
}

export function speak(text: string, opts: { slow?: boolean } = {}) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = opts.slow ? 0.7 : 1
  const v = pickVoice()
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

export function speakSequence(texts: string[], slow?: boolean) {
  if (!window.speechSynthesis || !texts.length) return
  window.speechSynthesis.cancel()
  let i = 0
  function next() {
    if (i >= texts.length) return
    const u = new SpeechSynthesisUtterance(texts[i])
    u.lang = 'en-US'
    u.rate = slow ? 0.7 : 1
    const v = pickVoice()
    if (v) u.voice = v
    u.onend = () => {
      i++
      next()
    }
    window.speechSynthesis.speak(u)
  }
  next()
}
