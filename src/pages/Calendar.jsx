import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { WhoContext, ToastContext, RoleContext } from '../App'
import { notifyPartner } from '../push'

const EVENT_CATEGORIES = [
  { key: 'date', label: 'Date Night', icon: '🌹', color: '#fde8ef', text: '#a04060' },
  { key: 'reminder', label: 'Reminder', icon: '⏰', color: '#fef9e7', text: '#b7770d' },
  { key: 'special', label: 'Special Day', icon: '🎉', color: '#e8f8f5', text: '#1a7a5e' },
  { key: 'travel', label: 'Travel / Trip', icon: '✈️', color: '#eaf4fe', text: '#1565c0' },
  { key: 'anniversary', label: 'Anniversary', icon: '💍', color: '#f3e8fd', text: '#6a1b9a' },
]

const CAT_MAP = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.key, c]))

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay()
}
function toDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

export default function Calendar() {
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const { isVisitor } = useContext(RoleContext)

  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [events, setEvents]       = useState([])
  const [selectedDay, setSelectedDay] = useState(null)   // dateKey string
  const [addOpen, setAddOpen]     = useState(false)
  const [dayOpen, setDayOpen]     = useState(false)

  // Form state
  const [fTitle, setFTitle] = useState('')
  const [fDate,  setFDate]  = useState('')
  const [fTime,  setFTime]  = useState('12:00')
  const [fCat,   setFCat]   = useState('date')
  const [fNote,  setFNote]  = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = fsListen('cal_events', setEvents, 'date')
    return unsub
  }, [])

  // Group events by date key YYYY-MM-DD
  const byDate = {}
  events.forEach(e => {
    if (!e.date) return
    const key = e.date.slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  })

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay    = getFirstDay(viewYear, viewMonth)
  const todayKey    = toDateKey(now.getFullYear(), now.getMonth(), now.getDate())

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const openDay = (key) => {
    setSelectedDay(key)
    setDayOpen(true)
  }

  const openAdd = (dateKey) => {
    if (isVisitor) return showToast('Only Kishan & Aditi can add events 🔒')
    const d = dateKey || toDateKey(viewYear, viewMonth, now.getDate())
    setFDate(d)
    setFTitle(''); setFTime('12:00'); setFCat('date'); setFNote('')
    setAddOpen(true)
  }

  const save = async () => {
    if (!fTitle.trim()) return showToast('Enter an event title 🌹')
    if (!fDate) return showToast('Pick a date 📅')
    setSaving(true)
    try {
      await fsAdd('cal_events', {
        title: fTitle.trim(),
        date:  `${fDate}T${fTime || '12:00'}:00`,
        cat:   fCat,
        note:  fNote.trim(),
        who,
      })
      notifyPartner(who, {
        title: `📅 ${who} added an event!`,
        body: fTitle.trim(),
        url: '/calendar'
      }).catch(() => {})
      showToast('Event added! 📅')
      setAddOpen(false)
    } catch { showToast('Error saving event') }
    setSaving(false)
  }

  const del = async (id) => {
    try { await fsDelete('cal_events', id); showToast('Removed') }
    catch { showToast('Error') }
  }

  const dayEvents = selectedDay ? (byDate[selectedDay] || []) : []
  const upcoming = [...events]
    .filter(e => e.date && new Date(e.date) >= now)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  return (
    <div className="page-content">
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.pageTitle}>📅 Calendar</div>
          <div style={S.pageSub}>Your shared couple planner</div>
        </div>
        {!isVisitor && (
          <Button size="sm" onClick={() => openAdd()}>+ Event</Button>
        )}
      </div>

      {/* Month Navigator */}
      <div style={S.monthNav}>
        <button style={S.navBtn} onClick={prevMonth}>‹</button>
        <span style={S.monthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
        <button style={S.navBtn} onClick={nextMonth}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={S.dayHeaders}>
        {DAYS.map(d => <div key={d} style={S.dayHeader}>{d}</div>)}
      </div>

      {/* Calendar Grid */}
      <div style={S.grid}>
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} style={S.emptyCell} />
        ))}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day    = i + 1
          const key    = toDateKey(viewYear, viewMonth, day)
          const evs    = byDate[key] || []
          const isToday = key === todayKey
          const hasDot  = evs.length > 0
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.9 }}
              style={{
                ...S.dayCell,
                ...(isToday ? S.dayCellToday : {}),
              }}
              onClick={() => evs.length > 0 ? openDay(key) : openAdd(key)}
            >
              <span style={{ ...S.dayNum, ...(isToday ? { color: 'white', fontWeight: 800 } : {}) }}>
                {day}
              </span>
              {hasDot && (
                <div style={S.dotRow}>
                  {evs.slice(0,3).map((e, ei) => {
                    const cat = CAT_MAP[e.cat] || CAT_MAP.date
                    return (
                      <span key={ei} style={{ ...S.dot, background: cat.text }} title={e.title} />
                    )
                  })}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={S.sectionHead}>⏳ Upcoming</div>
          {upcoming.map((e, i) => {
            const cat = CAT_MAP[e.cat] || CAT_MAP.date
            const d   = new Date(e.date)
            const diff = Math.ceil((d - now) / 86400000)
            const diffLabel = diff === 0 ? 'Today!' : diff === 1 ? 'Tomorrow' : `In ${diff} days`
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ ...S.eventRow, background: cat.color, borderLeft: `4px solid ${cat.text}` }}
              >
                <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...S.eventTitle, color: cat.text }}>{e.title}</div>
                  <div style={S.eventMeta}>
                    {d.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    {' · '}
                    {d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                    {' · '}
                    <span style={{ fontWeight: 700, color: cat.text }}>{diffLabel}</span>
                  </div>
                  {e.note && <div style={S.eventNote}>"{e.note}"</div>}
                </div>
                {!isVisitor && (
                  <button style={S.delBtn} onClick={() => del(e.id)}>🗑</button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {events.length === 0 && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <div className="empty-icon">📅</div>
          <p>No events yet!<br />Tap any day to plan something together 🌹</p>
        </div>
      )}

      {/* Day Detail Modal */}
      <Modal open={dayOpen} onClose={() => setDayOpen(false)} title={`📅 ${selectedDay ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' }) : ''}`}>
        {dayEvents.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--text-light)', padding:'12px 0' }}>No events this day.</div>
        ) : dayEvents.map(e => {
          const cat = CAT_MAP[e.cat] || CAT_MAP.date
          return (
            <div key={e.id} style={{ ...S.eventRow, background: cat.color, borderLeft: `4px solid ${cat.text}`, marginBottom: 10 }}>
              <span style={{ fontSize: '1.3rem'}}>{cat.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...S.eventTitle, color: cat.text }}>{e.title}</div>
                {e.note && <div style={S.eventNote}>"{e.note}"</div>}
                <div style={S.eventMeta}>
                  Added by {e.who === 'Kishan' ? '💙 Kishan' : '🌸 Aditi'}
                </div>
              </div>
              {!isVisitor && (
                <button style={S.delBtn} onClick={() => { del(e.id); if(dayEvents.length <= 1) setDayOpen(false) }}>🗑</button>
              )}
            </div>
          )
        })}
        {!isVisitor && (
          <Button size="full" onClick={() => { setDayOpen(false); openAdd(selectedDay) }}>+ Add Event This Day</Button>
        )}
      </Modal>

      {/* Add Event Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="📅 Add an Event">
        <div className="section-label">Event Title</div>
        <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="e.g. Movie night at home 🎬" style={{ marginBottom: 12 }} />

        <div style={{ display:'flex', gap:10, marginBottom: 12 }}>
          <div style={{ flex: 2 }}>
            <div className="section-label">Date</div>
            <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="section-label">Time</div>
            <input type="time" value={fTime} onChange={e => setFTime(e.target.value)} />
          </div>
        </div>

        <div className="section-label">Category</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap: 8, marginBottom: 12 }}>
          {EVENT_CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setFCat(c.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize:'0.78rem', fontWeight: 700,
                background: fCat === c.key ? c.text : c.color,
                color: fCat === c.key ? 'white' : c.text,
                border: `2px solid ${c.text}`, cursor: 'pointer',
                transition: 'all 0.2s',
                WebkitTapHighlightColor:'transparent',
              }}
            >{c.icon} {c.label}</button>
          ))}
        </div>

        <div className="section-label">Note (optional)</div>
        <textarea value={fNote} onChange={e => setFNote(e.target.value)} placeholder="Any extra details…" style={{ marginBottom: 14, minHeight: 60 }} />

        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Add Event 📅'}
        </Button>
      </Modal>
    </div>
  )
}

const S = {
  header:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 },
  pageTitle:   { fontFamily:"'Playfair Display', serif", fontSize:'1.1rem', color:'var(--mauve-deep)' },
  pageSub:     { fontSize:'0.75rem', color:'var(--text-light)', marginTop: 2 },
  monthNav:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 },
  navBtn:      {
    background:'var(--petal)', border:'1px solid var(--border)', borderRadius: 10,
    padding:'6px 14px', fontSize:'1.2rem', fontWeight:700, cursor:'pointer',
    color:'var(--mauve-deep)', WebkitTapHighlightColor:'transparent',
  },
  monthLabel:  { fontFamily:"'Playfair Display', serif", fontSize:'1rem', color:'var(--mauve-deep)', fontWeight:700 },
  dayHeaders:  { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', marginBottom: 4 },
  dayHeader:   { textAlign:'center', fontSize:'0.62rem', color:'var(--text-light)', textTransform:'uppercase', letterSpacing: 1, padding:'4px 0' },
  grid:        { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 3 },
  emptyCell:   { aspectRatio:'1' },
  dayCell:     {
    aspectRatio:'1', borderRadius: 10, display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', gap: 2, cursor:'pointer',
    background:'white', border:'1px solid var(--border)',
    transition:'all 0.2s', WebkitTapHighlightColor:'transparent', padding: 2,
  },
  dayCellToday: {
    background:'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
    borderColor:'transparent',
    boxShadow:'0 3px 10px rgba(107,63,82,0.35)',
  },
  dayNum:      { fontSize:'0.75rem', fontWeight:600, color:'var(--mauve-deep)', lineHeight:1 },
  dotRow:      { display:'flex', gap: 2, justifyContent:'center' },
  dot:         { width: 5, height: 5, borderRadius:'50%' },
  sectionHead: { fontFamily:"'Playfair Display', serif", fontSize:'0.88rem', color:'var(--mauve-deep)', fontWeight:700, marginBottom: 10 },
  eventRow:    {
    display:'flex', alignItems:'flex-start', gap: 12, padding:'12px 14px',
    borderRadius: 14, marginBottom: 8, position:'relative',
  },
  eventTitle:  { fontSize:'0.9rem', fontWeight:700, lineHeight:1.3 },
  eventMeta:   { fontSize:'0.7rem', color:'var(--text-light)', marginTop: 3 },
  eventNote:   { fontSize:'0.78rem', fontStyle:'italic', color:'var(--mauve)', marginTop: 3 },
  delBtn:      {
    background:'none', border:'none', color:'#bbb', cursor:'pointer',
    fontSize:'0.9rem', flexShrink:0, WebkitTapHighlightColor:'transparent',
  },
}
