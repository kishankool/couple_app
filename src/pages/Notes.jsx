import React, { useState, useEffect, useContext } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import WhoSelector from '../components/WhoSelector'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { WhoContext, ToastContext } from '../App'
import { notifyPartner } from '../push'

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
      try {
        await notifyPartner(from, {
          title: '💌 You received a love note!',
          body: `Open the app to read what ${from} wrote for you 🌸`,
          url: '/notes'
        })
      } catch (pushErr) {
        console.warn('Push notification failed:', pushErr)
      }
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
    <div className="page-content">
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>💌 Love Notes</div>
          <div style={styles.pageSub}>Sweet messages · {notes.length} {notes.length === 1 ? 'note' : 'notes'}</div>
        </div>
        <Button size="sm" onClick={() => { setFrom(who); setText(''); setOpen(true) }}>+ Write</Button>
      </div>

      {loading ? <div className="loading">🌸</div> : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💌</div>
          <p>No love notes yet.<br />Write the first one!</p>
        </div>
      ) : notes.map((n, i) => (
        <div key={n.id} style={{ ...styles.noteCard, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
          <div style={styles.noteHeader}>
            <span style={styles.authorTag}>{n.who === 'Kishan' ? '💙' : '🌸'} {n.who}</span>
            <span style={styles.noteDate}>{n.date}</span>
          </div>
          <div style={styles.noteText}>{n.text}</div>
          <button style={styles.delBtn} onClick={() => del(n.id)} title="Delete">🗑</button>
        </div>
      ))}

      <Modal open={open} onClose={() => setOpen(false)} title="💌 Write a Love Note">
        <div className="section-label">From</div>
        <WhoSelector value={from} onChange={setFrom} />
        <div className="section-label">Your message</div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write something sweet… 🌸" style={{ marginBottom: 14 }} />
        <Button size="full" onClick={save} disabled={saving}>
          {saving ? 'Sending…' : 'Send Note 💕'}
        </Button>
      </Modal>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
  noteCard: {
    background: 'white',
    borderRadius: 16,
    padding: '16px 18px',
    marginBottom: 10,
    borderLeft: '4px solid var(--rose-dark)',
    boxShadow: '0 3px 14px var(--shadow)',
    position: 'relative',
    animation: 'fadeUp 0.35s ease both',
    transition: 'transform 0.2s',
  },
  noteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  authorTag: {
    background: 'var(--blush)',
    color: 'var(--mauve-deep)',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: '0.72rem',
    fontWeight: 700,
  },
  noteDate: { fontSize: '0.7rem', color: 'var(--text-light)' },
  noteText: { fontSize: '0.94rem', lineHeight: 1.7, color: 'var(--text)', paddingRight: 28 },
  delBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'color 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
}
