import React, { useContext } from 'react'
import { WhoContext } from '../App'

export default function WhoSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      {['Kishan', 'Aditi'].map(name => (
        <button
          key={name}
          onClick={() => onChange(name)}
          style={{
            flex: 1,
            padding: '10px',
            border: `2px solid ${value === name ? 'var(--mauve)' : 'var(--border)'}`,
            borderRadius: 12,
            background: value === name ? 'var(--blush)' : 'white',
            color: value === name ? 'var(--mauve-deep)' : 'var(--text)',
            fontWeight: value === name ? 700 : 400,
            fontFamily: "Lato, sans-serif",
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {name === 'Kishan' ? '💙' : '🌸'} {name}
        </button>
      ))}
    </div>
  )
}
