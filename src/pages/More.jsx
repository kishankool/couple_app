import React, { useState, useEffect, useContext } from 'react'
import Card, { CardTitle } from '../components/Card'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { ToastContext } from '../App'

const ANNIVERSARY = new Date('2025-04-21T00:00:00')

const DEFAULT_IDEAS = [
  { name: 'Candlelight dinner at home', desc: 'Cook together by candlelight', icon: '🕯️', tag: 'romantic', isDefault: true },
  { name: 'Sunset walk', desc: 'Catch the golden hour together', icon: '🌅', tag: 'outdoor', isDefault: true },
  { name: 'Movie marathon night', desc: 'Pick a genre & make popcorn', icon: '🎬', tag: 'indoor', isDefault: true },
  { name: 'Surprise road trip', desc: 'Drive somewhere new together', icon: '🚗', tag: 'adventure', isDefault: true },
  { name: 'Picnic in the park', desc: 'Pack snacks & enjoy nature', icon: '🧺', tag: 'outdoor', isDefault: true },
  { name: 'Cook a new recipe together', desc: "Try something neither has made", icon: '👨‍🍳', tag: 'foodie', isDefault: true },
]

const TAG_COLORS = {
  romantic: { bg: '#fde8ef', color: '#a04060' },
  outdoor: { bg: '#e8f5e9', color: '#2e7d32' },
  indoor: { bg: '#e3f2fd', color: '#1565c0' },
  adventure: { bg: '#fff3e0', color: '#e65100' },
  foodie: { bg: '#fce4ec', color: '#880e4f' },
}

function liveCountdown(dateStr) {
  const diff = new Date(dateStr) - Date.now()
  if (diff < 0) return { text: 'Already happened 💫', past: true }
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  let text = ''
  if (d > 0) text = `${d} day${d !== 1 ? 's' : ''}`
  else if (h > 0) text = `${h} hr${h !== 1 ? 's' : ''} ${m} min`
  else if (m > 0) text = `${m} min`
  else text = 'Any moment now! 🎉'
  return { text, past: false }
}

// Live ticking relationship stats
function RelStats() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = Date.now() - ANNIVERSARY.getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30.44)
  const years = (diff / (365.25 * 24 * 3600000)).toFixed(2)

  const rows = [
    ['Years together', `${years} yrs 🥂`],
    ['Months together', `${months} months`],
    ['Weeks together', `${weeks} weeks`],
    ['Days together', `${days} days 💕`],
    ['Hours together', `${hours.toLocaleString()} hrs`],
    ['Minutes together', `${mins.toLocaleString()} mins`],
    ['Seconds together', `${secs.toLocaleString()} secs ✨`],
  ]

  return (
    <Card>
      <CardTitle icon="📊">Relationship Stats</CardTitle>
      {rows.map(([lbl, val]) => (
        <div key={lbl} style={S.statRow}>
          <span style={S.statLbl}>{lbl}</span>
          <span style={S.statVal}>{val}</span>
        </div>
      ))}
    </Card>
  )
}

export default function More() {
  const showToast = useContext(ToastContext)

  const [ideas, setIdeas] = useState([])
  const [events, setEvents] = useState([])
  const [moods, setMoods] = useState([])

  // Modal open state
  const [ideaOpen, setIdeaOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)

  // Date idea form
  const [iName, setIName] = useState('')
  const [iDesc, setIDesc] = useState('')
  const [iIcon, setIIcon] = useState('')
  const [iTag, setITag] = useState('romantic')
  const [iSaving, setISaving] = useState(false)

  // Event / countdown form — now uses native date + time pickers
  const [eName, setEName] = useState('')
  const [eDate, setEDate] = useState('')      // "2026-04-21"
  const [eTime, setETime] = useState('12:00') // "14:30"
  const [eSaving, setESaving] = useState(false)

  // ── Firestore listeners ───────────────────────────────────────────────────
  // NOTE: we use try/catch wrappers around listeners to avoid crashes if
  // Firestore index isn't ready yet. Events are sorted client-side.
  useEffect(() => {
    let u1, u2, u3
    try { u1 = fsListen('date_ideas', d => setIdeas(d)) } catch { }
    try { u2 = fsListen('events', d => setEvents(d)) } catch { }
    try { u3 = fsListen('moods', d => setMoods(d)) } catch { }
    return () => {
      try { u1 && u1() } catch { }
      try { u2 && u2() } catch { }
      try { u3 && u3() } catch { }
    }
  }, [])

  // ── Save date idea ────────────────────────────────────────────────────────
  const saveIdea = async () => {
    if (!iName.trim()) return showToast('Enter a date idea name 🌹')
    setISaving(true)
    try {
      await fsAdd('date_ideas', {
        name: iName.trim(),
        desc: iDesc.trim(),
        icon: iIcon.trim() || '🌸',
        tag: iTag,
      })
      setIName(''); setIDesc(''); setIIcon(''); setITag('romantic')
      setIdeaOpen(false)
      showToast('Date idea added! 🌹')
    } catch (e) {
      console.error(e)
      showToast('Error saving idea')
    }
    setISaving(false)
  }

  // ── Save countdown event ──────────────────────────────────────────────────
  const saveEvent = async () => {
    if (!eName.trim()) return showToast('Enter an event name 🎉')
    if (!eDate) return showToast('Pick a date 📅')
    const d = new Date(`${eDate}T${eTime || '12:00'}`)
    if (isNaN(d.getTime())) return showToast('Invalid date — try again')
    setESaving(true)
    try {
      await fsAdd('events', { name: eName.trim(), date: d.toISOString() })
      setEName(''); setEDate(''); setETime('12:00')
      setEventOpen(false)
      showToast('Countdown added! 🎉')
    } catch (e) {
      console.error(e)
      showToast('Error saving event')
    }
    setESaving(false)
  }

  // Sort events client-side: soonest upcoming first, past at bottom
  const sortedEvents = [...events].sort((a, b) => {
    const da = new Date(a.date) - Date.now()
    const db = new Date(b.date) - Date.now()
    return (da < 0 ? Infinity : da) - (db < 0 ? Infinity : db)
  })

  const allIdeas = [...DEFAULT_IDEAS, ...ideas]

  // Preview label for the event form
  const eventPreview = eDate
    ? new Date(`${eDate}T${eTime || '12:00'}`).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'long',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    : null

  return (
    <div style={{ padding: '18px 16px' }}>

      {/* ── Date Ideas ────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <CardTitle icon="🌹">Date Ideas</CardTitle>
          <Button size="sm" onClick={() => setIdeaOpen(true)}>+ Add idea</Button>
        </div>

        {allIdeas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-light)', fontSize: '0.85rem' }}>
            No ideas yet!
          </div>
        ) : allIdeas.map((d, i) => {
          const tc = TAG_COLORS[d.tag] || TAG_COLORS.romantic
          return (
            <div key={i} style={S.ideaRow}>
              <span style={S.ideaIcon}>{d.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.ideaName}>{d.name}</div>
                {d.desc && <div style={S.ideaDesc}>{d.desc}</div>}
              </div>
              <span style={{ ...S.tag, background: tc.bg, color: tc.color }}>{d.tag}</span>
              {!d.isDefault && d.id && (
                <button
                  style={S.delBtn}
                  onClick={() => fsDelete('date_ideas', d.id).then(() => showToast('Removed 🌹')).catch(() => showToast('Error'))}
                >🗑</button>
              )}
            </div>
          )
        })}
      </Card>

      {/* ── Countdowns ────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <CardTitle icon="🎉">Countdowns</CardTitle>
          <Button size="sm" onClick={() => setEventOpen(true)}>+ Add event</Button>
        </div>

        {sortedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-light)', fontSize: '0.85rem' }}>
            No countdowns yet! Add your next special event 🎉
          </div>
        ) : sortedEvents.map(e => {
          const cd = liveCountdown(e.date)
          return (
            <div key={e.id} style={{ ...S.eventCard, opacity: cd.past ? 0.55 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={S.eventName}>{e.name}</div>
                <button
                  style={S.delBtn}
                  onClick={() => fsDelete('events', e.id).then(() => showToast('Removed')).catch(() => showToast('Error'))}
                >🗑</button>
              </div>
              <div style={{ ...S.eventCountdown, color: cd.past ? 'var(--text-light)' : 'var(--rose-dark)' }}>
                {cd.past ? cd.text : `In ${cd.text} ⏳`}
              </div>
              <div style={S.eventDate}>
                {new Date(e.date).toLocaleString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          )
        })}
      </Card>

      {/* ── Relationship Stats ─────────────────────────── */}
      <RelStats />

      {/* ── Mood History ──────────────────────────────── */}
      <Card>
        <CardTitle icon="🌙">Mood History</CardTitle>
        {moods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 10, color: 'var(--text-light)', fontSize: '0.85rem' }}>
            No moods logged yet!
          </div>
        ) : moods.slice(0, 30).map((m, i) => (
          <div key={i} style={S.moodRow}>
            <span style={{ fontSize: '1.4rem' }}>{m.emoji}</span>
            <div>
              <div style={S.moodWho}>{m.who}</div>
              <div style={S.moodWhen}>
                {m.date
                  ? new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : ''}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* ── Add Date Idea Modal ────────────────────────── */}
      <Modal open={ideaOpen} onClose={() => setIdeaOpen(false)} title="🌹 Add a Date Idea">
        <div className="section-label">What's the idea?</div>
        <input
          value={iName}
          onChange={e => setIName(e.target.value)}
          placeholder="e.g. Rooftop stargazing 🌟"
          style={{ marginBottom: 10 }}
        />

        <div className="section-label">Short description (optional)</div>
        <input
          value={iDesc}
          onChange={e => setIDesc(e.target.value)}
          placeholder="e.g. Lie on a blanket and count stars"
          style={{ marginBottom: 10 }}
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="section-label">Emoji</div>
            <input
              value={iIcon}
              onChange={e => setIIcon(e.target.value)}
              placeholder="🌸"
              style={{ textAlign: 'center', fontSize: '1.4rem' }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <div className="section-label">Category</div>
            <select value={iTag} onChange={e => setITag(e.target.value)}>
              <option value="romantic">Romantic 🕯️</option>
              <option value="outdoor">Outdoor 🌿</option>
              <option value="indoor">Indoor 🏠</option>
              <option value="adventure">Adventure 🏕️</option>
              <option value="foodie">Foodie 🍜</option>
            </select>
          </div>
        </div>

        <Button size="full" onClick={saveIdea} disabled={iSaving}>
          {iSaving ? 'Saving…' : 'Add Date Idea 🌹'}
        </Button>
      </Modal>

      {/* ── Add Countdown Modal ────────────────────────── */}
      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="🎉 Add a Countdown">
        <div className="section-label">Event name</div>
        <input
          value={eName}
          onChange={e => setEName(e.target.value)}
          placeholder="e.g. Our 1 Year Anniversary 🥂"
          style={{ marginBottom: 14 }}
        />

        <div className="section-label">Date</div>
        <input
          type="date"
          value={eDate}
          onChange={e => setEDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          style={{ marginBottom: 10 }}
        />

        <div className="section-label">Time (optional)</div>
        <input
          type="time"
          value={eTime}
          onChange={e => setETime(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        {eventPreview && (
          <div style={{
            background: 'var(--petal)', borderRadius: 10,
            padding: '10px 14px', marginBottom: 14,
            fontSize: '0.82rem', color: 'var(--mauve)', textAlign: 'center',
          }}>
            📅 {eventPreview}
          </div>
        )}

        <Button size="full" onClick={saveEvent} disabled={eSaving}>
          {eSaving ? 'Saving…' : 'Add Countdown 🎉'}
        </Button>
      </Modal>

    </div>
  )
}

const S = {
  ideaRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 0', borderBottom: '1px solid var(--border)',
  },
  ideaIcon: { fontSize: '1.5rem', flexShrink: 0, width: 32, textAlign: 'center' },
  ideaName: { fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 },
  ideaDesc: { fontSize: '0.74rem', color: 'var(--text-light)', marginTop: 2 },
  tag: {
    borderRadius: 20, padding: '3px 9px',
    fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
  },
  delBtn: {
    background: 'none', border: 'none',
    color: '#ccc', cursor: 'pointer', fontSize: '0.95rem', flexShrink: 0,
  },
  eventCard: {
    background: 'linear-gradient(135deg, #ffffff, var(--petal))',
    borderRadius: 14, padding: '14px 14px 12px', marginBottom: 10,
    boxShadow: '0 3px 10px var(--shadow)', border: '1px solid var(--border)',
  },
  eventName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.95rem', color: 'var(--mauve-deep)', flex: 1, lineHeight: 1.3,
  },
  eventCountdown: {
    fontSize: '1.4rem', fontWeight: 700,
    fontFamily: "'Playfair Display', serif",
    margin: '8px 0 4px',
  },
  eventDate: { fontSize: '0.72rem', color: 'var(--text-light)' },
  statRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 0', borderBottom: '1px solid var(--border)',
  },
  statLbl: { fontSize: '0.84rem', color: 'var(--text-light)' },
  statVal: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.95rem', color: 'var(--mauve-deep)', fontWeight: 700,
  },
  moodRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 0', borderBottom: '1px solid var(--border)',
  },
  moodWho: { fontWeight: 700, fontSize: '0.85rem', color: 'var(--mauve-deep)' },
  moodWhen: { fontSize: '0.72rem', color: 'var(--text-light)' },
}
