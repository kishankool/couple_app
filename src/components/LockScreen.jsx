import React, { useState } from 'react'
import { loginAnon } from '../firebase'

// Hash a string using SHA-256 (returns hex string, case-sensitive)
async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text.trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// The correct hash lives in .env as VITE_APP_PASSHASH (gitignored — safe for public repos)
// If not set yet, show a setup prompt
const STORED_HASH = import.meta.env.VITE_APP_PASSHASH || ''

export default function LockScreen({ onUnlock }) {
  const [val, setVal] = useState('')
  const [shake, setShake] = useState(false)
  const [checking, setChecking] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [wrong, setWrong] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // If no hash is configured yet, show a setup notice
  const notConfigured = !STORED_HASH

  const tryUnlock = async () => {
    // Guard: if no passphrase is configured, refuse owner access entirely.
    if (notConfigured) {
      console.error('LockScreen: VITE_APP_PASSHASH is not set. Run "npm run setup-pass" to configure.')
      return
    }

    if (!val.trim() || checking) return
    setChecking(true)

    try {
      // ── Primary path: verify passphrase server-side (production on Vercel) ──
      // The raw passphrase travels over HTTPS; the server hashes + compares it
      // against APP_PASSHASH which never touches the browser bundle.
      const res = await fetch('/api/verify-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: val }),
      })

      if (res.status === 429) {
        // Rate limited
        setShake(true)
        setWrong(true)
        setAttempts(a => a + 1)
        setTimeout(() => { setShake(false); setChecking(false) }, 600)
        return
      }

      if (res.ok) {
        // Correct — store session token only after Firebase auth succeeds.
        // If loginAnon() throws, we do NOT persist any partial session state.
        const { sessionToken } = await res.json()
        try {
          await loginAnon()
        } catch (authErr) {
          // Firebase anonymous auth failed — clean up so no stale token remains.
          sessionStorage.removeItem('ka_session_token')
          sessionStorage.removeItem('ka_unlocked')
          console.error('LockScreen: Firebase auth failed after passphrase accepted:', authErr)
          setShake(true)
          setWrong(true)
          setTimeout(() => { setShake(false); setChecking(false) }, 600)
          return
        }
        // Both passphrase and Firebase auth succeeded — persist session now.
        if (sessionToken) sessionStorage.setItem('ka_session_token', sessionToken)
        sessionStorage.setItem('ka_unlocked', '1')
        sessionStorage.setItem('ka_role', 'owner')
        onUnlock('owner')
        setChecking(false)
        return
      }

      if (res.status === 403) {
        // Wrong passphrase
        setShake(true)
        setWrong(true)
        setAttempts(a => a + 1)
        setTimeout(() => { setShake(false); setChecking(false) }, 600)
        setChecking(false)
        return
      }

      // Any other server error — fall through to local fallback below
      throw new Error(`Server returned ${res.status}`)

    } catch (err) {
      if (import.meta.env.DEV) {
        // ── Dev fallback: client-side hash check when running plain `npm run dev` ──
        // /api/verify-passphrase is only reachable via `vercel dev` or in production.
        console.warn('LockScreen [dev]: server verify unavailable, using local fallback.', err.message)

        const inputHash = await sha256(val)
        if (inputHash === STORED_HASH) {
          try {
            await loginAnon()
            sessionStorage.setItem('ka_unlocked', '1')
            sessionStorage.setItem('ka_role', 'owner')
            onUnlock('owner')
          } catch (authErr) {
            console.error('Firebase auth failed:', authErr)
            setShake(true)
            setWrong(true)
            setTimeout(() => { setShake(false) }, 600)
          }
        } else {
          setShake(true)
          setWrong(true)
          setAttempts(a => a + 1)
          setTimeout(() => { setShake(false); setChecking(false) }, 600)
        }
      } else {
        // ── Production: never fall back to client-side verification ──
        // If the server is unreachable, treat it as a failed unlock — do not
        // expose the hash comparison path in a deployed build.
        console.warn('LockScreen: server verification unavailable in production.', err.message)
        setShake(true)
        setWrong(true)
        setAttempts(a => a + 1)
        setTimeout(() => { setShake(false); setChecking(false) }, 600)
      }
    }

    setChecking(false)
  }

  return (
    <div style={s.overlay}>
      <div style={s.bg} />

      <div style={{ ...s.card, animation: shake ? 'shakeLock 0.5s ease' : 'fadeUp 0.6s ease' }}>
        <div style={s.hearts}>💕</div>
        <div style={s.lockIcon}>🔒</div>
        <h1 style={s.title}>Kishan &amp; Aditi</h1>
        <p style={s.sub}>This is our private space.<br />Enter the secret to continue 🌸</p>

        {notConfigured && (
          <div style={s.setupBanner}>
            🔒 No passphrase configured — owner access is disabled.<br /><br />
            Run <code style={s.code}>npm run setup-pass</code> to set a passphrase,
            then restart the dev server. You may still enter as a Visitor below.
          </div>
        )}

        {!notConfigured && (
          <>
            <div style={s.question}>
              What's our secret word? 🌹
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={val}
                placeholder="Enter passphrase..."
                onChange={e => { setVal(e.target.value); setWrong(false) }}
                onKeyDown={e => e.key === 'Enter' && tryUnlock()}
                style={{
                  ...s.input,
                  borderColor: wrong ? '#e88080' : 'rgba(200,120,140,0.3)',
                  paddingRight: 44,
                }}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={s.eyeBtn}
                aria-label={showPass ? 'Hide passphrase' : 'Show passphrase'}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>

            {wrong && (
              <div style={s.wrongMsg}>
                {attempts >= 3
                  ? '💡 Hint: Think of our special word 💕'
                  : "That's not right, try again 🌸"}
              </div>
            )}
          </>
        )}

        <button
          style={{ ...s.btn, opacity: (checking || notConfigured) ? 0.45 : 1 }}
          onClick={tryUnlock}
          disabled={checking || notConfigured}
          title={notConfigured ? 'Set VITE_APP_PASSHASH first (npm run setup-pass)' : undefined}
        >
          {checking ? 'Checking…' : 'Enter with love 💕'}
        </button>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <span style={s.dividerLine} />
        </div>

        <button style={s.visitorBtn} onClick={() => {
          sessionStorage.setItem('ka_unlocked', '1')
          sessionStorage.setItem('ka_role', 'visitor')
          onUnlock('visitor')
        }}>
          View as Visitor 👀
        </button>

        <p style={s.footer}>Only the two of us know the secret 🌹</p>
        <p style={s.credit}>Made with 💕 by Kishan</p>
      </div>

      <style>{`
        @keyframes shakeLock {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-12px); }
          40%     { transform: translateX(12px); }
          60%     { transform: translateX(-8px); }
          80%     { transform: translateX(8px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'linear-gradient(160deg, #fdf0f5 0%, #f5dde0 45%, #e8d0d8 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
    paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
  },
  bg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e8a0a0' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
  },
  card: {
    background: 'white',
    borderRadius: 28,
    padding: '36px 28px 32px',
    width: '100%', maxWidth: 380,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(180,100,120,0.22)',
    position: 'relative',
  },
  hearts: { fontSize: '2rem', marginBottom: 4, letterSpacing: 8 },
  lockIcon: { fontSize: '2.8rem', marginBottom: 10 },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', color: '#6d3f52', marginBottom: 8,
  },
  sub: {
    fontSize: '0.9rem', color: '#9b6b7b',
    lineHeight: 1.6, marginBottom: 22,
  },
  setupBanner: {
    background: '#fff8e1',
    border: '1px solid #ffe082',
    borderRadius: 14,
    padding: '14px 16px',
    fontSize: '0.82rem',
    color: '#7a6000',
    marginBottom: 18,
    lineHeight: 1.6,
    textAlign: 'left',
  },
  code: {
    fontFamily: 'monospace',
    background: '#f3e5ab',
    padding: '1px 6px',
    borderRadius: 6,
    fontSize: '0.78rem',
  },
  question: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic', fontSize: '1rem', color: '#6d3f52',
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderRadius: 14, padding: '14px 18px', marginBottom: 16,
  },
  input: {
    width: '100%', padding: '14px 16px',
    border: '2px solid rgba(200,120,140,0.3)',
    borderRadius: 14,
    fontFamily: 'Lato, sans-serif',
    fontSize: '1rem', color: '#4a3040',
    background: '#fdf0f2', outline: 'none',
    textAlign: 'center', marginBottom: 10,
    display: 'block', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    WebkitAppearance: 'none', appearance: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-66%)',
    background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '1.1rem',
    padding: 4, lineHeight: 1,
    WebkitTapHighlightColor: 'transparent',
  },
  wrongMsg: {
    fontSize: '0.82rem', color: '#c05050',
    background: '#fff0f0', borderRadius: 12,
    padding: '10px 14px', marginBottom: 10,
  },
  btn: {
    width: '100%', padding: '14px',
    background: 'linear-gradient(135deg, #9b6b7b, #6d3f52)',
    color: 'white', border: 'none', borderRadius: 50,
    fontFamily: 'Lato, sans-serif',
    fontSize: '0.95rem', cursor: 'pointer',
    marginTop: 4, letterSpacing: '0.3px',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  footer: { fontSize: '0.72rem', color: '#b89090', marginTop: 16 },
  credit: {
    fontSize: '0.62rem',
    color: 'rgba(155,107,123,0.45)',
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    letterSpacing: '0.4px',
    marginTop: 6,
    userSelect: 'none',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '14px 0 10px',
  },
  dividerLine: {
    flex: 1, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(200,120,140,0.25), transparent)',
  },
  dividerText: {
    fontSize: '0.75rem', color: '#b89090',
    fontFamily: 'Lato, sans-serif',
  },
  visitorBtn: {
    width: '100%', padding: '12px',
    background: 'transparent',
    color: 'var(--mauve, #9b6b7b)',
    border: '2px solid rgba(155,107,123,0.25)',
    borderRadius: 50,
    fontFamily: 'Lato, sans-serif',
    fontSize: '0.88rem',
    cursor: 'pointer',
    letterSpacing: '0.3px',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
}
