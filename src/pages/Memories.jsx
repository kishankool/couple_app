import React, { useState, useEffect, useContext } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImage } from '../firebase'
import { ToastContext } from '../App'

export default function Memories() {
  const showToast = useContext(ToastContext)
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const unsub = fsListen('memories', data => { setMemories(data); setLoading(false) })
    return unsub
  }, [])

  const handleFile = (f) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    if (!title.trim()) return showToast('Add a title 🌸')
    setSaving(true)
    try {
      let imgUrl = null
      if (file) {
        imgUrl = await uploadImage(file, `memories/${Date.now()}_${file.name}`)
      }
      await fsAdd('memories', {
        title: title.trim(),
        date: date || new Date().toISOString().split('T')[0],
        imgUrl,
      })
      setTitle(''); setDate(''); setFile(null); setPreview(null)
      setOpen(false)
      showToast('Memory saved! 📸')
    } catch (e) { showToast('Error saving memory') }
    setSaving(false)
  }

  const del = async (m) => {
    try {
      await fsDelete('memories', m.id)
      showToast('Memory deleted')
    } catch { showToast('Error deleting') }
  }

  return (
    <div style={{ padding: '18px 16px' }} className="fade-up">
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>📸 Memories</div>
          <div style={styles.pageSub}>Captured moments together</div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>+ Add</Button>
      </div>

      {loading ? <div className="loading">🌸</div> : memories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <p>No memories yet.<br />Add your first one!</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {memories.map(m => (
            <div key={m.id} style={styles.memCard} onClick={() => setSelected(m)}>
              {m.imgUrl
                ? <img src={m.imgUrl} alt={m.title} style={styles.memImg} />
                : <div style={styles.memPlaceholder}>📸</div>
              }
              <button style={styles.delBtn} onClick={e => { e.stopPropagation(); del(m) }}>✕</button>
              <div style={styles.memInfo}>
                <div style={styles.memTitle}>{m.title}</div>
                <div style={styles.memDate}>{m.date ? formatDate(m.date) : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="📸 Add a Memory">
        <ImageUpload onFile={handleFile} preview={preview} label="Tap to upload a photo" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Memory title (e.g. First date 💕)" style={{ marginBottom: 8 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 12 }} />
        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Memory 🌸'}
        </Button>
      </Modal>

      {/* View Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || ''}>
        {selected && (
          <>
            {selected.imgUrl && <img src={selected.imgUrl} alt={selected.title} style={{ width: '100%', borderRadius: 14, marginBottom: 12 }} />}
            <div style={{ fontSize: '0.88rem', color: 'var(--text-light)' }}>{selected.date ? formatDate(selected.date) : ''}</div>
          </>
        )}
      </Modal>
    </div>
  )
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return d }
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  memCard: {
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 14px var(--shadow)',
    background: 'white',
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  memImg: { width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' },
  memPlaceholder: {
    width: '100%', aspectRatio: '1',
    background: 'linear-gradient(135deg, var(--blush), var(--petal))',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
  },
  delBtn: {
    position: 'absolute', top: 6, right: 6,
    background: 'rgba(0,0,0,0.45)', color: 'white',
    border: 'none', borderRadius: '50%', width: 26, height: 26,
    fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  memInfo: { padding: '8px 10px' },
  memTitle: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' },
  memDate: { fontSize: '0.68rem', color: 'var(--text-light)', marginTop: 2 },
}
