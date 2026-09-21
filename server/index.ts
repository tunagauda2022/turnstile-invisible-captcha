import express from 'express'
import cors from 'cors'

// Cloudflare's always-passing test secret for local dev. Replace via TURNSTILE_SECRET_KEY.
const SECRET_KEY =
  process.env.TURNSTILE_SECRET_KEY ?? '1x0000000000000000000000000000000AA'
const PORT = Number(process.env.PORT ?? 3001)

interface SiteverifyResponse {
  success: boolean
  'error-codes': string[]
  challenge_ts?: string
  hostname?: string
}

async function verifyTurnstile(token: string, ip?: string): Promise<SiteverifyResponse> {
  const body = new URLSearchParams({ secret: SECRET_KEY, response: token })
  if (ip) body.set('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  return (await res.json()) as SiteverifyResponse
}

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/submit', async (req, res) => {
  const { token, email, message } = req.body as {
    token?: string
    email?: string
    message?: string
  }
  if (!token) {
    res.status(400).json({ success: false, message: 'Missing captcha token.' })
    return
  }

  const result = await verifyTurnstile(token, req.ip)
  if (!result.success) {
    res.status(403).json({
      success: false,
      message: `Captcha verification failed: ${result['error-codes'].join(', ')}`,
    })
    return
  }

  console.log('Verified submission', { email, message })
  res.json({ success: true, message: 'Thanks! Your message was received.' })
})

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
