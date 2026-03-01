import React, { useState } from 'react'

// The secret answer — April 21 2025
const SECRET_MONTH = '04'
const SECRET_DAY = '21'
const SECRET_YEAR = '2025'
const CORRECT_VALUE = '2025-04-21'

export default function LockScreen({ onUnlock }) {
  const [val, setVal] = useState('')
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [wrong, setWrong] = useState(false)

  const tryUnlock = () => {
    if (val === CORRECT_VALUE) {
      sessionStorage.setItem('ka_unlocked', '1')
      onUnlock()
    } else {
      setShake(true)
      setWrong(true)
      setAttempts(a => a + 1)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.bg} />

      <div style={{ ...s.card, animation: shake ? 'shakeLock 0.5s ease' : 'fadeUp 0.6s ease' }}>
        <div style={s.hearts}>💕</div>
        <div style={s.lockIcon}>🔒</div>
        <h1 style={s.title}>Kishan & Aditi</h1>
        <p style={s.sub}>This is our private space.<br />Answer to enter 🌸</p>

        <div style={s.question}>
          When did our relationship begin?
        </div>

        <input
          type="date"
          value={val}
          onChange={e => { setVal(e.target.value); setWrong(false) }}
          onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          style={{
            ...s.input,
            borderColor: wrong ? '#e88080' : 'rgba(200,120,140,0.3)',
          }}
          max="2099-12-31"
        />

        {wrong && (
          <div style={s.wrongMsg}>
            {attempts >= 3
              ? "💡 Hint: It's the day we started 💕"
              : "That's not right, try again 🌸"}
          </div>
        )}

        <button style={s.btn} onClick={tryUnlock}>
          Enter with love 💕
        </button>

        <p style={s.footer}>Only the two of us know this date 🌹</p>
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
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(40%) sepia(20%) saturate(400%) hue-rotate(300deg);
          cursor: pointer;
          padding: 4px;
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
    fontFamily: "Lato, sans-serif",
    fontSize: '1rem', color: '#4a3040',
    background: '#fdf0f2', outline: 'none',
    textAlign: 'center', marginBottom: 10,
    display: 'block', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    WebkitAppearance: 'none',
    appearance: 'none',
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
    fontFamily: "Lato, sans-serif",
    fontSize: '0.95rem', cursor: 'pointer',
    marginTop: 4, letterSpacing: '0.3px',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  footer: { fontSize: '0.72rem', color: '#b89090', marginTop: 16 },
}
