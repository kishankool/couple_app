import React, { useState, useEffect, useContext } from 'react'
import Card, { CardTitle } from '../components/Card'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { ToastContext } from '../App'

const ANNIVERSARY = new Date('2025-04-21T00:00:00')

const DEFAULT_IDEAS = [
  { name: 'Candlelight dinner', desc: 'Cook a meal together at home', icon: '🕯️', tag: 'romantic' },
  { name: 'Sunset walk', desc: 'Catch the golden hour together', icon: '🌅', tag: 'outdoor' },
  { name: 'Movie marathon', desc: 'Pick a genre & make popcorn', icon: '🎬', tag: 'indoor' },
  { name: 'Road trip', desc: 'Drive somewhere new together', icon: '🚗', tag: 'adventure' },
  { name: 'Picnic in the park', desc: 'Pack snacks and enjoy nature', icon: '🧺', tag: 'outdoor' },
  { name: 'Cook a new recipe', desc: 'Try something neither of you has made', icon: '👨‍🍳', tag: 'foodie' },
]

function getCountdown(dateStr) {
  const target = new Date(dateStr)
  const diff = target - Date.now()
  if (diff < 0) return { text: 'Passed 💫', past: true }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return { text: `${days}d ${hours}h`, past: false }
  if (hours > 0) return { text: `${hours}h`, past: false }
  return { text: 'Today! 🎉', past: false }
}

export default function More() {
  const showToast = useContext(ToastContext)
  const [ideas, setIdeas] = useState([])
  const [events, setEvents] = useState([])
  const [moods, setMoods] = useState([])
  const [loading, setLoading] = useState(true)

  const [ideaOpen, setIdeaOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [, forceUpdate] = useState(0)

  // Idea form
  const [iName, setIName] = useState('')
  const [iDesc, setIDesc] = useState('')
  const [iIcon, setIIcon] = useState('')
  const [iTag, setITag] = useState('indoor')

  // Event form
  const [eName, setEName] = useState('')
  const [eDate, setEDate] = useState('')

  useEffect(() => {
    const u1 = fsListen('date_ideas', d => { setIdeas(d); setLoading(false) })
    const u2 = fsListen('events', d => setEvents(d), 'createdAt')
    const u3 = fsListen('moods', d => setMoods(d))
    return () => { u1(); u2(); u3() }
  }, [])

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const saveIdea = async () => {
    if (!iName.trim()) return showToast('Enter a date idea 🌹')
    try {
      await fsAdd('date_ideas', { name: iName.trim(), desc: iDesc.trim(), icon: iIcon || '🌸', tag: iTag })
      setIName(''); setIDesc(''); setIIcon(''); setIdeaOpen(false)
      showToast('Date idea saved! 🌹')
    } catch { showToast('Error saving') }
  }

  const saveEvent = async () => {
    if (!eName.trim() || !eDate) return showToast('Fill all fields 🎉')
    try {
      await fsAdd('events', { name: eName.trim(), date: eDate })
      setEName(''); setEDate(''); setEventOpen(false)
      showToast('Countdown added! 🎉')
    } catch { showToast('Error saving') }
  }

  // Relationship stats
  const diff = Date.now() - ANNIVERSARY.getTime()
  const totalDays = Math.floor(diff / 86400000)
  const weeks = Math.floor(totalDays / 7)
  const months = Math.floor(totalDays / 30.44)

  const allIdeas = [...DEFAULT_IDEAS, ...ideas]

  return (
    <div style={{ padding: '18px 16px' }} className="fade-up">

      {/* Date Ideas */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <CardTitle icon="🌹">Date Ideas</CardTitle>
          <Button size="sm" onClick={() => setIdeaOpen(true)}>+ Add</Button>
        </div>
        {allIdeas.map((d, i) => (
          <div key={i} style={styles.ideaRow}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{d.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={styles.ideaName}>{d.name}</div>
              {d.desc && <div style={styles.ideaDesc}>{d.desc}</div>}
            </div>
            <span style={styles.tag}>{d.tag}</span>
            {d.id && (
              <button style={styles.delBtn} onClick={() => fsDelete('date_ideas', d.id).then(() => showToast('Removed'))}>🗑</button>
            )}
          </div>
        ))}
      </Card>

      {/* Countdowns */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <CardTitle icon="🎉">Countdowns</CardTitle>
          <Button size="sm" onClick={() => setEventOpen(true)}>+ Add</Button>
        </div>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-light)', fontSize: '0.85rem' }}>No countdowns yet!</div>
        ) : events.map(e => {
          const cd = getCountdown(e.date)
          return (
            <div key={e.id} style={styles.eventCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={styles.eventName}>{e.name}</div>
                <button style={styles.delBtn} onClick={() => fsDelete('events', e.id).then(() => showToast('Removed'))}>🗑</button>
              </div>
              <div style={{ ...styles.eventCountdown, color: cd.past ? 'var(--text-light)' : 'var(--rose-dark)' }}>{cd.text}</div>
              <div style={styles.eventDate}>{new Date(e.date).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          )
        })}
      </Card>

      {/* Relationship Stats */}
      <Card>
        <CardTitle icon="📊">Relationship Stats</CardTitle>
        {[
          ['Days together', `${totalDays} days 💕`],
          ['Weeks together', `${weeks} weeks`],
          ['Months together', `${months} months`],
        ].map(([lbl, val]) => (
          <div key={lbl} style={styles.statRow}>
            <span style={styles.statLbl}>{lbl}</span>
            <span style={styles.statVal}>{val}</span>
          </div>
        ))}
      </Card>

      {/* Mood History */}
      <Card>
        <CardTitle icon="🌙">Mood History</CardTitle>
        {moods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-light)', fontSize: '0.85rem' }}>No moods logged yet!</div>
        ) : moods.slice(0, 30).map((m, i) => (
          <div key={i} style={styles.moodRow}>
            <span style={{ fontSize: '1.4rem' }}>{m.emoji}</span>
            <div>
              <div style={styles.moodWho}>{m.who}</div>
              <div style={styles.moodWhen}>{m.date ? new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Date Idea Modal */}
      <Modal open={ideaOpen} onClose={() => setIdeaOpen(false)} title="🌹 Add Date Idea">
        <input value={iName} onChange={e => setIName(e.target.value)} placeholder="Date idea name" style={{ marginBottom: 8 }} />
        <input value={iDesc} onChange={e => setIDesc(e.target.value)} placeholder="Short description" style={{ marginBottom: 8 }} />
        <input value={iIcon} onChange={e => setIIcon(e.target.value)} placeholder="Emoji icon (e.g. 🍕)" style={{ marginBottom: 8 }} />
        <select value={iTag} onChange={e => setITag(e.target.value)} style={{ marginBottom: 14 }}>
          <option value="indoor">Indoor 🏠</option>
          <option value="outdoor">Outdoor 🌿</option>
          <option value="foodie">Foodie 🍜</option>
          <option value="adventure">Adventure 🏕️</option>
          <option value="romantic">Romantic 🕯️</option>
        </select>
        <Button size="full" onClick={saveIdea}>Save Idea 🌸</Button>
      </Modal>

      {/* Event Modal */}
      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="🎉 Add Countdown">
        <input value={eName} onChange={e => setEName(e.target.value)} placeholder="Event name (e.g. Our Anniversary 🎉)" style={{ marginBottom: 8 }} />
        <input type="datetime-local" value={eDate} onChange={e => setEDate(e.target.value)} style={{ marginBottom: 14 }} />
        <Button size="full" onClick={saveEvent}>Add Countdown ✨</Button>
      </Modal>
    </div>
  )
}

const styles = {
  ideaRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  },
  ideaName: { fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' },
  ideaDesc: { fontSize: '0.74rem', color: 'var(--text-light)', marginTop: 2 },
  tag: {
    background: 'var(--blush)', color: 'var(--mauve-deep)',
    borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0,
  },
  delBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.95rem', flexShrink: 0 },
  eventCard: {
    background: 'linear-gradient(135deg, white, var(--petal))',
    borderRadius: 14, padding: 14, marginBottom: 10,
    boxShadow: '0 3px 10px var(--shadow)', border: '1px solid var(--border)',
  },
  eventName: { fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', color: 'var(--mauve-deep)', flex: 1 },
  eventCountdown: { fontSize: '1.5rem', fontWeight: 700, margin: '8px 0 4px' },
  eventDate: { fontSize: '0.72rem', color: 'var(--text-light)' },
  statRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  },
  statLbl: { fontSize: '0.85rem', color: 'var(--text-light)' },
  statVal: { fontFamily: "'Playfair Display', serif", fontSize: '0.98rem', color: 'var(--mauve-deep)', fontWeight: 700 },
  moodRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
  moodWho: { fontWeight: 700, fontSize: '0.85rem', color: 'var(--mauve-deep)' },
  moodWhen: { fontSize: '0.72rem', color: 'var(--text-light)' },
}
