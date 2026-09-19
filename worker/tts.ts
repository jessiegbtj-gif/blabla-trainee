// Azure Neural TTS, cached in R2 so each unique (voice, rate, sentence)
// combination is synthesized once and reused forever after. Cost/usage
// therefore scales with the size of the shared question bank, not with how
// many times people press play.
import type { Context } from 'hono'
import type { Env } from './types'

const VOICE = 'en-US-AriaNeural'
const MAX_TEXT_LEN = 1000

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function synthesizeWithAzure(env: Env, text: string, slow: boolean): Promise<ArrayBuffer> {
  const region = env.AZURE_TTS_REGION
  const key = env.AZURE_TTS_KEY
  if (!region || !key) throw new Error('Azure TTS is not configured (missing region or key)')

  const rate = slow ? '-30%' : '0%'
  const ssml = `<speak version="1.0" xml:lang="en-US"><voice xml:lang="en-US" xml:gender="Female" name="${VOICE}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'pte-trainee',
    },
    body: ssml,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Azure TTS returned ${res.status}: ${detail.slice(0, 300)}`)
  }
  return await res.arrayBuffer()
}

export async function handleTts(c: Context<{ Bindings: Env }>) {
  const text = (c.req.query('text') || '').trim()
  const slow = c.req.query('slow') === '1'
  if (!text) return c.json({ error: 'text required' }, 400)
  if (text.length > MAX_TEXT_LEN) return c.json({ error: 'text too long' }, 400)

  const cacheKey = await sha256Hex(`${VOICE}|${slow ? 'slow' : 'normal'}|${text}`)
  const objectKey = `tts/${cacheKey}.mp3`

  const cached = await c.env.TTS_CACHE.get(objectKey)
  if (cached) {
    return new Response(cached.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  let audio: ArrayBuffer
  try {
    audio = await synthesizeWithAzure(c.env, text, slow)
  } catch (err) {
    return c.json({ error: 'tts_failed', detail: String(err) }, 502)
  }

  await c.env.TTS_CACHE.put(objectKey, audio, { httpMetadata: { contentType: 'audio/mpeg' } })

  return new Response(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
