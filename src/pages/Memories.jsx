import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImageCloudinary } from '../firebase'
import { ToastContext, RoleContext, WhoContext } from '../App'
import { notifyPartner } from '../push'

/* ─── Constants ─── */
const JOURNEY_KEY = 'ka_memory_journey_seen'
const EMOJIS_BY_MONTH = {
  '01': '❄️', '02': '💕', '03': '🌸', '04': '🌷',
  '05': '☀️', '06': '🌻', '07': '🌊', '08': '⭐',
  '09': '🍂', '10': '🎃', '11': '🍁', '12': '🎄',
}
const PATH_COLORS = [
  '#e8a0a0', '#b5c9b5', '#c9b5c9', '#b5bec9', '#c9c3b5', '#b5c9c0',
]

/* ─── Helpers ─── */
function formatDate(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return d }
}

function formatMonthYear(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
      month: 'long', year: 'numeric',
    })
  } catch { return d }
}

function getMonthEmoji(dateStr) {
  if (!dateStr) return '📸'
  const month = dateStr.substring(5, 7)
  return EMOJIS_BY_MONTH[month] || '📸'
}

function getDaysBetween(d1, d2) {
  try {
    const a = new Date(d1 + 'T12:00:00')
    const b = new Date(d2 + 'T12:00:00')
    return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24))
  } catch { return 0 }
}

/* ═══════════════════════════════════════════
   CURVED PATH SVG — snaking bezier between dots
   ═══════════════════════════════════════════ */
function CurvedPathSVG({ pathRef, dotRefs, count }) {
  const [pathD, setPathD] = useState('')
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const measure = () => {
      if (!pathRef.current || count < 2) return
      const cr = pathRef.current.getBoundingClientRect()
      const centerX = cr.width / 2
      const swing = Math.min(cr.width * 0.22, 70)

      const pts = dotRefs.current
        .slice(0, count)
        .map(el => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            x: r.left + r.width / 2 - cr.left,
            y: r.top + r.height / 2 - cr.top,
          }
        })
        .filter(Boolean)

      if (pts.length < 2) return

      let d = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const dir = i % 2 === 0 ? 1 : -1
        const cpX = centerX + swing * dir
        const dy = p2.y - p1.y
        d += ` C ${cpX} ${p1.y + dy * 0.38}, ${cpX} ${p2.y - dy * 0.38}, ${p2.x} ${p2.y}`
      }

      setPathD(d)
      setSize({ w: cr.width, h: cr.height })
    }

    measure()
    // Re-measure on resize only — not after animations to avoid bumps
    const ro = new ResizeObserver(measure)
    if (pathRef.current) ro.observe(pathRef.current)
    // Also re-measure after layout settles (cards animate over ~400ms)
    const timer = setTimeout(measure, 800)
    return () => { ro.disconnect(); clearTimeout(timer) }
  }, [pathRef, dotRefs, count])

  if (!pathD || size.h < 10) return null

  return (
    <svg
      className="tl-curved-svg"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      <defs>
        <linearGradient id="curvedPathGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8a0a0" stopOpacity="0.7" />
          <stop offset="25%" stopColor="#9b6b7b" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#b5c9b5" stopOpacity="0.55" />
          <stop offset="75%" stopColor="#d4a96a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c97a7a" stopOpacity="0.7" />
        </linearGradient>
        <filter id="pathGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Glow layer */}
      <path d={pathD} fill="none" stroke="rgba(232,160,160,0.15)" strokeWidth="10" strokeLinecap="round" />
      {/* Main path */}
      <path d={pathD} fill="none" stroke="url(#curvedPathGrad)" strokeWidth="3" strokeLinecap="round" />
      {/* Animated dashes overlay */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 14"
        className="tl-path-flow"
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   TIMELINE NODE — an interactive waypoint
   ═══════════════════════════════════════════ */
function TimelineNode({ memory: m, index, total, isActive, onActivate, onDelete, isLeft, dotRef, canEdit }) {
  const nodeRef = useRef(null)

  useEffect(() => {
    // Don't scrollIntoView — it causes the page to jump/bump
    // The active node is visible enough from the user's tap
  }, [isActive])

  const del = (e) => {
    e.stopPropagation()
    onDelete(m)
  }

  return (
    <div
      ref={nodeRef}
      className={`tl-node ${isActive ? 'tl-node-active' : ''} ${isLeft ? 'tl-left' : 'tl-right'}`}
      style={{ animationDelay: `${Math.min(index * 0.1, 1)}s` }}
    >
      {/* Date waypoint on the line */}
      <div className="tl-waypoint" onClick={() => onActivate(m.id)}>
        <div ref={dotRef} className={`tl-dot ${isActive ? 'tl-dot-active' : ''}`}>
          <span className="tl-dot-emoji">{getMonthEmoji(m.date)}</span>
        </div>
        <div className="tl-date-label">{m.date ? formatDate(m.date) : ''}</div>
      </div>

      {/* Connector arm */}
      <div className={`tl-arm ${isLeft ? 'tl-arm-left' : 'tl-arm-right'}`} />

      {/* Memory card */}
      <div
        className={`tl-card ${isActive ? 'tl-card-open' : 'tl-card-closed'}`}
        onClick={() => onActivate(m.id)}
      >
        {/* Compact preview (when closed) */}
        {!isActive && (
          <div className="tl-card-preview">
            {m.imgUrl && (
              <img src={m.imgUrl} alt={m.title} className="tl-card-thumb" loading="lazy" />
            )}
            <div className="tl-card-preview-text">
              <div className="tl-card-mini-title">{m.title}</div>
            </div>
          </div>
        )}

        {/* Expanded (when active) */}
        {isActive && (
          <div className="tl-card-expanded">
            {m.imgUrl ? (
              <img src={m.imgUrl} alt={m.title} className="tl-card-img" />
            ) : (
              <div className="tl-card-placeholder">📸</div>
            )}
            <div className="tl-card-body">
              <div className="tl-card-title">{m.title}</div>
              {m.caption && <div className="tl-card-caption">"{m.caption}"</div>}
              <div className="tl-card-date">{m.date ? formatDate(m.date) : ''}</div>
            </div>
            {canEdit && (
              <button type="button" className="tl-card-del" onClick={del} aria-label={`Delete: ${m.title}`}>
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   JOURNEY CONTROLS — auto-play overlay
   ═══════════════════════════════════════════ */
function JourneyControls({ current, total, isPlaying, onPlay, onPause, onPrev, onNext, onExit }) {
  return (
    <div className="journey-controls">
      <div className="journey-progress-bar">
        <div
          className="journey-progress-fill"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
      <div className="journey-controls-row">
        <button className="journey-btn" onClick={onExit}>✕</button>
        <button className="journey-btn" onClick={onPrev} disabled={current <= 0}>←</button>
        <button className="journey-btn journey-btn-play" onClick={isPlaying ? onPause : onPlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="journey-btn" onClick={onNext} disabled={current >= total - 1}>→</button>
        <span className="journey-counter">{current + 1} / {total}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function Memories() {
  const showToast = useContext(ToastContext)
  const { isVisitor } = useContext(RoleContext)
  const { who } = useContext(WhoContext)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null) // for view modal
  const [activeId, setActiveId] = useState(null)

  // Journey auto-play state
  const [isJourney, setIsJourney] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [journeyIndex, setJourneyIndex] = useState(0)
  const playTimer = useRef(null)
  const pathRef = useRef(null)
  const dotRefs = useRef([])

  // Form state
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  // Sort memories chronologically (oldest first for the timeline)
  const sorted = useMemo(() =>
    [...memories].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [memories]
  )

  useEffect(() => {
    const unsub = fsListen('memories', data => {
      setMemories(data)
      setLoading(false)
    })
    return unsub
  }, [])

  // First visit → start journey automatically
  useEffect(() => {
    if (!loading && sorted.length > 0 && !localStorage.getItem(JOURNEY_KEY)) {
      startJourney()
    }
  }, [loading, sorted.length])

  // Auto-play timer
  useEffect(() => {
    if (isPlaying && isJourney && sorted.length > 0) {
      playTimer.current = setTimeout(() => {
        if (journeyIndex < sorted.length - 1) {
          setJourneyIndex(i => i + 1)
        } else {
          setIsPlaying(false)
          localStorage.setItem(JOURNEY_KEY, '1')
        }
      }, 3500)
      return () => clearTimeout(playTimer.current)
    }
  }, [isPlaying, journeyIndex, isJourney, sorted.length])

  // Sync journey index with active node
  useEffect(() => {
    if (isJourney && sorted[journeyIndex]) {
      setActiveId(sorted[journeyIndex].id)
    }
  }, [journeyIndex, isJourney, sorted])

  const startJourney = useCallback(() => {
    setIsJourney(true)
    setJourneyIndex(0)
    setIsPlaying(true)
    if (sorted.length > 0) setActiveId(sorted[0].id)
  }, [sorted])

  const stopJourney = useCallback(() => {
    setIsJourney(false)
    setIsPlaying(false)
    localStorage.setItem(JOURNEY_KEY, '1')
  }, [])

  const handleActivate = useCallback((id) => {
    // If journey is playing, pause it when user taps a node
    if (isPlaying) setIsPlaying(false)
    setActiveId(prev => prev === id ? null : id)
    // Update journey index to match
    const idx = sorted.findIndex(m => m.id === id)
    if (idx >= 0) setJourneyIndex(idx)
  }, [isPlaying, sorted])

  const handleFile = (f) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const resetForm = () => {
    if (preview) URL.revokeObjectURL(preview)
    setTitle(''); setCaption(''); setDate('')
    setFile(null); setPreview(null)
  }

  const save = async () => {
    if (!title.trim()) return showToast('Add a title 🌸')
    setSaving(true)
    try {
      let imgUrl = null
      if (file) imgUrl = await uploadImageCloudinary(file)
      await fsAdd('memories', {
        title: title.trim(),
        caption: caption.trim(),
        date: date || new Date().toLocaleDateString('en-CA'),
        imgUrl,
      })
      resetForm()
      setOpen(false)
      showToast('Memory saved! 📸')
      notifyPartner(who, {
        title: '📸 New Memory Added!',
        body: `${who} added a new memory to your timeline — check it out!`,
        url: '/memories'
      })
    } catch (e) {
      console.error(e)
      showToast('Error saving memory')
    }
    setSaving(false)
  }

  const del = async (m) => {
    try {
      await fsDelete('memories', m.id)
      if (activeId === m.id) setActiveId(null)
      showToast('Memory deleted')
    } catch {
      showToast('Error deleting')
    }
  }

  // ─── Compute timeline stats ───
  const stats = useMemo(() => {
    if (sorted.length < 2) return null
    const days = getDaysBetween(sorted[0].date, sorted[sorted.length - 1].date)
    return { days, start: sorted[0].date, end: sorted[sorted.length - 1].date }
  }, [sorted])

  return (
    <div className="page-content">
      {/* Header */}
      <div className="tl-header">
        <div>
          <div className="tl-page-title">📍 Memory Timeline</div>
          <div className="tl-page-sub">
            {sorted.length} {sorted.length === 1 ? 'memory' : 'memories'}
            {stats && ` · ${stats.days} days of love`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {sorted.length > 1 && (
            <Button size="sm" variant="ghost" onClick={startJourney}>
              ▶ Journey
            </Button>
          )}
          {!isVisitor && (
            <Button size="sm" onClick={() => { resetForm(); setOpen(true) }}>+ Add</Button>
          )}
        </div>
      </div>

      {/* Timeline Map */}
      <div className="tl-map">
        {loading ? (
          <div className="loading">🌸</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📍</div>
            <p>No memories yet.<br />Start your journey!</p>
          </div>
        ) : (
          <>
            {/* Timeline start marker */}
            <div className="tl-start-marker">
              <div className="tl-start-flag">🏁</div>
              <div className="tl-start-label">Our story begins…</div>
              {sorted[0]?.date && (
                <div className="tl-start-date">{formatDate(sorted[0].date)}</div>
              )}
            </div>

            {/* The vertical path */}
            <div className="tl-path" ref={pathRef}>
              <CurvedPathSVG pathRef={pathRef} dotRefs={dotRefs} count={sorted.length} />
              {sorted.map((m, i) => {
                const isLeft = i % 2 === 0
                // Day gap indicator between memories
                const gap = i > 0 ? getDaysBetween(sorted[i - 1].date, m.date) : 0
                return (
                  <React.Fragment key={m.id}>
                    {/* Day gap badge */}
                    {gap > 0 && (
                      <div className="tl-gap-badge">
                        <span className="tl-gap-line" />
                        <span className="tl-gap-text">
                          {gap === 1 ? 'next day' : `${gap} days later`}
                        </span>
                        <span className="tl-gap-line" />
                      </div>
                    )}

                    <TimelineNode
                      memory={m}
                      index={i}
                      total={sorted.length}
                      isActive={activeId === m.id}
                      onActivate={handleActivate}
                      onDelete={del}
                      isLeft={isLeft}
                      dotRef={el => { dotRefs.current[i] = el }}
                      canEdit={!isVisitor}
                    />
                  </React.Fragment>
                )
              })}
            </div>

            {/* Timeline end marker */}
            <div className="tl-end-marker">
              <div className="tl-end-heart">💕</div>
              <div className="tl-end-label">
                {stats ? `${stats.days} days & counting…` : 'To be continued…'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Journey auto-play controls */}
      {isJourney && sorted.length > 0 && (
        <JourneyControls
          current={journeyIndex}
          total={sorted.length}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onPrev={() => { setIsPlaying(false); setJourneyIndex(i => Math.max(0, i - 1)) }}
          onNext={() => { setIsPlaying(false); setJourneyIndex(i => Math.min(sorted.length - 1, i + 1)) }}
          onExit={stopJourney}
        />
      )}

      {/* Add Memory Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="📸 Add a Memory">
        <ImageUpload onFile={handleFile} preview={preview} label="Tap to upload your photo" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Memory title (e.g. First date 💕)" style={{ marginBottom: 10 }} />
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption / note (optional)" style={{ marginBottom: 10 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 16 }} />
        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Saving memory… 📸' : 'Save Memory 🌸'}
        </Button>
      </Modal>
    </div>
  )
}
