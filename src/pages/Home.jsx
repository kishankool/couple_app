import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import Card, { CardTitle } from '../components/Card'
import Button from '../components/Button'
import { fsAdd, fsListen } from '../firebase'
import { WhoContext, ToastContext, RoleContext } from '../App'

const ANNIVERSARY = new Date('2025-04-21T00:00:00')

const QUOTES = [
  "Every love story is beautiful, but ours is my favourite. 💕",
  "In all the world, there is no heart for me like yours. 🌸",
  "You are my today and all of my tomorrows. ✨",
  "I love you not only for what you are, but for what I am when I am with you. 💙",
  "Meeting you was fate, becoming your best friend was a choice. 🌹",
  "You are the best thing that's ever been mine. 💕",
  "I fell in love with you because of a million tiny things you never knew you were doing. 🌸",
  "Home is wherever I'm with you. 💙",
  "You make my heart smile. 🌺",
  "To the world you may be one person, but to me you are the world. 🌍",
  "I choose you. And I'll choose you over and over. 💕",
  "In you, I've found the love of my life and my closest, truest friend. ✨",
]

const MOODS = ['😍', '🥰', '😊', '🌸', '😢', '💭', '✨', '💕', '😄', '🤗']

function useTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 })
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - ANNIVERSARY.getTime()
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function Home() {
  const time = useTimer()
  const navigate = useNavigate()
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const { isVisitor } = useContext(RoleContext)
  const [stats, setStats] = useState({ notes: 0, memories: 0, todos: 0, done: 0, photos: 0, locations: 0 })
  const [todayMoods, setTodayMoods] = useState([])
  const [loggingMood, setLoggingMood] = useState(false)

  const dayIdx = Math.floor((Date.now() - ANNIVERSARY.getTime()) / 86400000) % QUOTES.length
  const quote = QUOTES[dayIdx]
  const today = new Date().toDateString()

  // Listen to moods collection (owners only)
  useEffect(() => {
    if (isVisitor) return
    const unsub = fsListen('moods', (data) => {
      setTodayMoods(data.filter(m => {
        try { return new Date(m.date).toDateString() === today } catch { return false }
      }))
    })
    return unsub
  }, [isVisitor])

  // Listen to counts
  useEffect(() => {
    // Always listen to public collections
    const u2 = fsListen('memories', d => setStats(s => ({ ...s, memories: d.length })))
    const unsubs = [u2]
    if (!isVisitor) {
      unsubs.push(fsListen('notes', d => setStats(s => ({ ...s, notes: d.length }))))
      unsubs.push(fsListen('todos', d => setStats(s => ({ ...s, todos: d.length, done: d.filter(t => t.done).length }))))
      unsubs.push(fsListen('updates_photos', d => setStats(s => ({ ...s, photos: d.length }))))
      unsubs.push(fsListen('updates_locations', d => setStats(s => ({ ...s, locations: d.length }))))
    }
    return () => unsubs.forEach(u => u())
  }, [isVisitor])

  const logMood = async (emoji) => {
    if (isVisitor) return showToast('Only Kishan & Aditi can do this 🔒')
    setLoggingMood(true)
    try {
      await fsAdd('moods', { who, emoji, date: new Date().toISOString() })
      showToast(`${who}'s mood logged: ${emoji}`)
    } catch { showToast('Error saving mood') }
    setLoggingMood(false)
  }

  // Stats for visitors vs owners
  const publicStats = [
    ['📸', stats.memories, 'Memories', '/memories'],
    ['☀️', time.days, 'Days Together', '/'],
    ['🌹', 2, 'In Love', '/more'],
  ]
  const ownerStats = [
    ['💌', stats.notes, 'Love Notes', '/notes'],
    ['📸', stats.memories, 'Memories', '/memories'],
    ['✅', `${stats.done}/${stats.todos}`, 'Todos Done', '/todos'],
  ]

  return (
    <div className="page-content">
      {/* Hero Banner */}
      <div style={styles.hero}>
        <div style={styles.heroDecor}>❀ ✿ ❁</div>
        <div style={styles.heroNames}>Kishan & Aditi</div>
        <div style={styles.heroSince}>Together since April 21, 2025</div>
        <div style={styles.timerGrid}>
          {[['Days', time.days], ['Hours', time.hours], ['Mins', String(time.mins).padStart(2, '0')], ['Secs', String(time.secs).padStart(2, '0')]].map(([lbl, val]) => (
            <div key={lbl} style={styles.timerUnit}>
              <span style={styles.timerNum}>{val}</span>
              <span style={styles.timerLbl}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats — clickable cards */}
      <div style={styles.statsGrid}>
        {(isVisitor ? publicStats : ownerStats).map(([icon, val, lbl, path]) => (
          <div key={lbl} style={{ ...styles.statCard, cursor: 'pointer' }} onClick={() => navigate(path)}>
            <span style={{ fontSize: '1.4rem' }}>{icon}</span>
            <span style={styles.statNum}>{val}</span>
            <span style={styles.statLbl}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Mood — only for owners */}
      {!isVisitor && (
        <Card>
          <CardTitle icon="🌸">How are you feeling, {who}?</CardTitle>
          <div style={styles.moodGrid}>
            {MOODS.map(m => (
              <button key={m} onClick={() => logMood(m)} disabled={loggingMood} style={styles.moodBtn}>{m}</button>
            ))}
          </div>
          {todayMoods.length > 0 && (
            <div style={styles.todayMoods}>
              <div className="section-label">Today's moods</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {todayMoods.map((m, i) => (
                  <span key={i} style={styles.todayMoodItem}>
                    {m.who === 'Kishan' ? '💙' : '🌸'} {m.who}: {m.emoji}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Quote */}
      <Card>
        <CardTitle icon="✨">Daily Quote</CardTitle>
        <div style={styles.quote}>{quote}</div>
      </Card>

      {/* Visitor info */}
      {isVisitor && (
        <div style={styles.visitorInfo}>
          👀 You're viewing as a visitor. Tap 📸 Memories or 🌹 More to explore!
        </div>
      )}
    </div>
  )
}

const styles = {
  hero: {
    background: 'linear-gradient(135deg, var(--mauve-deep) 0%, var(--mauve) 60%, var(--rose-dark) 100%)',
    borderRadius: 24,
    padding: '28px 20px',
    textAlign: 'center',
    color: 'white',
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecor: {
    position: 'absolute',
    top: 12,
    right: 16,
    fontSize: '1.1rem',
    opacity: 0.2,
    letterSpacing: 8,
  },
  heroNames: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.5rem, 5vw, 1.9rem)',
    marginBottom: 4,
  },
  heroSince: {
    fontSize: '0.72rem',
    opacity: 0.75,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 18,
  },
  timerUnit: {
    background: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: '12px 6px',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  timerNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
    fontWeight: 600,
    display: 'block',
  },
  timerLbl: {
    fontSize: '0.55rem',
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    background: 'white',
    borderRadius: 16,
    padding: '14px 8px',
    textAlign: 'center',
    boxShadow: '0 3px 14px var(--shadow)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'transform 0.2s',
  },
  statNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)',
    color: 'var(--mauve-deep)',
  },
  statLbl: {
    fontSize: '0.62rem',
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  moodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
    justifyContent: 'center',
  },
  moodBtn: {
    fontSize: '1.5rem',
    padding: '8px',
    border: '2px solid transparent',
    borderRadius: 14,
    background: 'var(--blush)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    aspectRatio: '1',
  },
  todayMoods: {
    marginTop: 14,
    padding: '12px 14px',
    background: 'var(--petal)',
    borderRadius: 12,
  },
  todayMoodItem: {
    fontSize: '0.84rem',
    color: 'var(--mauve)',
    background: 'white',
    padding: '4px 10px',
    borderRadius: 20,
    border: '1px solid var(--border)',
  },
  quote: {
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderLeft: '3px solid var(--rose-dark)',
    borderRadius: 14,
    padding: '16px 18px',
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '0.92rem',
    color: 'var(--mauve-deep)',
    lineHeight: 1.7,
  },
  visitorInfo: {
    fontSize: '0.82rem',
    color: 'var(--mauve)',
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderRadius: 14,
    padding: '14px 18px',
    textAlign: 'center',
    lineHeight: 1.6,
    border: '1px solid var(--border)',
    marginTop: 6,
  },
}
