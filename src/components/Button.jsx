import React from 'react'

export default function Button({ children, onClick, variant = 'primary', size = 'md', style, disabled, type = 'button' }) {
  const base = {
    border: 'none',
    borderRadius: 50,
    fontFamily: "Lato, sans-serif",
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
    opacity: disabled ? 0.6 : 1,
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
  }

  const sizes = {
    sm: { padding: '6px 16px', fontSize: '0.78rem' },
    md: { padding: '10px 22px', fontSize: '0.88rem' },
    lg: { padding: '13px 28px', fontSize: '0.95rem' },
    full: { padding: '12px 22px', fontSize: '0.88rem', width: '100%', justifyContent: 'center' },
  }

  const variants = {
    primary: { background: 'linear-gradient(135deg, var(--mauve) 0%, var(--mauve-deep) 100%)', color: 'white' },
    rose: { background: 'linear-gradient(135deg, var(--rose) 0%, var(--rose-dark) 100%)', color: 'white' },
    outline: { background: 'transparent', border: '1.5px solid var(--mauve)', color: 'var(--mauve)' },
    danger: { background: 'linear-gradient(135deg, #e88080, #c05050)', color: 'white' },
    ghost: { background: 'var(--blush)', color: 'var(--mauve-deep)', border: 'none' },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}
