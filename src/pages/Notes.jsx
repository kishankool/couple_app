import React, { useState, useEffect, useContext } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import WhoSelector from '../components/WhoSelector'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { WhoContext, ToastContext } from '../App'

export default function Notes() {
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(who)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = fsListen('notes', (data) => {
      setNotes(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const save = async () => {
    if (!text.trim()) return showToast('Write something first 🌸')
    setSaving(true)
    try {
      await fsAdd('notes', {
        who: from,
        text: text.trim(),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      })
      setText('')
      setOpen(false)
      showToast('Love note sent! 💌')
    } catch { showToast('Error saving note') }
    setSaving(false)
  }

  const del = async (id) => {
    try {
      await fsDelete('notes', id)
      showToast('Note deleted')
    } catch { showToast('Error deleting') }
  }

  return (
    <div style={{ padding: '18px 16px' }}>
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>💌 Love Notes</div>
          <div style={styles.pageSub}>Sweet messages for each other</div>
        </div>
        <Button size="sm" onClick={() => { setFrom(who); setOpen(true) }}>+ Write</Button>
      </div>

      {loading ? <div className="loading">🌸</div> : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💌</div>
          <p>No love notes yet.<br />Write the first one!</p>
        </div>
      ) : notes.map((n) => (
        <div key={n.id} style={styles.noteCard}>
          <div style={styles.noteHeader}>
            <span style={styles.authorTag}>{n.who === 'Kishan' ? '💙' : '🌸'} {n.who}</span>
            <span style={styles.noteDate}>{n.date}</span>
          </div>
          <div style={styles.noteText}>{n.text}</div>
          <button style={styles.delBtn} onClick={() => del(n.id)}>🗑</button>
        </div>
      ))}

      <Modal open={open} onClose={() => setOpen(false)} title="💌 Write a Love Note">
        <div className="section-label">From</div>
        <WhoSelector value={from} onChange={setFrom} />
        <div className="section-label">Your message</div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write something sweet… 🌸" style={{ marginBottom: 12 }} />
        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Sending…' : 'Send Note 💕'}
        </Button>
      </Modal>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
  noteCard: {
    background: 'white',
    borderRadius: 14,
    padding: '14px 16px',
    marginBottom: 10,
    borderLeft: '4px solid var(--rose-dark)',
    boxShadow: '0 3px 12px var(--shadow)',
    position: 'relative',
    animation: 'fadeUp 0.3s ease',
  },
  noteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  authorTag: {
    background: 'var(--blush)',
    color: 'var(--mauve-deep)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  noteDate: { fontSize: '0.68rem', color: 'var(--text-light)' },
  noteText: { fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text)', paddingRight: 24 },
  delBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'color 0.2s',
  },
}
