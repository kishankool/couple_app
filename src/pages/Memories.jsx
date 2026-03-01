import React, { useState, useEffect, useContext, useRef } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImageCloudinary } from '../firebase'
import { ToastContext } from '../App'

export default function Memories() {
  const showToast = useContext(ToastContext)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  // Form state
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = fsListen('memories', data => { setMemories(data); setLoading(false) })
    return unsub
  }, [])

  const handleFile = (f) => { setFile(f); setPreview(URL.createObjectURL(f)) }

  const save = async () => {
    if (!title.trim()) return showToast('Add a title 🌸')
    setSaving(true)
    try {
      let imgUrl = null
      if (file) imgUrl = await uploadImageCloudinary(file)
      await fsAdd('memories', {
        title: title.trim(),
        caption: caption.trim(),
        date: date || new Date().toISOString().split('T')[0],
        imgUrl,
        rotate: (Math.random() * 6 - 3).toFixed(2),   // random tilt for polaroid feel
      })
      setTitle(''); setCaption(''); setDate(''); setFile(null); setPreview(null)
      setOpen(false)
      showToast('Memory saved! 📸')
    } catch (e) {
      console.error(e)
      showToast('Error saving memory — check Cloudinary config')
    }
    setSaving(false)
  }

  const del = async (m, e) => {
    e.stopPropagation()
    try { await fsDelete('memories', m.id); showToast('Memory deleted') }
    catch { showToast('Error deleting') }
  }

  return (
    <div style={{ padding: '18px 16px' }}>


      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>📸 Memories</div>
          <div style={styles.pageSub}>Our polaroid wall</div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>+ Add</Button>
      </div>

      {loading ? (
        <div className="loading">🌸</div>
      ) : memories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <p>No memories yet.<br />Add your first polaroid!</p>
        </div>
      ) : (
        <div style={styles.wall}>
          {memories.map((m, i) => (
            <PolaroidCard key={m.id} memory={m} index={i} onClick={() => setSelected(m)} onDelete={(e) => del(m, e)} />
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="📸 Add a Memory">
        <ImageUpload onFile={handleFile} preview={preview} label="Tap to upload your photo" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Memory title (e.g. First date 💕)" style={{ marginBottom: 8 }} />
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption / note (optional)" style={{ marginBottom: 8 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 14 }} />
        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Developing your polaroid… 📸' : 'Save Memory 🌸'}
        </Button>
      </Modal>

      {/* View Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="">
        {selected && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ ...styles.polaroidLarge }}>
              {selected.imgUrl
                ? <img src={selected.imgUrl} alt={selected.title} style={styles.polaroidImgLarge} />
                : <div style={styles.polaroidPlaceholderLarge}>📸</div>
              }
              <div style={styles.polaroidBottomLarge}>
                <div style={styles.polaroidTitleLarge}>{selected.title}</div>
                {selected.caption && <div style={styles.polaroidCaptionLarge}>{selected.caption}</div>}
                <div style={styles.polaroidDateLarge}>{selected.date ? formatDate(selected.date) : ''}</div>
              </div>
            </div>
            <Button variant="danger" size="sm" style={{ marginTop: 16 }}
              onClick={async () => { await fsDelete('memories', selected.id); setSelected(null); showToast('Deleted') }}>
              Delete Memory
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function PolaroidCard({ memory: m, index, onClick, onDelete }) {
  const rotate = parseFloat(m.rotate || 0)
  const bgTints = ['#fffdf5', '#fdf5ff', '#f5fff8', '#fff5f5', '#f5f8ff']
  const tint = bgTints[index % bgTints.length]

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.polaroid,
        transform: `rotate(${rotate}deg)`,
        background: tint,
        animationDelay: `${index * 0.07}s`,
      }}
    >
      {m.imgUrl
        ? <img src={m.imgUrl} alt={m.title} style={styles.polaroidImg} />
        : <div style={styles.polaroidPlaceholder}>📸</div>
      }
      <div style={styles.polaroidBottom}>
        <div style={styles.polaroidTitle}>{m.title}</div>
        {m.caption && <div style={styles.polaroidCaption}>{m.caption}</div>}
        <div style={styles.polaroidDate}>{m.date ? formatDate(m.date) : ''}</div>
      </div>
      <button
        style={styles.delBtn}
        onClick={onDelete}
        title="Delete"
      >✕</button>
    </div>
  )
}

function formatDate(d) {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },

  // Polaroid wall — masonry-ish two-column
  wall: {
    columns: 2,
    columnGap: 12,
  },

  polaroid: {
    breakInside: 'avoid',
    display: 'inline-block',
    width: '100%',
    background: '#fffdf5',
    padding: '8px 8px 16px',
    boxShadow: '0 6px 20px rgba(100,60,80,0.18), 0 2px 6px rgba(0,0,0,0.08)',
    borderRadius: 2,
    marginBottom: 14,
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.2s, box-shadow 0.2s',
    animation: 'fadeUp 0.4s ease both',
  },

  polaroidImg: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    display: 'block',
    borderRadius: 1,
    filter: 'contrast(1.04) saturate(0.95)',  // slight faded film look
  },

  polaroidPlaceholder: {
    width: '100%', aspectRatio: '1',
    background: 'linear-gradient(135deg, #f5e8ee, #ede0e8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '2.5rem', borderRadius: 1,
  },

  polaroidBottom: {
    paddingTop: 8,
    paddingBottom: 2,
    textAlign: 'center',
    minHeight: 44,
  },

  polaroidTitle: {
    fontFamily: "'Caveat', cursive",
    fontSize: '1rem',
    fontWeight: 600,
    color: '#4a3040',
    lineHeight: 1.3,
  },

  polaroidCaption: {
    fontFamily: "'Reenie Beanie', cursive",
    fontSize: '0.95rem',
    color: '#9b6b7b',
    marginTop: 2,
    lineHeight: 1.3,
  },

  polaroidDate: {
    fontFamily: "'Caveat', cursive",
    fontSize: '0.78rem',
    color: '#b89090',
    marginTop: 3,
  },

  delBtn: {
    position: 'absolute', top: 4, right: 4,
    background: 'rgba(0,0,0,0.35)', color: 'white',
    border: 'none', borderRadius: '50%',
    width: 22, height: 22, fontSize: '0.6rem',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.7,
  },

  // Large polaroid in modal
  polaroidLarge: {
    background: '#fffdf5',
    padding: '12px 12px 24px',
    boxShadow: '0 8px 30px rgba(100,60,80,0.2)',
    borderRadius: 2,
    display: 'inline-block',
    maxWidth: 300,
  },
  polaroidImgLarge: {
    width: '100%',
    maxHeight: 260,
    objectFit: 'cover',
    borderRadius: 1,
    filter: 'contrast(1.04) saturate(0.95)',
  },
  polaroidPlaceholderLarge: {
    width: 260, height: 220,
    background: '#f5e8ee',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '4rem',
  },
  polaroidBottomLarge: { paddingTop: 12, textAlign: 'center' },
  polaroidTitleLarge: {
    fontFamily: "'Caveat', cursive",
    fontSize: '1.3rem', fontWeight: 600, color: '#4a3040',
  },
  polaroidCaptionLarge: {
    fontFamily: "'Reenie Beanie', cursive",
    fontSize: '1.15rem', color: '#9b6b7b', marginTop: 4,
  },
  polaroidDateLarge: {
    fontFamily: "'Caveat', cursive",
    fontSize: '0.9rem', color: '#b89090', marginTop: 5,
  },
}
