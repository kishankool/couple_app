import React, { useEffect, useRef } from 'react'

const PETALS = ['🌸', '🌺', '✿', '❀', '🌷', '💮', '🌹']

export default function Petals() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    let intervalId

    const spawn = () => {
      const el = document.createElement('div')
      el.textContent = PETALS[Math.floor(Math.random() * PETALS.length)]
      el.style.cssText = `
        position: absolute;
        left: ${Math.random() * 100}%;
        top: -30px;
        font-size: ${10 + Math.random() * 10}px;
        opacity: 0;
        animation: floatPetal ${9 + Math.random() * 9}s linear forwards;
        pointer-events: none;
      `
      container.appendChild(el)
      setTimeout(() => el.remove(), 20000)
    }

    const style = document.createElement('style')
    style.textContent = `
      @keyframes floatPetal {
        0% { transform: translateY(0) rotate(0deg); opacity: 0; }
        8% { opacity: 0.55; }
        92% { opacity: 0.25; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `
    document.head.appendChild(style)

    spawn()
    intervalId = setInterval(spawn, 2200)

    return () => {
      clearInterval(intervalId)
      style.remove()
    }
  }, [])

  return (
    <div ref={containerRef} style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 1,
      overflow: 'hidden',
    }} />
  )
}
