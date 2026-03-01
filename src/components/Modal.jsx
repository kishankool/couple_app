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
        <div style={styles.handle} />
        <div style={styles.header}>
          <span style={styles.title}>{title}</span>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>
        <div style={styles.content}>
          {children}
        </div>
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
    WebkitBackdropFilter: 'blur(4px)',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'white',
    borderRadius: '24px 24px 0 0',
    padding: '10px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
    width: '100%',
    maxWidth: 480,
    animation: 'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    maxHeight: '92vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    boxShadow: '0 -8px 40px rgba(60,30,45,0.2)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: 'rgba(0,0,0,0.12)',
    margin: '0 auto 12px',
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
    width: 34,
    height: 34,
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: 'var(--mauve)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  content: {
    paddingBottom: 8,
  },
}
