import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImageCloudinary } from '../firebase'
import { ToastContext } from '../App'

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
   TIMELINE NODE — an interactive waypoint
   ═══════════════════════════════════════════ */
function TimelineNode({ memory: m, index, total, isActive, onActivate, onDelete, isLeft }) {
  const nodeRef = useRef(null)

  useEffect(() => {
    if (isActive && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
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
        <div className={`tl-dot ${isActive ? 'tl-dot-active' : ''}`}>
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
            <button type="button" className="tl-card-del" onClick={del} aria-label={`Delete: ${m.title}`}>
              ✕
            </button>
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
          <Button size="sm" onClick={() => { resetForm(); setOpen(true) }}>+ Add</Button>
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
            <div className="tl-path">
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
