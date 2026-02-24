import React from 'react'

export default function Toast({ msg }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 85,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--mauve-deep)',
      color: 'white',
      padding: '10px 24px',
      borderRadius: 30,
      fontSize: '0.85rem',
      zIndex: 300,
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(107,63,82,0.35)',
      animation: 'fadeUp 0.3s ease',
    }}>
      {msg}
    </div>
  )
}
