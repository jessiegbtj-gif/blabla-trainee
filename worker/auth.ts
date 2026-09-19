
// Password hashing (PBKDF2-SHA256 via Web Crypto, no Node crypto needed) and
// opaque bearer session tokens. No email/phone is ever collected — only a
// username the person picks themselves and a password they set.

const PBKDF2_ITERATIONS = 100_000

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return bufToHex(arr)
}

export function newUserId(): string {
  return 'u_' + randomToken(12)
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return { hash: bufToHex(bits), salt: bufToHex(salt) }
}

export async function verifyPassword(password: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const { hash } = await hashPassword(password, saltHex)
  if (hash.length !== expectedHashHex.length) return false
  // constant-time compare
  let diff = 0
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expectedHashHex.charCodeAt(i)
  return diff === 0
}

export function validUsername(u: string): boolean {
  return /^[a-zA-Z0-9_一-龥]{2,20}$/.test(u)
}

export function validPassword(p: string): boolean {
  return typeof p === 'string' && p.length >= 6 && p.length <= 100
}
