import React, { useState, useEffect, useContext } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsDelete, fsUpdate, fsListen } from '../firebase'
import { ToastContext } from '../App'

export default function Todos() {
  const showToast = useContext(ToastContext)
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = fsListen('todos', d => { setTodos(d); setLoading(false) }, 'createdAt')
    return unsub
  }, [])

  const add = async () => {
    if (!text.trim()) return showToast('Enter a to-do 🌸')
    setSaving(true)
    try {
      await fsAdd('todos', { text: text.trim(), done: false })
      setText(''); setOpen(false)
      showToast('To-do added! ✅')
    } catch { showToast('Error adding') }
    setSaving(false)
  }

  const toggle = async (t) => {
    try { await fsUpdate('todos', t.id, { done: !t.done }) }
    catch { showToast('Error updating') }
  }

  const del = async (id) => {
    try { await fsDelete('todos', id); showToast('Removed') }
    catch { showToast('Error deleting') }
  }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <div className="page-content">
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>✅ Our To-dos</div>
          <div style={styles.pageSub}>Things to do together · {pending.length} pending</div>
        </div>
        <Button size="sm" onClick={() => { setText(''); setOpen(true) }}>+ Add</Button>
      </div>

      {loading ? <div className="loading">🌸</div> : todos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <p>No to-dos yet.<br />Add things to do together!</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <div className="section-label">Pending ({pending.length})</div>
              {pending.map((t, i) => <TodoItem key={t.id} todo={t} index={i} onToggle={toggle} onDel={del} />)}
            </>
          )}
          {done.length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-label">Done ({done.length}) ✨</div>
              {done.map((t, i) => <TodoItem key={t.id} todo={t} index={i} onToggle={toggle} onDel={del} />)}
            </>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="✅ Add To-do">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Plan a trip to Goa 🏖️" style={{ marginBottom: 14 }} onKeyDown={e => e.key === 'Enter' && add()} />
        <Button size="full" onClick={add} disabled={saving}>{saving ? 'Adding…' : 'Add To-do ✨'}</Button>
      </Modal>
    </div>
  )
}

function TodoItem({ todo, index, onToggle, onDel }) {
  return (
    <div style={{
      ...styles.todoItem,
      opacity: todo.done ? 0.55 : 1,
      animationDelay: `${Math.min(index * 0.04, 0.3)}s`,
    }}>
      <button onClick={() => onToggle(todo)} style={{ ...styles.check, ...(todo.done ? styles.checkDone : {}) }}>
        {todo.done ? '✓' : ''}
      </button>
      <span style={{
        flex: 1,
        fontSize: '0.92rem',
        textDecoration: todo.done ? 'line-through' : 'none',
        color: todo.done ? 'var(--text-light)' : 'var(--text)',
        lineHeight: 1.4,
      }}>{todo.text}</span>
      <button style={styles.del} onClick={() => onDel(todo.id)} title="Delete">🗑</button>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
  todoItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', background: 'white', borderRadius: 16,
    marginBottom: 8, boxShadow: '0 3px 12px var(--shadow)',
    transition: 'opacity 0.25s, transform 0.2s',
    border: '1px solid var(--border)',
    animation: 'fadeUp 0.3s ease both',
  },
  check: {
    width: 26, height: 26, borderRadius: '50%',
    border: '2px solid var(--rose-dark)', background: 'none',
    cursor: 'pointer', flexShrink: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '0.78rem', transition: 'all 0.25s',
    WebkitTapHighlightColor: 'transparent',
  },
  checkDone: { background: 'var(--rose-dark)', border: '2px solid var(--rose-dark)' },
  del: {
    background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1rem',
    transition: 'color 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
}
