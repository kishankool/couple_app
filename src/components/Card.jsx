// src/components/Card.jsx
import React from 'react'

export default function Card({ children, style }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 18,
      padding: '18px',
      marginBottom: 14,
      boxShadow: '0 4px 20px var(--shadow)',
      border: '1px solid var(--border)',
      ...style
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon }) {
  return (
    <div style={{
      fontFamily: "'Playfair Display', serif",
      fontSize: '1rem',
      color: 'var(--mauve-deep)',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  )
}
