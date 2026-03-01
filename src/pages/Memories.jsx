import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImageCloudinary } from '../firebase'
import { ToastContext } from '../App'

/* ─── Constants ─── */
const JOURNEY_KEY = 'ka_memory_journey_seen'
const TAPE_COLORS = [
  'rgba(232,160,160,0.55)', 'rgba(181,201,181,0.55)', 'rgba(212,169,106,0.45)',
  'rgba(155,107,123,0.45)', 'rgba(200,180,220,0.45)', 'rgba(180,200,230,0.45)',
]
const STICKERS = ['🌸', '💕', '✨', '🦋', '🌷', '💫', '🌺', '💗', '🌹', '🎀', '🍃', '💞']
const TAPE_ANGLES = [-8, -3, 5, -6, 2, 7, -4, 3]

/* ─── Helpers ─── */
function formatDate(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

function formatMonthYear(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  } catch { return d }
}

function groupByMonth(memories) {
  const sorted = [...memories].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const groups = []
  let currentKey = ''
  for (const m of sorted) {
    const key = m.date ? m.date.substring(0, 7) : 'unknown'
    if (key !== currentKey) {
      currentKey = key
      groups.push({ key, label: m.date ? formatMonthYear(m.date) : 'Undated', items: [] })
    }
    groups[groups.length - 1].items.push(m)
  }
  return groups
}

/* ─── Scrapbook decorations (deterministic per memory) ─── */
function getDecorations(id, index) {
  const hash = id ? id.charCodeAt(0) + id.charCodeAt(id.length - 1) : index
  return {
    tapeColor: TAPE_COLORS[hash % TAPE_COLORS.length],
    tapeAngle: TAPE_ANGLES[hash % TAPE_ANGLES.length],
    sticker: STICKERS[hash % STICKERS.length],
    stickerPos: hash % 4, // 0=topLeft 1=topRight 2=bottomLeft 3=bottomRight
    rotate: ((hash % 7) - 3) * 1.2,
    tapeStyle: hash % 3, // 0=top 1=corner 2=double
  }
}

/* ═══════════════════════════════════════════
   MEMORY JOURNEY — full-screen walkthrough
   ═══════════════════════════════════════════ */
function MemoryJourney({ memories, onFinish }) {
  const [current, setCurrent] = useState(-1) // -1 = intro
  const [fade, setFade] = useState('in')
  const timerRef = useRef(null)
  const sorted = useMemo(() =>
    [...memories].sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [memories]
  )

  const goNext = useCallback(() => {
    if (current >= sorted.length - 1) {
      onFinish()
      return
    }
    setFade('out')
    setTimeout(() => {
      setCurrent(c => c + 1)
      setFade('in')
    }, 500)
  }, [current, sorted.length, onFinish])

  const goPrev = useCallback(() => {
    if (current <= -1) return
    setFade('out')
    setTimeout(() => {
      setCurrent(c => c - 1)
      setFade('in')
    }, 500)
  }, [current])

  // Auto-advance intro after 3s
  useEffect(() => {
    if (current === -1) {
      timerRef.current = setTimeout(goNext, 3500)
      return () => clearTimeout(timerRef.current)
    }
  }, [current, goNext])

  const m = current >= 0 ? sorted[current] : null
  const progress = (current + 1) / sorted.length

  return (
    <div style={jStyles.container} className="memory-journey">
      {/* Background image with blur */}
      {m?.imgUrl && (
        <div
          key={`bg-${current}`}
          style={{ ...jStyles.bgImage, backgroundImage: `url(${m.imgUrl})` }}
          className={`journey-bg journey-fade-${fade}`}
        />
      )}
      <div style={jStyles.overlay} />

      {/* Skip button */}
      <button style={jStyles.skipBtn} onClick={onFinish}>
        Skip →
      </button>

      {/* Content */}
      <div style={jStyles.content} className={`journey-fade-${fade}`}>
        {current === -1 ? (
          // Intro screen
          <div style={jStyles.introWrap}>
            <div style={jStyles.introEmoji}>📖</div>
            <div style={jStyles.introTitle}>Our Memory Journey</div>
            <div style={jStyles.introSub}>
              Let's walk through our beautiful moments together…
            </div>
            <div style={jStyles.introHint}>✨ Tap to begin ✨</div>
          </div>
        ) : m ? (
          // Memory slide
          <div style={jStyles.slideWrap}>
            <div style={jStyles.polaroidFrame}>
              {m.imgUrl ? (
                <img src={m.imgUrl} alt={m.title} style={jStyles.slideImg} />
              ) : (
                <div style={jStyles.slidePlaceholder}>📸</div>
              )}
              {/* Tape decoration */}
              <div style={jStyles.tapeTop} />
            </div>
            <div style={jStyles.slideInfo}>
              <div style={jStyles.slideTitle}>{m.title}</div>
              {m.caption && <div style={jStyles.slideCaption}>"{m.caption}"</div>}
              <div style={jStyles.slideDate}>{m.date ? formatDate(m.date) : ''}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <div style={jStyles.navBar}>
        {/* Progress dots */}
        <div style={jStyles.progressBar}>
          <div style={{ ...jStyles.progressFill, width: `${Math.max(progress * 100, 3)}%` }} />
        </div>
        <div style={jStyles.navRow}>
          <button
            style={{ ...jStyles.navBtn, opacity: current <= -1 ? 0.3 : 1 }}
            onClick={goPrev}
            disabled={current <= -1}
          >
            ← Back
          </button>
          <span style={jStyles.counter}>
            {current >= 0 ? `${current + 1} / ${sorted.length}` : `${sorted.length} memories`}
          </span>
          <button style={jStyles.navBtn} onClick={goNext}>
            {current >= sorted.length - 1 ? 'Done 💕' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Touch areas for swiping */}
      <div style={jStyles.touchLeft} onClick={goPrev} />
      <div style={jStyles.touchRight} onClick={goNext} />
    </div>
  )
}

/* ═══════════════════════════════════════
   SCRAPBOOK PAGE — a memory card
   ═══════════════════════════════════════ */
function ScrapbookCard({ memory: m, index, onClick, onDelete }) {
  const d = getDecorations(m.id, index)
  const isLeft = index % 2 === 0

  return (
    <div
      onClick={onClick}
      style={{
        ...S.card,
        transform: `rotate(${d.rotate}deg)`,
        animationDelay: `${Math.min(index * 0.06, 0.5)}s`,
      }}
    >
      {/* Washi tape */}
      {d.tapeStyle === 0 && (
        <div style={{
          ...S.tape, ...S.tapeTop,
          background: d.tapeColor,
          transform: `rotate(${d.tapeAngle}deg)`,
        }} />
      )}
      {d.tapeStyle === 1 && (
        <div style={{
          ...S.tape, ...S.tapeCorner,
          background: d.tapeColor,
          transform: `rotate(${isLeft ? 35 : -35}deg)`,
          [isLeft ? 'left' : 'right']: -8,
          [isLeft ? 'right' : 'left']: 'auto',
        }} />
      )}
      {d.tapeStyle === 2 && (
        <>
          <div style={{
            ...S.tape, ...S.tapeLeft,
            background: d.tapeColor,
            transform: `rotate(${-15 + d.tapeAngle}deg)`,
          }} />
          <div style={{
            ...S.tape, ...S.tapeRight,
            background: d.tapeColor,
            transform: `rotate(${15 - d.tapeAngle}deg)`,
          }} />
        </>
      )}

      {/* Photo */}
      <div style={S.photoFrame}>
        {m.imgUrl ? (
          <img src={m.imgUrl} alt={m.title} style={S.photo} loading="lazy" />
        ) : (
          <div style={S.photoPlaceholder}>📸</div>
        )}
      </div>

      {/* Handwritten info */}
      <div style={S.info}>
        <div style={S.title}>{m.title}</div>
        {m.caption && <div style={S.caption}>{m.caption}</div>}
        <div style={S.date}>{m.date ? formatDate(m.date) : ''}</div>
      </div>

      {/* Sticker */}
      <div style={{
        ...S.sticker,
        ...S[`stickerPos${d.stickerPos}`],
      }}>
        {d.sticker}
      </div>

      {/* Delete */}
      <button
        type="button"
        style={S.delBtn}
        onClick={onDelete}
        title="Delete"
        aria-label={`Delete memory: ${m.title}`}
      >✕</button>
    </div>
  )
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export default function Memories() {
  const showToast = useContext(ToastContext)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showJourney, setShowJourney] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = fsListen('memories', data => {
      setMemories(data)
      setLoading(false)
    })
    return unsub
  }, [])

  // Show journey on first visit (only if there are memories)
  useEffect(() => {
    if (!loading && memories.length > 0 && !localStorage.getItem(JOURNEY_KEY)) {
      setShowJourney(true)
    }
  }, [loading, memories.length])

  const finishJourney = useCallback(() => {
    localStorage.setItem(JOURNEY_KEY, '1')
    setShowJourney(false)
  }, [])

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
        rotate: (Math.random() * 6 - 3).toFixed(2),
      })
      resetForm()
      setOpen(false)
      showToast('Memory saved! 📸')
    } catch (e) {
      console.error(e)
      showToast('Error saving memory — check Cloudinary config')
    }
    setSaving(false)
  }

  const del = async (m, e) => {
    if (e) e.stopPropagation()
    try {
      await fsDelete('memories', m.id)
      showToast('Memory deleted')
    } catch {
      showToast('Error deleting')
    }
  }

  const groups = useMemo(() => groupByMonth(memories), [memories])

  // ─── Journey Mode ───
  if (showJourney && memories.length > 0) {
    return <MemoryJourney memories={memories} onFinish={finishJourney} />
  }

  // ─── Scrapbook Mode ───
  return (
    <div className="page-content">
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.pageTitle}>📖 Our Scrapbook</div>
          <div style={S.pageSub}>
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'} · sorted by date
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {memories.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => {
              localStorage.removeItem(JOURNEY_KEY)
              setShowJourney(true)
            }}>
              ▶ Journey
            </Button>
          )}
          <Button size="sm" onClick={() => { resetForm(); setOpen(true) }}>+ Add</Button>
        </div>
      </div>

      {/* Scrapbook content */}
      <div style={S.scrapbook}>
        {loading ? (
          <div className="loading">🌸</div>
        ) : memories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <p>No memories yet.<br />Start your scrapbook!</p>
          </div>
        ) : (
          groups.map((group, gi) => (
            <div key={group.key} style={{ marginBottom: 28 }}>
              {/* Month/Year divider */}
              <div style={S.monthDivider}>
                <div style={S.dividerLine} />
                <span style={S.monthLabel}>{group.label}</span>
                <div style={S.dividerLine} />
              </div>

              {/* Cards grid */}
              <div style={S.grid}>
                {group.items.map((m, i) => (
                  <ScrapbookCard
                    key={m.id}
                    memory={m}
                    index={gi * 10 + i}
                    onClick={() => setSelected(m)}
                    onDelete={(e) => del(m, e)}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* Scrapbook corner decorations */}
        <div style={S.cornerTL}>🌸</div>
        <div style={S.cornerBR}>💕</div>
      </div>

      {/* Add Memory Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="📸 Add a Memory">
        <ImageUpload onFile={handleFile} preview={preview} label="Tap to upload your photo" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Memory title (e.g. First date 💕)" style={{ marginBottom: 10 }} />
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption / note (optional)" style={{ marginBottom: 10 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 16 }} />
        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Developing your polaroid… 📸' : 'Save Memory 🌸'}
        </Button>
      </Modal>

      {/* View Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="">
        {selected && (
          <div style={{ textAlign: 'center' }}>
            <div style={S.viewPolaroid}>
              {selected.imgUrl
                ? <img src={selected.imgUrl} alt={selected.title} style={S.viewImg} />
                : <div style={S.viewPlaceholder}>📸</div>
              }
              <div style={S.viewInfo}>
                <div style={S.viewTitle}>{selected.title}</div>
                {selected.caption && <div style={S.viewCaption}>"{selected.caption}"</div>}
                <div style={S.viewDate}>{selected.date ? formatDate(selected.date) : ''}</div>
              </div>
            </div>
            <Button variant="danger" size="sm" style={{ marginTop: 16 }}
              onClick={async () => {
                try {
                  await fsDelete('memories', selected.id)
                  setSelected(null)
                  showToast('Deleted')
                } catch {
                  showToast('Error deleting')
                }
              }}>
              Delete Memory
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ═══════════════════════════════════════
   JOURNEY STYLES
   ═══════════════════════════════════════ */
const jStyles = {
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 300,
    background: '#1a0e14',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    inset: -20,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(30px) brightness(0.4) saturate(1.3)',
    transition: 'opacity 0.5s ease',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(26,14,20,0.3) 0%, rgba(26,14,20,0.6) 100%)',
  },
  skipBtn: {
    position: 'absolute',
    top: 'calc(16px + env(safe-area-inset-top, 0px))',
    right: 16,
    zIndex: 10,
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 50,
    color: 'rgba(255,255,255,0.85)',
    padding: '8px 20px',
    fontSize: '0.82rem',
    fontFamily: 'Lato, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.5px',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    padding: '20px 24px',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  },
  introWrap: {
    textAlign: 'center',
    color: 'white',
  },
  introEmoji: {
    fontSize: '4rem',
    marginBottom: 20,
    animation: 'pulse 2s ease-in-out infinite',
  },
  introTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 12,
    letterSpacing: '0.5px',
  },
  introSub: {
    fontFamily: "'Caveat', cursive",
    fontSize: '1.3rem',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 30,
  },
  introHint: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    animation: 'pulse 2s ease-in-out infinite',
    animationDelay: '1s',
  },
  slideWrap: {
    textAlign: 'center',
    maxWidth: 340,
    width: '100%',
  },
  polaroidFrame: {
    background: '#fffdf5',
    padding: '10px 10px 0',
    borderRadius: 3,
    boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
    position: 'relative',
    marginBottom: 0,
  },
  slideImg: {
    width: '100%',
    aspectRatio: '4/5',
    objectFit: 'cover',
    display: 'block',
    borderRadius: 2,
    filter: 'contrast(1.04) saturate(0.95)',
  },
  slidePlaceholder: {
    width: '100%',
    aspectRatio: '4/5',
    background: 'linear-gradient(135deg, #f5e8ee, #ede0e8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '4rem',
  },
  tapeTop: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: 'translateX(-50%) rotate(-2deg)',
    width: 80,
    height: 22,
    background: 'rgba(232,160,160,0.55)',
    borderRadius: 2,
  },
  slideInfo: {
    background: '#fffdf5',
    padding: '14px 10px 20px',
    borderRadius: '0 0 3px 3px',
    marginBottom: 0,
  },
  slideTitle: {
    fontFamily: "'Caveat', cursive",
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#4a3040',
  },
  slideCaption: {
    fontFamily: "'Reenie Beanie', cursive",
    fontSize: '1.15rem',
    color: '#9b6b7b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  slideDate: {
    fontFamily: "'Caveat', cursive",
    fontSize: '0.95rem',
    color: '#b89090',
    marginTop: 6,
  },
  navBar: {
    position: 'relative',
    zIndex: 5,
    padding: '0 20px calc(20px + env(safe-area-inset-bottom, 0px))',
  },
  progressBar: {
    height: 3,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--rose), var(--mauve))',
    borderRadius: 2,
    transition: 'width 0.5s ease',
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 50,
    color: 'white',
    padding: '10px 22px',
    fontSize: '0.85rem',
    fontFamily: 'Lato, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.3px',
  },
  counter: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    fontFamily: "'Caveat', cursive",
    letterSpacing: '0.5px',
  },
  touchLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '70%',
    zIndex: 3,
    cursor: 'pointer',
  },
  touchRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '30%',
    height: '70%',
    zIndex: 3,
    cursor: 'pointer',
  },
}

/* ═══════════════════════════════════════
   SCRAPBOOK STYLES
   ═══════════════════════════════════════ */
const S = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem',
    color: 'var(--mauve-deep)',
  },
  pageSub: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    marginTop: 2,
  },

  // Scrapbook container
  scrapbook: {
    position: 'relative',
    background: 'linear-gradient(180deg, #fef5f0 0%, #fdf0f2 30%, #f5eff5 70%, #f0f5f0 100%)',
    borderRadius: 20,
    padding: '24px 14px 32px',
    boxShadow: 'inset 0 2px 12px rgba(200,120,140,0.08), 0 4px 20px rgba(100,60,80,0.08)',
    border: '1px solid rgba(232,160,160,0.15)',
    minHeight: 300,
    overflow: 'hidden',
  },

  // Month dividers
  monthDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    padding: '0 4px',
  },
  dividerLine: {
    flex: 1,
    height: 2,
    background: 'linear-gradient(90deg, transparent, rgba(232,160,160,0.35), transparent)',
    borderRadius: 1,
  },
  monthLabel: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.9rem',
    color: 'var(--mauve)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
  },

  // Card grid
  grid: {
    columns: 2,
    columnGap: 16,
    columnFill: 'balance',
  },

  // Scrapbook card
  card: {
    breakInside: 'avoid',
    display: 'inline-block',
    width: '100%',
    background: '#fffdf5',
    padding: '8px 8px 16px',
    borderRadius: 3,
    marginBottom: 18,
    cursor: 'pointer',
    position: 'relative',
    boxShadow: '0 3px 12px rgba(100,60,80,0.12), 0 1px 3px rgba(0,0,0,0.05)',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s',
    animation: 'fadeUp 0.4s ease both',
    WebkitTapHighlightColor: 'transparent',
  },

  // Washi tape styles
  tape: {
    position: 'absolute',
    height: 18,
    borderRadius: 1,
    zIndex: 3,
    opacity: 0.85,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  tapeTop: {
    top: -8,
    left: '50%',
    marginLeft: -30,
    width: 60,
  },
  tapeCorner: {
    top: -5,
    width: 50,
  },
  tapeLeft: {
    top: -6,
    left: -6,
    width: 45,
  },
  tapeRight: {
    top: -6,
    right: -6,
    width: 45,
  },

  // Photo
  photoFrame: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    display: 'block',
    filter: 'contrast(1.04) saturate(0.95)',
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: '1',
    background: 'linear-gradient(135deg, #f5e8ee, #ede0e8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    borderRadius: 2,
  },

  // Info
  info: {
    paddingTop: 8,
    textAlign: 'center',
    minHeight: 36,
  },
  title: {
    fontFamily: "'Caveat', cursive",
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#4a3040',
    lineHeight: 1.3,
  },
  caption: {
    fontFamily: "'Reenie Beanie', cursive",
    fontSize: '0.88rem',
    color: '#9b6b7b',
    marginTop: 2,
    lineHeight: 1.3,
  },
  date: {
    fontFamily: "'Caveat', cursive",
    fontSize: '0.7rem',
    color: '#b89090',
    marginTop: 3,
  },

  // Sticker
  sticker: {
    position: 'absolute',
    fontSize: '1.1rem',
    zIndex: 4,
    pointerEvents: 'none',
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
    transition: 'transform 0.3s ease',
  },
  stickerPos0: { top: -6, left: -4 },
  stickerPos1: { top: -6, right: -4 },
  stickerPos2: { bottom: 2, left: -4 },
  stickerPos3: { bottom: 2, right: -4 },

  // Delete button
  delBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    background: 'rgba(0,0,0,0.35)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: 22,
    height: 22,
    fontSize: '0.55rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s',
    zIndex: 5,
    WebkitTapHighlightColor: 'transparent',
  },

  // Corner decorations
  cornerTL: {
    position: 'absolute',
    top: 8,
    left: 10,
    fontSize: '1.2rem',
    opacity: 0.25,
    pointerEvents: 'none',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    fontSize: '1.2rem',
    opacity: 0.25,
    pointerEvents: 'none',
  },

  // View modal
  viewPolaroid: {
    background: '#fffdf5',
    padding: '12px 12px 24px',
    boxShadow: '0 8px 30px rgba(100,60,80,0.2)',
    borderRadius: 3,
    display: 'inline-block',
    maxWidth: '100%',
    width: '100%',
  },
  viewImg: {
    width: '100%',
    maxHeight: 320,
    objectFit: 'cover',
    borderRadius: 2,
    filter: 'contrast(1.04) saturate(0.95)',
  },
  viewPlaceholder: {
    width: '100%',
    height: 220,
    background: '#f5e8ee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '4rem',
  },
  viewInfo: { paddingTop: 14, textAlign: 'center' },
  viewTitle: {
    fontFamily: "'Caveat', cursive",
    fontSize: '1.4rem',
    fontWeight: 600,
    color: '#4a3040',
  },
  viewCaption: {
    fontFamily: "'Reenie Beanie', cursive",
    fontSize: '1.2rem',
    color: '#9b6b7b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  viewDate: {
    fontFamily: "'Caveat', cursive",
    fontSize: '0.95rem',
    color: '#b89090',
    marginTop: 5,
  },
}
