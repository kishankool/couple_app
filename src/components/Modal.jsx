import React, { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>{title}</span>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(60,30,45,0.55)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    background: 'white',
    borderRadius: '24px 24px 0 0',
    padding: '24px 20px 36px',
    width: '100%',
    maxWidth: 480,
    animation: 'slideUp 0.3s ease',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.15rem',
    color: 'var(--mauve-deep)',
  },
  close: {
    background: 'var(--blush)',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: 'var(--mauve)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
}
