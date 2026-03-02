import React, { useEffect, useRef } from 'react'

/**
 * Confetti burst component.
 * Props:
 *   active   – boolean, trigger a new burst when toggled to true
 *   duration – ms to show confetti (default 3500)
 */
export default function Confetti({ active, duration = 3500 }) {
    const canvasRef = useRef(null)
    const rafRef = useRef(null)
    const timerRef = useRef(null)

    useEffect(() => {
        if (!active) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const COLORS = ['#e8a0a0', '#9b6b7b', '#f5dde0', '#d4a96a', '#b5c9b5', '#c97a7a', '#fff0f5']
        const pieces = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * canvas.height * 0.4,
            r: 4 + Math.random() * 6,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rot: Math.random() * Math.PI * 2,
            vx: -2 + Math.random() * 4,
            vy: 2 + Math.random() * 4,
            vr: (-0.05 + Math.random() * 0.1),
            shape: Math.random() > 0.5 ? 'rect' : 'circle',
        }))

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            pieces.forEach(p => {
                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rot)
                ctx.fillStyle = p.color
                ctx.globalAlpha = 0.9
                if (p.shape === 'rect') {
                    ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
                } else {
                    ctx.beginPath()
                    ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2)
                    ctx.fill()
                }
                ctx.restore()
                p.x += p.vx
                p.y += p.vy
                p.rot += p.vr
                p.vy += 0.06 // gravity
            })
            rafRef.current = requestAnimationFrame(draw)
        }

        draw()
        timerRef.current = setTimeout(() => {
            cancelAnimationFrame(rafRef.current)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }, duration)

        return () => {
            cancelAnimationFrame(rafRef.current)
            clearTimeout(timerRef.current)
            if (canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
    }, [active, duration])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        />
    )
}
