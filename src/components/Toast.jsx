import React from 'react'

export default function Toast({ msg }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--mauve-deep)',
      color: 'white',
      padding: '11px 24px',
      borderRadius: 30,
      fontSize: '0.86rem',
      zIndex: 300,
      whiteSpace: 'nowrap',
      maxWidth: 'calc(100vw - 32px)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      boxShadow: '0 6px 24px rgba(107,63,82,0.4)',
      animation: 'fadeUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      WebkitBackdropFilter: 'blur(10px)',
      backdropFilter: 'blur(10px)',
    }}>
      {msg}
    </div>
  )
}
