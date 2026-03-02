import React, { useState, useEffect, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Card, { CardTitle } from '../components/Card'
import Button from '../components/Button'
import Confetti from '../components/Confetti'
import { fsAdd, fsListen, fsSet, db } from '../firebase'
import { doc, getDoc, setDoc, increment } from 'firebase/firestore'
import { WhoContext, ToastContext, RoleContext } from '../App'
import { notifyPartner } from '../push'

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

const MOODS = ['😍', '🥰', '😊', '🌸', '😢', '💭', '✨', '💕', '😄', '🤗', '😠']

// Milestones in days
const MILESTONES = [
  { days: 7, label: '1 Week!', icon: '🎊' },
  { days: 30, label: '1 Month! 💕', icon: '🎉' },
  { days: 50, label: '50 Days!', icon: '✨' },
  { days: 100, label: '100 Days! 💯', icon: '🎊' },
  { days: 200, label: '200 Days!', icon: '🥂' },
  { days: 365, label: '1 Year! 🥳', icon: '🎂' },
  { days: 500, label: '500 Days!', icon: '🏆' },
  { days: 730, label: '2 Years!', icon: '💍' },
]

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

function getNextMilestone(days) {
  return MILESTONES.find(m => m.days > days) || null
}

function getTodayKey() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
}

// ── Hug/Kiss floating animation ──
function FloatingEmoji({ emoji, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.8 }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        bottom: 160,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '3rem',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    >
      {emoji}
    </motion.div>
  )
}

export default function Home() {
  const time = useTimer()
  const navigate = useNavigate()
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const { isVisitor } = useContext(RoleContext)

  const [stats, setStats] = useState({ notes: 0, memories: 0, todos: 0, done: 0 })
  const [todayMoods, setTodayMoods] = useState([])
  const [loggingMood, setLogging] = useState(false)

  // Hug / Kiss
  const [floatingEmoji, setFloatingEmoji] = useState(null)
  const [sendingHug, setSendingHug] = useState(false)

  // Good Morning / Night streak
  const [gmData, setGmData] = useState(null) // { kishanGM, aditiGM, kishanGN, aditiGN, gmStreak, gnStreak }
  const [sendingGM, setSendingGM] = useState(false)
  const [sendingGN, setSendingGN] = useState(false)

  // Miss you counter
  const [missCount, setMissCount] = useState({ Kishan: 0, Aditi: 0 })
  const [missTapping, setMissTapping] = useState(false)

  // Confetti for milestone
  const [confettiBurst, setConfettiBurst] = useState(false)

  const today = new Date().toDateString()
  const todayKey = getTodayKey()
  const dayIdx = Math.floor((Date.now() - ANNIVERSARY.getTime()) / 86400000) % QUOTES.length
  const quote = QUOTES[dayIdx]

  // Check if today is a milestone
  useEffect(() => {
    const days = time.days
    if (days < 7) return
    const isMilestone = MILESTONES.some(m => m.days === days)
    if (!isMilestone) return
    const seenKey = `ka_milestone_seen_${days}`
    if (!localStorage.getItem(seenKey)) {
      localStorage.setItem(seenKey, '1')
      setConfettiBurst(true)
      setTimeout(() => setConfettiBurst(false), 100)
    }
  }, [time.days])

  // Listen to moods
  useEffect(() => {
    if (isVisitor) return
    const unsub = fsListen('moods', data => {
      setTodayMoods(data.filter(m => {
        try { return new Date(m.date).toDateString() === today } catch { return false }
      }))
    })
    return unsub
  }, [isVisitor])

  // Listen to counts
  useEffect(() => {
    const u2 = fsListen('memories', d => setStats(s => ({ ...s, memories: d.length })))
    const unsubs = [u2]
    if (!isVisitor) {
      unsubs.push(fsListen('notes', d => setStats(s => ({ ...s, notes: d.length }))))
      unsubs.push(fsListen('todos', d => setStats(s => ({ ...s, todos: d.length, done: d.filter(t => t.done).length }))))
    }
    return () => unsubs.forEach(u => u())
  }, [isVisitor])

  // Load Good Morning / Good Night data
  useEffect(() => {
    if (isVisitor) return
    const ref = doc(db, 'good_morning', todayKey)
    getDoc(ref).then(snap => {
      setGmData(snap.exists() ? snap.data() : {})
    }).catch(() => { })
  }, [todayKey, isVisitor])

  // Load Miss You counter
  useEffect(() => {
    if (isVisitor) return
    const ref = doc(db, 'miss_you', 'counter')
    getDoc(ref).then(snap => {
      if (snap.exists()) setMissCount(snap.data())
    }).catch(() => { })
  }, [isVisitor])

  const logMood = async (emoji) => {
    if (isVisitor) return showToast('Only Kishan & Aditi can do this 🔒')
    setLogging(true)
    try {
      await fsAdd('moods', { who, emoji, date: new Date().toISOString() })
      showToast(`Mood logged: ${emoji}`)
      notifyPartner(who, {
        title: `${who} is feeling ${emoji}`,
        body: `Check how ${who} is feeling today!`,
        url: '/'
      }).catch(() => { })
    } catch { showToast('Error saving mood') }
    setLogging(false)
  }

  const sendHugOrKiss = async (type) => {
    if (isVisitor) return showToast('Only Kishan & Aditi can do this 🔒')
    setSendingHug(true)
    const emoji = type === 'hug' ? '🤗' : '💋'
    const label = type === 'hug' ? 'hug' : 'kiss'
    setFloatingEmoji(emoji)
    try {
      await notifyPartner(who, {
        title: `${emoji} ${who} sent you a ${label}!`,
        body: `Open the app to send one back! 💕`,
        url: '/',
      })
      await fsAdd('hugs_kisses', { who, type, date: new Date().toISOString() })
      showToast(`${emoji} Sent to ${who === 'Kishan' ? 'Aditi' : 'Kishan'}!`)
    } catch { showToast(`${emoji} Sent!`) }
    setSendingHug(false)
  }

  const sendGoodMorning = async () => {
    if (isVisitor) return
    setSendingGM(true)
    try {
      const ref = doc(db, 'good_morning', todayKey)
      await setDoc(ref, { [`${who}GM`]: true }, { merge: true })
      setGmData(d => ({ ...(d || {}), [`${who}GM`]: true }))
      await notifyPartner(who, {
        title: `☀️ Good Morning from ${who}!`,
        body: `${who} is wishing you a wonderful morning 🌸`,
        url: '/',
      })
      showToast('Good morning sent! ☀️')
    } catch { showToast('Good morning! ☀️') }
    setSendingGM(false)
  }

  const sendGoodNight = async () => {
    if (isVisitor) return
    setSendingGN(true)
    try {
      const ref = doc(db, 'good_morning', todayKey)
      await setDoc(ref, { [`${who}GN`]: true }, { merge: true })
      setGmData(d => ({ ...(d || {}), [`${who}GN`]: true }))
      await notifyPartner(who, {
        title: `🌙 Good Night from ${who}!`,
        body: `${who} is wishing you sweet dreams 💕`,
        url: '/',
      })
      showToast('Good night sent! 🌙')
    } catch { showToast('Good night! 🌙') }
    setSendingGN(false)
  }

  const tapMissYou = async () => {
    if (isVisitor) return showToast('Only Kishan & Aditi can do this 🔒')
    setMissTapping(true)
    try {
      const ref = doc(db, 'miss_you', 'counter')
      await setDoc(ref, { [who]: increment(1) }, { merge: true })
      setMissCount(c => ({ ...c, [who]: (c[who] || 0) + 1 }))
      setFloatingEmoji('💭')
      notifyPartner(who, {
        title: `💭 ${who} is missing you!`,
        body: `${who === 'Kishan' ? 'Aditi' : 'Kishan'}, you're on ${who}'s mind 💕`,
        url: '/',
      }).catch(() => { })
    } catch { showToast('Sending miss you…') }
    setMissTapping(false)
  }

  // Next milestone
  const nextMilestone = getNextMilestone(time.days)
  const currentMilestone = MILESTONES.find(m => m.days === time.days)

  const iHaveSentGM = gmData?.[`${who}GM`]
  const iHaveSentGN = gmData?.[`${who}GN`]
  const partnerSentGM = gmData?.[`${who === 'Kishan' ? 'Aditi' : 'Kishan'}GM`]
  const partnerSentGN = gmData?.[`${who === 'Kishan' ? 'Aditi' : 'Kishan'}GN`]

  const ownerStats = [
    ['💌', stats.notes, 'Love Notes', '/notes'],
    ['📸', stats.memories, 'Memories', '/memories'],
    ['✅', `${stats.done}/${stats.todos}`, 'Todos Done', '/todos'],
  ]
  const publicStats = [
    ['📸', stats.memories, 'Memories', '/memories'],
    ['☀️', time.days, 'Days Together', '/'],
    ['🌹', 2, 'In Love', '/more'],
  ]

  return (
    <div className="page-content">
      {/* Confetti for milestone! */}
      <Confetti active={confettiBurst} />

      {/* Floating emoji animation */}
      <AnimatePresence>
        {floatingEmoji && (
          <FloatingEmoji emoji={floatingEmoji} onDone={() => setFloatingEmoji(null)} />
        )}
      </AnimatePresence>

      {/* ─── Hero Banner ─── */}
      <div style={styles.hero}>
        <div style={styles.heroDecor}>❀ ✿ ❁</div>
        <div style={styles.heroNames}>Kishan &amp; Aditi</div>
        <div style={styles.heroSince}>Together since April 21, 2025</div>
        <div style={styles.timerGrid}>
          {[['Days', time.days], ['Hours', time.hours], ['Mins', String(time.mins).padStart(2, '0')], ['Secs', String(time.secs).padStart(2, '0')]].map(([lbl, val]) => (
            <div key={lbl} style={styles.timerUnit}>
              <span style={styles.timerNum}>{val}</span>
              <span style={styles.timerLbl}>{lbl}</span>
            </div>
          ))}
        </div>

        {/* Milestone badge */}
        {currentMilestone && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={styles.milestoneBadge}
          >
            {currentMilestone.icon} {currentMilestone.label}
          </motion.div>
        )}

        {/* Next milestone hint */}
        {nextMilestone && !currentMilestone && (
          <div style={styles.nextMilestone}>
            🎯 {nextMilestone.days - time.days} days until {nextMilestone.label}
          </div>
        )}
      </div>

      {/* ─── Stats ─── */}
      <div style={styles.statsGrid}>
        {(isVisitor ? publicStats : ownerStats).map(([icon, val, lbl, path]) => (
          <div key={lbl} style={{ ...styles.statCard, cursor: 'pointer' }} onClick={() => navigate(path)}>
            <span style={{ fontSize: '1.4rem' }}>{icon}</span>
            <span style={styles.statNum}>{val}</span>
            <span style={styles.statLbl}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* ─── Hug / Kiss / Miss You (owners only) ─── */}
      {!isVisitor && (
        <Card>
          <CardTitle icon="💌">Send Love</CardTitle>
          <div style={styles.sendLoveGrid}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              style={styles.loveBtn}
              onClick={() => sendHugOrKiss('hug')}
              disabled={sendingHug}
            >
              <span style={{ fontSize: '2rem' }}>🤗</span>
              <span style={styles.loveBtnLabel}>Hug</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              style={styles.loveBtn}
              onClick={() => sendHugOrKiss('kiss')}
              disabled={sendingHug}
            >
              <span style={{ fontSize: '2rem' }}>💋</span>
              <span style={styles.loveBtnLabel}>Kiss</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              style={{ ...styles.loveBtn, ...(missTapping ? { opacity: 0.6 } : {}) }}
              onClick={tapMissYou}
              disabled={missTapping}
            >
              <span style={{ fontSize: '2rem' }}>💭</span>
              <span style={styles.loveBtnLabel}>Miss You</span>
            </motion.button>
          </div>
          {/* Miss you counter */}
          <div style={styles.missCounter}>
            <span style={styles.missItem}>💙 Kishan missed: {missCount.Kishan || 0}x</span>
            <span style={styles.missItem}>🌸 Aditi missed: {missCount.Aditi || 0}x</span>
          </div>
        </Card>
      )}

      {/* ─── Good Morning / Good Night (owners only) ─── */}
      {!isVisitor && (
        <Card>
          <CardTitle icon="☀️">Daily Greetings</CardTitle>
          <div style={styles.gmGrid}>
            <button
              style={{
                ...styles.gmBtn,
                ...(iHaveSentGM ? styles.gmBtnSent : {}),
              }}
              onClick={sendGoodMorning}
              disabled={sendingGM}
            >
              <span style={{ fontSize: '1.5rem' }}>☀️</span>
              <span style={styles.gmLabel}>
                {iHaveSentGM ? 'Sent! ✓' : 'Good Morning'}
              </span>
              {partnerSentGM && (
                <span style={styles.gmPartnerBadge}>
                  {who === 'Kishan' ? '🌸' : '💙'} received!
                </span>
              )}
            </button>
            <button
              style={{
                ...styles.gmBtn,
                ...(iHaveSentGN ? styles.gmBtnSent : {}),
              }}
              onClick={sendGoodNight}
              disabled={sendingGN}
            >
              <span style={{ fontSize: '1.5rem' }}>🌙</span>
              <span style={styles.gmLabel}>
                {iHaveSentGN ? 'Sent! ✓' : 'Good Night'}
              </span>
              {partnerSentGN && (
                <span style={styles.gmPartnerBadge}>
                  {who === 'Kishan' ? '🌸' : '💙'} received!
                </span>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* ─── Mood ─── */}
      {!isVisitor && (
        <Card>
          <CardTitle icon="🌸">How are you feeling, {who}?</CardTitle>
          <div style={styles.moodGrid}>
            {MOODS.map(m => (
              <button key={m} onClick={() => logMood(m)} disabled={loggingMood} style={styles.moodBtn}>
                {m}
              </button>
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

      {/* ─── Quick nav cards ─── */}
      {!isVisitor && (
        <div style={styles.quickNavGrid}>
          {[
            { icon: '💝', label: 'Love Jar', path: '/love-jar', bg: 'linear-gradient(135deg, #fde8ef, #f5dde0)' },
            { icon: '💬', label: 'Questions', path: '/questions', bg: 'linear-gradient(135deg, #e8effe, #dde8fe)' },
            { icon: '🎁', label: 'Wishlist', path: '/wishlist', bg: 'linear-gradient(135deg, #e8fde8, #d4f0d4)' },
          ].map(item => (
            <motion.div
              key={item.path}
              whileTap={{ scale: 0.95 }}
              style={{ ...styles.quickNavCard, background: item.bg }}
              onClick={() => navigate(item.path)}
            >
              <div style={{ fontSize: '1.8rem' }}>{item.icon}</div>
              <div style={styles.quickNavLabel}>{item.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Daily Quote ─── */}
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
    borderRadius: 24, padding: '28px 20px',
    textAlign: 'center', color: 'white',
    marginBottom: 14, position: 'relative', overflow: 'hidden',
  },
  heroDecor: { position: 'absolute', top: 12, right: 16, fontSize: '1.1rem', opacity: 0.2, letterSpacing: 8 },
  heroNames: { fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.5rem, 5vw, 1.9rem)', marginBottom: 4 },
  heroSince: { fontSize: '0.72rem', opacity: 0.75, letterSpacing: 2, textTransform: 'uppercase' },
  timerGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 18 },
  timerUnit: {
    background: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: '12px 6px',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  },
  timerNum: { fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 600, display: 'block' },
  timerLbl: { fontSize: '0.55rem', opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1 },

  milestoneBadge: {
    marginTop: 14,
    display: 'inline-block',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 30,
    padding: '8px 20px',
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: 0.5,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.4)',
  },
  nextMilestone: {
    marginTop: 12,
    fontSize: '0.72rem',
    opacity: 0.8,
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: '6px 14px',
    display: 'inline-block',
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 },
  statCard: {
    background: 'white', borderRadius: 16, padding: '14px 8px',
    textAlign: 'center', boxShadow: '0 3px 14px var(--shadow)',
    border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    transition: 'transform 0.2s',
  },
  statNum: { fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)', color: 'var(--mauve-deep)' },
  statLbl: { fontSize: '0.62rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1 },

  // Send Love
  sendLoveGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 },
  loveBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '14px 8px',
    background: 'var(--petal)', border: '2px solid var(--border)',
    borderRadius: 18, cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  loveBtnLabel: { fontSize: '0.72rem', fontWeight: 700, color: 'var(--mauve-deep)', textTransform: 'uppercase', letterSpacing: 0.5 },

  missCounter: { display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 4 },
  missItem: { fontSize: '0.78rem', color: 'var(--text-light)', background: 'var(--petal)', padding: '4px 12px', borderRadius: 20 },

  // Good Morning/Night
  gmGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  gmBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '16px 10px',
    background: 'var(--petal)', border: '2px solid var(--border)',
    borderRadius: 18, cursor: 'pointer',
    transition: 'all 0.25s',
    WebkitTapHighlightColor: 'transparent',
    position: 'relative',
  },
  gmBtnSent: {
    background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
    borderColor: 'transparent',
    color: 'white',
  },
  gmLabel: { fontSize: '0.8rem', fontWeight: 700, color: 'inherit' },
  gmPartnerBadge: {
    position: 'absolute', top: -6, right: -6,
    background: 'var(--rose-dark)', color: 'white',
    fontSize: '0.6rem', borderRadius: 20,
    padding: '2px 7px', fontWeight: 700,
  },

  // Mood
  moodGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, justifyContent: 'center' },
  moodBtn: {
    fontSize: '1.5rem', padding: '8px',
    border: '2px solid transparent', borderRadius: 14,
    background: 'var(--blush)', cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent', aspectRatio: '1',
  },
  todayMoods: { marginTop: 14, padding: '12px 14px', background: 'var(--petal)', borderRadius: 12 },
  todayMoodItem: {
    fontSize: '0.84rem', color: 'var(--mauve)',
    background: 'white', padding: '4px 10px',
    borderRadius: 20, border: '1px solid var(--border)',
  },

  // Quick nav
  quickNavGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 },
  quickNavCard: {
    borderRadius: 18, padding: '18px 10px',
    textAlign: 'center', cursor: 'pointer',
    boxShadow: '0 3px 14px var(--shadow)',
    border: '1px solid rgba(232,160,160,0.15)',
    transition: 'transform 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  quickNavLabel: { fontSize: '0.72rem', fontWeight: 700, color: 'var(--mauve-deep)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quote
  quote: {
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderLeft: '3px solid var(--rose-dark)',
    borderRadius: 14, padding: '16px 18px',
    fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
    fontSize: '0.92rem', color: 'var(--mauve-deep)', lineHeight: 1.7,
  },

  // Visitor
  visitorInfo: {
    fontSize: '0.82rem', color: 'var(--mauve)',
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderRadius: 14, padding: '14px 18px',
    textAlign: 'center', lineHeight: 1.6,
    border: '1px solid var(--border)', marginTop: 6,
  },
}
