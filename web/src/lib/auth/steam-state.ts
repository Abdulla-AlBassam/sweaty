import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// Steam OAuth state — HMAC-signed payload that survives a redirect through
// Steam and back to our /callback endpoint. Without a signature, an attacker
// could craft a state with another user's UUID and have the callback link
// the attacker's Steam account to the victim's profile.

interface SteamStatePayload {
  user_id: string
  redirect_uri: string | null
  nonce: string
  ts: number
}

// 30 minutes — generous margin for users to complete the Steam OpenID flow
// without leaving stale states valid forever.
const MAX_STATE_AGE_MS = 30 * 60 * 1000

function getSecret(): Buffer {
  const secret = process.env.STEAM_STATE_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('STEAM_STATE_SECRET must be set to a strong random value (>= 32 chars)')
  }
  return Buffer.from(secret, 'utf8')
}

export function signSteamState(opts: {
  userId: string
  redirectUri: string | null
}): string {
  const payload: SteamStatePayload = {
    user_id: opts.userId,
    redirect_uri: opts.redirectUri,
    nonce: randomBytes(16).toString('hex'),
    ts: Date.now(),
  }
  const json = JSON.stringify(payload)
  const body = Buffer.from(json).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

/**
 * Verify and decode a Steam state token. Returns the payload only when:
 *   1. The format matches `<base64url>.<base64url>`
 *   2. The HMAC matches (constant-time compare)
 *   3. The state is younger than `MAX_STATE_AGE_MS`
 * Otherwise returns `null`.
 */
export function verifySteamState(state: string): SteamStatePayload | null {
  if (!state || typeof state !== 'string') return null
  const dot = state.indexOf('.')
  if (dot <= 0 || dot === state.length - 1) return null

  const body = state.slice(0, dot)
  const provided = state.slice(dot + 1)

  let secret: Buffer
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let payload: SteamStatePayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (
    !payload ||
    typeof payload.user_id !== 'string' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.ts !== 'number'
  ) {
    return null
  }

  if (Date.now() - payload.ts > MAX_STATE_AGE_MS) return null

  return payload
}
