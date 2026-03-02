import React, { useState, useEffect, useContext, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { WhoContext, ToastContext, RoleContext } from '../App'

const JAR_REASONS = [
    "Because you make me laugh even on my worst days 😄",
    "Because your smile can turn any moment magical ✨",
    "Because you always know what to say when I'm sad 💙",
    "Because you understand me without me having to explain 🌸",
    "Because you make ordinary moments feel extraordinary 💕",
]

export default function LoveJar() {
    const { who } = useContext(WhoContext)
    const showToast = useContext(ToastContext)
    const { isVisitor } = useContext(RoleContext)
    const [reasons, setReasons] = useState([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [saving, setSaving] = useState(false)
    const [picked, setPicked] = useState(null)
    const [shaking, setShaking] = useState(false)
    const [showAll, setShowAll] = useState(false)

    useEffect(() => {
        const unsub = fsListen('love_reasons', d => {
            setReasons(d)
            setLoading(false)
        })
        return unsub
    }, [])

    const allReasons = [...JAR_REASONS.map((r, i) => ({ id: `default-${i}`, text: r, who: 'Both', isDefault: true })), ...reasons]

    const pickRandom = () => {
        if (allReasons.length === 0) return
        setShaking(true)
        setTimeout(() => {
            const r = allReasons[Math.floor(Math.random() * allReasons.length)]
            setPicked(r)
            setShaking(false)
        }, 700)
    }

    const save = async () => {
        if (!text.trim()) return showToast('Write a reason first 💕')
        setSaving(true)
        try {
            await fsAdd('love_reasons', { who, text: text.trim() })
            setText('')
            setOpen(false)
            showToast('Added to the jar! 💝')
        } catch { showToast('Error saving') }
        setSaving(false)
    }

    const del = async (id) => {
        try { await fsDelete('love_reasons', id); showToast('Removed from jar') }
        catch { showToast('Error') }
    }

    return (
        <div className="page-content">
            <div style={s.header}>
                <div>
                    <div style={s.title}>💝 Love Jar</div>
                    <div style={s.sub}>{allReasons.length} reasons to love you</div>
                </div>
                {!isVisitor && (
                    <Button size="sm" onClick={() => { setText(''); setOpen(true) }}>+ Add</Button>
                )}
            </div>

            {/* The Jar */}
            <div style={s.jarSection}>
                <motion.div
                    style={s.jar}
                    animate={shaking ? { rotate: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                    transition={{ duration: 0.6 }}
                    onClick={pickRandom}
                >
                    <div style={s.jarTop} />
                    <div style={s.jarBody}>
                        <div style={s.jarGlow} />
                        <div style={s.jarLabel}>
                            <div style={s.jarHeart}>💕</div>
                            <div style={s.jarLabelText}>Love Jar</div>
                            <div style={s.jarCount}>{allReasons.length} reasons</div>
                        </div>
                        {/* Hearts floating in jar */}
                        {['💕', '💙', '🌸', '✨', '💖'].map((h, i) => (
                            <div key={i} style={{
                                ...s.floatingHeart,
                                left: `${15 + i * 16}%`,
                                animationDelay: `${i * 0.4}s`,
                                animationDuration: `${2 + i * 0.3}s`,
                            }}>{h}</div>
                        ))}
                    </div>
                </motion.div>
                <Button size="full" onClick={pickRandom} style={{ marginTop: 16 }}>
                    🫙 Pick a Random Reason
                </Button>
                <p style={s.hint}>Tap the jar or button to pick a reason!</p>
            </div>

            {/* Picked reason */}
            <AnimatePresence>
                {picked && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        style={s.pickedCard}
                    >
                        <div style={s.pickedHeart}>💝</div>
                        <div style={s.pickedText}>"{picked.text}"</div>
                        <div style={s.pickedWho}>
                            {picked.isDefault ? '💕 A reason to love' : `${picked.who === 'Kishan' ? '💙' : '🌸'} from ${picked.who}`}
                        </div>
                        <button style={s.closePickedBtn} onClick={() => setPicked(null)}>✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* All reasons list */}
            {!loading && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div className="section-label">All Reasons</div>
                        <button style={s.toggleBtn} onClick={() => setShowAll(v => !v)}>
                            {showAll ? 'Show less' : 'Show all'}
                        </button>
                    </div>
                    {(showAll ? allReasons : allReasons.slice(0, 5)).map((r, i) => (
                        <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={s.reasonRow}
                        >
                            <span style={s.reasonHeart}>💕</span>
                            <span style={s.reasonText}>{r.text}</span>
                            {!r.isDefault && !isVisitor && (
                                <button style={s.delBtn} onClick={() => del(r.id)}>🗑</button>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            <Modal open={open} onClose={() => setOpen(false)} title="💝 Add a Reason">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 14, lineHeight: 1.6 }}>
                    Write a reason why you love Aditi/Kishan. It'll go into the jar!
                </p>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Because they always…"
                    style={{ marginBottom: 14 }}
                />
                <Button size="full" onClick={save} disabled={saving}>
                    {saving ? 'Adding…' : 'Add to Jar 💝'}
                </Button>
            </Modal>
        </div>
    )
}

const s = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
    sub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },

    jarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 },
    jar: {
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        width: 160,
    },
    jarTop: {
        width: 80,
        height: 20,
        margin: '0 auto',
        background: 'linear-gradient(135deg, #c97a7a, #9b6b7b)',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 -2px 8px rgba(155,107,123,0.3)',
    },
    jarBody: {
        width: 160,
        height: 200,
        background: 'linear-gradient(135deg, rgba(253,240,245,0.95) 0%, rgba(245,221,224,0.9) 100%)',
        border: '3px solid var(--rose)',
        borderRadius: '12px 12px 24px 24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(200,120,140,0.25), inset 0 0 30px rgba(232,160,160,0.1)',
        backdropFilter: 'blur(4px)',
    },
    jarGlow: {
        position: 'absolute',
        top: 10,
        left: 14,
        width: 30,
        height: 80,
        background: 'rgba(255,255,255,0.35)',
        borderRadius: 20,
        transform: 'rotate(15deg)',
    },
    jarLabel: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        textAlign: 'center',
    },
    jarHeart: { fontSize: '2rem' },
    jarLabelText: {
        fontFamily: "'Playfair Display', serif",
        fontSize: '1rem',
        color: 'var(--mauve-deep)',
        fontWeight: 700,
    },
    jarCount: { fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 2 },
    floatingHeart: {
        position: 'absolute',
        fontSize: '1.1rem',
        animation: 'floatJarHeart 2s ease-in-out infinite alternate',
        top: '20%',
    },
    hint: { fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center', marginTop: 8 },

    pickedCard: {
        background: 'linear-gradient(135deg, #fff0f5, #fde8ef)',
        border: '2px solid var(--rose)',
        borderRadius: 20,
        padding: '24px 20px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(200,120,140,0.2)',
        marginBottom: 8,
    },
    pickedHeart: { fontSize: '2.5rem', marginBottom: 12 },
    pickedText: {
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: '1rem',
        color: 'var(--mauve-deep)',
        lineHeight: 1.7,
        marginBottom: 12,
    },
    pickedWho: { fontSize: '0.78rem', color: 'var(--text-light)' },
    closePickedBtn: {
        position: 'absolute', top: 12, right: 12,
        background: 'none', border: 'none',
        color: 'var(--text-light)', cursor: 'pointer',
        fontSize: '0.9rem',
        WebkitTapHighlightColor: 'transparent',
    },

    reasonRow: {
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: 'white',
        borderRadius: 14,
        marginBottom: 8,
        boxShadow: '0 2px 10px var(--shadow)',
        border: '1px solid var(--border)',
    },
    reasonHeart: { flexShrink: 0, fontSize: '1rem' },
    reasonText: { flex: 1, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text)' },
    delBtn: {
        background: 'none', border: 'none', color: '#ccc',
        cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
    },

    toggleBtn: {
        background: 'none', border: 'none',
        color: 'var(--mauve)', fontSize: '0.78rem',
        cursor: 'pointer', fontFamily: 'Lato, sans-serif',
        WebkitTapHighlightColor: 'transparent',
    },
}
