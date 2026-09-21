import { useRef, useState, type FormEvent } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import './App.css'

// Cloudflare's always-passing test key for local dev. Replace via VITE_TURNSTILE_SITE_KEY.
const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

export default function App() {
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setStatus({ kind: 'error', message: 'Captcha not ready yet, please retry.' })
      return
    }
    setStatus({ kind: 'submitting' })
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, token }),
      })
      const data: { success: boolean; message: string } = await res.json()
      setStatus({ kind: data.success ? 'success' : 'error', message: data.message })
    } catch {
      setStatus({ kind: 'error', message: 'Network error.' })
    } finally {
      // Tokens are single-use: get a fresh one for the next submission.
      setToken(null)
      turnstileRef.current?.reset()
    }
  }

  return (
    <main className="card">
      <h1>Contact us</h1>
      <p className="hint">
        Protected by Cloudflare Turnstile in <strong>invisible</strong> mode — no
        checkbox, no puzzle.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Message
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>

        <Turnstile
          ref={turnstileRef}
          siteKey={SITE_KEY}
          options={{ size: 'invisible', theme: 'light' }}
          onSuccess={setToken}
          onExpire={() => {
            setToken(null)
            turnstileRef.current?.reset()
          }}
          onError={() =>
            setStatus({ kind: 'error', message: 'Captcha failed to load.' })
          }
        />

        <button type="submit" disabled={!token || status.kind === 'submitting'}>
          {status.kind === 'submitting'
            ? 'Sending…'
            : token
              ? 'Send'
              : 'Verifying…'}
        </button>
      </form>

      {status.kind === 'success' && <p className="ok">{status.message}</p>}
      {status.kind === 'error' && <p className="err">{status.message}</p>}
    </main>
  )
}
