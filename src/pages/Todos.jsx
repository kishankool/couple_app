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
    <div style={{ padding: '18px 16px' }} className="fade-up">
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>✅ Our To-dos</div>
          <div style={styles.pageSub}>Things to do together</div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>+ Add</Button>
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
              {pending.map(t => <TodoItem key={t.id} todo={t} onToggle={toggle} onDel={del} />)}
            </>
          )}
          {done.length > 0 && (
            <>
              <hr className="divider" />
              <div className="section-label">Done ({done.length}) ✨</div>
              {done.map(t => <TodoItem key={t.id} todo={t} onToggle={toggle} onDel={del} />)}
            </>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="✅ Add To-do">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Plan a trip to Goa 🏖️" style={{ marginBottom: 12 }} onKeyDown={e => e.key === 'Enter' && add()} />
        <Button size="full" onClick={add} disabled={saving}>{saving ? 'Adding…' : 'Add To-do ✨'}</Button>
      </Modal>
    </div>
  )
}

function TodoItem({ todo, onToggle, onDel }) {
  return (
    <div style={{ ...styles.todoItem, opacity: todo.done ? 0.55 : 1 }}>
      <button onClick={() => onToggle(todo)} style={{ ...styles.check, ...(todo.done ? styles.checkDone : {}) }}>
        {todo.done ? '✓' : ''}
      </button>
      <span style={{ flex: 1, fontSize: '0.9rem', textDecoration: todo.done ? 'line-through' : 'none' }}>{todo.text}</span>
      <button style={styles.del} onClick={() => onDel(todo.id)}>🗑</button>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
  todoItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', background: 'white', borderRadius: 14,
    marginBottom: 8, boxShadow: '0 3px 10px var(--shadow)', transition: 'opacity 0.2s',
  },
  check: {
    width: 24, height: 24, borderRadius: '50%',
    border: '2px solid var(--rose-dark)', background: 'none',
    cursor: 'pointer', flexShrink: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '0.75rem', transition: 'all 0.2s',
  },
  checkDone: { background: 'var(--rose-dark)', border: '2px solid var(--rose-dark)' },
  del: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '1rem' },
}
