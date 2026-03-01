import React, { useState, useEffect, useContext } from 'react'
import Card, { CardTitle } from '../components/Card'
import Button from '../components/Button'
import { fsAdd, fsListen } from '../firebase'
import { WhoContext, ToastContext } from '../App'

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
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const [stats, setStats] = useState({ notes: 0, memories: 0, todos: 0, done: 0 })
  const [todayMoods, setTodayMoods] = useState([])
  const [loggingMood, setLoggingMood] = useState(false)

  const dayIdx = Math.floor((Date.now() - ANNIVERSARY.getTime()) / 86400000) % QUOTES.length
  const quote = QUOTES[dayIdx]
  const today = new Date().toDateString()

  // Listen to moods collection
  useEffect(() => {
    const unsub = fsListen('moods', (data) => {
      setTodayMoods(data.filter(m => new Date(m.date).toDateString() === today))
    })
    return unsub
  }, [])

  // Listen to counts
  useEffect(() => {
    const u1 = fsListen('notes', d => setStats(s => ({ ...s, notes: d.length })))
    const u2 = fsListen('memories', d => setStats(s => ({ ...s, memories: d.length })))
    const u3 = fsListen('todos', d => setStats(s => ({ ...s, todos: d.length, done: d.filter(t => t.done).length })))
    return () => { u1(); u2(); u3() }
  }, [])

  const logMood = async (emoji) => {
    setLoggingMood(true)
    try {
      await fsAdd('moods', { who, emoji, date: new Date().toISOString() })
      showToast(`${who}'s mood logged: ${emoji}`)
    } catch { showToast('Error saving mood') }
    setLoggingMood(false)
  }

  return (
    <div style={{ padding: '18px 16px 10px' }}>
      {/* Hero Banner */}
      <div style={styles.hero}>
        <div style={{ position: 'absolute', top: 12, right: 16, fontSize: '1.1rem', opacity: 0.3, letterSpacing: 8 }}>❀ ✿ ❁</div>
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

      {/* Stats */}
      <div style={styles.statsGrid}>
        {[
          ['💌', stats.notes, 'Love Notes'],
          ['📸', stats.memories, 'Memories'],
          [`✅`, `${stats.done}/${stats.todos}`, 'Todos Done'],
        ].map(([icon, val, lbl]) => (
          <div key={lbl} style={styles.statCard}>
            <span style={{ fontSize: '1.3rem' }}>{icon}</span>
            <span style={styles.statNum}>{val}</span>
            <span style={styles.statLbl}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Mood */}
      <Card>
        <CardTitle icon="🌸">How are you feeling, {who}?</CardTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {MOODS.map(m => (
            <button key={m} onClick={() => logMood(m)} disabled={loggingMood} style={styles.moodBtn}>{m}</button>
          ))}
        </div>
        {todayMoods.length > 0 && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--petal)', borderRadius: 10 }}>
            <div className="section-label">Today's moods</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {todayMoods.map((m, i) => (
                <span key={i} style={{ fontSize: '0.82rem', color: 'var(--mauve)' }}>
                  {m.who === 'Kishan' ? '💙' : '🌸'} {m.who}: {m.emoji}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Quote */}
      <Card>
        <CardTitle icon="✨">Daily Quote</CardTitle>
        <div style={styles.quote}>{quote}</div>
      </Card>
    </div>
  )
}

const styles = {
  hero: {
    background: 'linear-gradient(135deg, var(--mauve-deep) 0%, var(--mauve) 60%, var(--rose-dark) 100%)',
    borderRadius: 24,
    padding: '26px 20px',
    textAlign: 'center',
    color: 'white',
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  heroNames: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.8rem',
    marginBottom: 4,
  },
  heroSince: { fontSize: '0.72rem', opacity: 0.75, letterSpacing: 2, textTransform: 'uppercase' },
  timerGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 18 },
  timerUnit: {
    background: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: '10px 6px',
    backdropFilter: 'blur(4px)',
  },
  timerNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    fontWeight: 600,
    display: 'block',
  },
  timerLbl: { fontSize: '0.55rem', opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 },
  statCard: {
    background: 'white',
    borderRadius: 16,
    padding: '12px 8px',
    textAlign: 'center',
    boxShadow: '0 3px 14px var(--shadow)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  statNum: { fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', color: 'var(--mauve-deep)' },
  statLbl: { fontSize: '0.65rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1 },
  moodBtn: {
    fontSize: '1.45rem',
    padding: '7px 10px',
    border: '2px solid transparent',
    borderRadius: 12,
    background: 'var(--blush)',
    cursor: 'pointer',
    transition: 'all 0.18s',
  },
  quote: {
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderLeft: '3px solid var(--rose-dark)',
    borderRadius: 12,
    padding: '14px 16px',
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    fontSize: '0.9rem',
    color: 'var(--mauve-deep)',
    lineHeight: 1.7,
  },
}
