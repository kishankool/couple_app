// src/components/Card.jsx
import React from 'react'

export default function Card({ children, style }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      padding: '18px',
      marginBottom: 14,
      boxShadow: '0 4px 20px var(--shadow)',
      border: '1px solid var(--border)',
      transition: 'transform 0.2s',
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
      fontSize: '1.02rem',
      color: 'var(--mauve-deep)',
      marginBottom: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  )
}
