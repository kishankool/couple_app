import React, { useState, useEffect } from 'react'

const SECRET_KEY   = 'ka_unlocked'
const CORRECT_DATE = '21 april 2025'   // canonical answer
const HINTS        = ['Try: day month year', 'Format: 21 april 2025', 'When did your love story begin?']

function normalise(s) {
  return s.toLowerCase()
    .replace(/[\/\-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // "april 21 2025" → also accepted
}

function isCorrect(input) {
  const n = normalise(input)
  // Accept multiple formats
  const accepted = [
    '21 april 2025',
    'april 21 2025',
    '21/04/2025',
    '21-04-2025',
    '2025-04-21',
    '21 04 2025',
    '04 21 2025',
  ]
  return accepted.includes(n)
}

export default function LockScreen({ onUnlock }) {
  const [val, setVal]       = useState('')
  const [shake, setShake]   = useState(false)
  const [hint, setHint]     = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const tryUnlock = () => {
    if (isCorrect(val)) {
      sessionStorage.setItem(SECRET_KEY, '1')
      onUnlock()
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 600)
      const a = attempts + 1
      setAttempts(a)
      if (a >= 2) setShowHint(true)
      if (a >= 4) setHint(h => Math.min(h + 1, HINTS.length - 1))
    }
  }

  return (
    <div style={styles.overlay}>
      {/* Floating petals bg */}
      <div style={styles.bg} />

      <div style={{ ...styles.card, animation: shake ? 'shakeLock 0.5s ease' : 'fadeUp 0.6s ease' }}>
        {/* Hearts */}
        <div style={styles.hearts}>💕</div>

        <div style={styles.lockIcon}>🔒</div>
        <h1 style={styles.title}>Kishan & Aditi</h1>
        <p style={styles.sub}>This is a private space.<br />Answer to enter 🌸</p>

        <div style={styles.question}>When did our relationship begin?</div>

        <input
          style={styles.input}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          placeholder="e.g. 21 april 2025"
          autoFocus
        />

        {showHint && (
          <div style={styles.hint}>💡 {HINTS[hint]}</div>
        )}

        <button style={styles.btn} onClick={tryUnlock}>
          Enter with love 💕
        </button>

        <p style={styles.footer}>Only the two of us know this 🌹</p>
      </div>

      <style>{`
        @keyframes shakeLock {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-10px); }
          40%     { transform: translateX(10px); }
          60%     { transform: translateX(-8px); }
          80%     { transform: translateX(8px); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatHeart {
          0%   { transform: translateY(0) scale(1);   opacity:0.7; }
          100% { transform: translateY(-80px) scale(1.3); opacity:0; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'linear-gradient(160deg, #fdf0f5 0%, #f5dde0 40%, #e8d0d8 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  bg: {
    position: 'absolute', inset: 0,
    background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e8a0a0\' fill-opacity=\'0.07\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    pointerEvents: 'none',
  },
  card: {
    background: 'white',
    borderRadius: 28,
    padding: '36px 28px 32px',
    width: '100%',
    maxWidth: 380,
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(180,100,120,0.2)',
    position: 'relative',
  },
  hearts: { fontSize: '2rem', marginBottom: 4, letterSpacing: 8 },
  lockIcon: { fontSize: '2.8rem', marginBottom: 10 },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.8rem',
    color: '#6d3f52',
    marginBottom: 8,
  },
  sub: {
    fontSize: '0.88rem',
    color: '#9b6b7b',
    lineHeight: 1.6,
    marginBottom: 22,
  },
  question: {
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '1rem',
    color: '#6d3f52',
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    border: '2px solid rgba(200,120,140,0.3)',
    borderRadius: 14,
    fontFamily: "'Lato', sans-serif",
    fontSize: '0.95rem',
    color: '#4a3040',
    background: '#fdf0f2',
    outline: 'none',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: '0.5px',
  },
  hint: {
    fontSize: '0.78rem',
    color: '#9b6b7b',
    background: '#fdf0f5',
    borderRadius: 10,
    padding: '8px 12px',
    marginBottom: 10,
  },
  btn: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #9b6b7b, #6d3f52)',
    color: 'white',
    border: 'none',
    borderRadius: 50,
    fontFamily: "'Lato', sans-serif",
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.3px',
  },
  footer: {
    fontSize: '0.72rem',
    color: '#b89090',
    marginTop: 16,
  },
}
