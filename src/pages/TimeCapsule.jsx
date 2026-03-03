import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from '../components/Confetti'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsDelete, fsUpdate, fsListen } from '../firebase'
import { WhoContext, ToastContext, RoleContext } from '../App'
import { notifyPartner } from '../push'

function LockIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
            <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        </svg>
    )
}

function daysUntil(dateStr) {
    const target = new Date(dateStr)
    const now = new Date()
    target.setHours(0, 0, 0, 0)
    now.setHours(0, 0, 0, 0)
    return Math.ceil((target - now) / 86400000)
}

function isUnlocked(dateStr) {
    return daysUntil(dateStr) <= 0
}

export default function TimeCapsule() {
    const { who } = useContext(WhoContext)
    const showToast = useContext(ToastContext)
    const { isVisitor } = useContext(RoleContext)

    const [capsules, setCapsules] = useState([])
    const [addOpen, setAddOpen] = useState(false)
    const [readOpen, setReadOpen] = useState(null) // the capsule being read
    const [confetti, setConfetti] = useState(false)

    // Form state
    const [fTitle, setFTitle] = useState('')
    const [fMessage, setFMessage] = useState('')
    const [fOpenOn, setFOpenOn] = useState('')
    const [fType, setFType] = useState('letter') // letter | memory | promise
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const unsub = fsListen('time_capsules', setCapsules, 'openOn')
        return unsub
    }, [])

    const resetForm = () => { setFTitle(''); setFMessage(''); setFOpenOn(''); setFType('letter') }

    const save = async () => {
        if (!fTitle.trim()) return showToast('Give your capsule a title 💌')
        if (!fMessage.trim()) return showToast('Write your message first ✍️')
        if (!fOpenOn) return showToast('Pick a reveal date 📅')
        const diff = daysUntil(fOpenOn)
        if (diff <= 0) return showToast('Pick a future date!')
        setSaving(true)
        try {
            await fsAdd('time_capsules', {
                title: fTitle.trim(),
                message: fMessage.trim(),
                openOn: fOpenOn,
                type: fType,
                from: who,
                opened: false,
            })
            notifyPartner(who, {
                title: `💌 ${who} sealed a Time Capsule!`,
                body: `Opens on ${new Date(fOpenOn + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                url: '/capsule',
            }).catch(() => { })
            showToast('Capsule sealed! 🔒')
            resetForm()
            setAddOpen(false)
        } catch { showToast('Error saving capsule') }
        setSaving(false)
    }

    const openCapsule = async (c) => {
        if (!isUnlocked(c.openOn)) return
        setReadOpen(c)
        if (!c.opened) {
            setConfetti(true)
            setTimeout(() => setConfetti(false), 3500)
            fsUpdate('time_capsules', c.id, { opened: true }).catch(() => { })
        }
    }

    const del = async (id) => {
        try { await fsDelete('time_capsules', id); showToast('Capsule removed') }
        catch { showToast('Error') }
    }

    const TYPE_META = {
        letter: { icon: '💌', label: 'Love Letter', grad: 'linear-gradient(135deg,#fde8ef,#f5dde0)', accent: '#a04060' },
        memory: { icon: '📸', label: 'Memory', grad: 'linear-gradient(135deg,#e8effe,#dde8fe)', accent: '#1565c0' },
        promise: { icon: '🤝', label: 'Promise', grad: 'linear-gradient(135deg,#e8f5e9,#d4f0d4)', accent: '#2e7d32' },
    }

    const sealed = capsules.filter(c => !isUnlocked(c.openOn)).sort((a, b) => new Date(a.openOn) - new Date(b.openOn))
    const unlocked_ = capsules.filter(c => isUnlocked(c.openOn)).sort((a, b) => new Date(b.openOn) - new Date(a.openOn))

    const minDate = (() => {
        const d = new Date(); d.setDate(d.getDate() + 1)
        return d.toLocaleDateString('en-CA')
    })()

    return (
        <div className="page-content">
            <Confetti active={confetti} />

            {/* Header */}
            <div style={S.header}>
                <div>
                    <div style={S.pageTitle}>💌 Time Capsule</div>
                    <div style={S.pageSub}>Love letters sealed for the future</div>
                </div>
                {!isVisitor && (
                    <Button size="sm" onClick={() => { resetForm(); setAddOpen(true) }}>+ Seal</Button>
                )}
            </div>

            {/* Hero visual */}
            <div style={S.hero}>
                <div style={S.heroIcon}>
                    {sealed.length > 0 ? '🔒' : '💌'}
                </div>
                <div style={S.heroTitle}>
                    {sealed.length > 0
                        ? `${sealed.length} sealed ${sealed.length === 1 ? 'message' : 'messages'} waiting`
                        : 'Seal a message for the future'}
                </div>
                <div style={S.heroSub}>
                    Write now. Read when the time is right.
                </div>
            </div>

            {/* Sealed capsules */}
            {sealed.length > 0 && (
                <>
                    <div style={S.sectionHead}>🔒 Sealed</div>
                    <AnimatePresence>
                        {sealed.map((c, i) => {
                            const meta = TYPE_META[c.type] || TYPE_META.letter
                            const days = daysUntil(c.openOn)
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    style={{ ...S.capsuleCard, background: meta.grad, borderLeft: `4px solid ${meta.accent}` }}
                                >
                                    <div style={S.capsuleTop}>
                                        <div style={S.capsuleTopLeft}>
                                            <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                                            <div>
                                                <div style={{ ...S.capsuleTitle, color: meta.accent }}>{c.title}</div>
                                                <div style={S.capsuleMeta}>
                                                    from {c.from === 'Kishan' ? '💙 Kishan' : '🌸 Aditi'}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ color: meta.accent, opacity: 0.7 }}><LockIcon /></div>
                                    </div>
                                    <div style={{ ...S.countdown, color: meta.accent }}>
                                        Opens in <strong>{days}</strong> {days === 1 ? 'day' : 'days'} —{' '}
                                        {new Date(c.openOn + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                        <span style={{ ...S.typeBadge, background: meta.accent, color: 'white' }}>{meta.label}</span>
                                        {!isVisitor && (
                                            <button style={S.delBtn} onClick={() => del(c.id)}>🗑</button>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </>
            )}

            {/* Unlocked capsules */}
            {unlocked_.length > 0 && (
                <>
                    <div style={{ ...S.sectionHead, marginTop: 20 }}>🎉 Ready to Open</div>
                    <AnimatePresence>
                        {unlocked_.map((c, i) => {
                            const meta = TYPE_META[c.type] || TYPE_META.letter
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.06 }}
                                    style={{ ...S.capsuleCard, cursor: 'pointer', background: meta.grad, borderLeft: `4px solid ${meta.accent}`, boxShadow: `0 6px 20px ${meta.accent}30` }}
                                    onClick={() => openCapsule(c)}
                                >
                                    <div style={S.capsuleTop}>
                                        <div style={S.capsuleTopLeft}>
                                            <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                                            <div>
                                                <div style={{ ...S.capsuleTitle, color: meta.accent }}>{c.title}</div>
                                                <div style={S.capsuleMeta}>
                                                    from {c.from === 'Kishan' ? '💙 Kishan' : '🌸 Aditi'}
                                                </div>
                                            </div>
                                        </div>
                                        {c.opened
                                            ? <span style={{ fontSize: '1.1rem' }}>✅</span>
                                            : <motion.span
                                                animate={{ scale: [1, 1.15, 1] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                style={{ fontSize: '1.2rem' }}
                                            >🎁</motion.span>
                                        }
                                    </div>
                                    <div style={{ ...S.countdown, color: meta.accent }}>
                                        {c.opened ? 'Already opened 💕' : 'Tap to open! 🎉'}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                        <span style={{ ...S.typeBadge, background: meta.accent, color: 'white' }}>{meta.label}</span>
                                        {!isVisitor && (
                                            <button style={S.delBtn} onClick={e => { e.stopPropagation(); del(c.id) }}>🗑</button>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </>
            )}

            {capsules.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">💌</div>
                    <p>No capsules yet!<br />Seal your first love letter 🔒</p>
                </div>
            )}

            {/* Read Modal */}
            <Modal open={!!readOpen} onClose={() => setReadOpen(null)} title="">
                {readOpen && (() => {
                    const meta = TYPE_META[readOpen.type] || TYPE_META.letter
                    return (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 8 }}>{meta.icon}</div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', color: meta.accent, marginBottom: 4 }}>
                                {readOpen.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: 20 }}>
                                from {readOpen.from === 'Kishan' ? '💙 Kishan' : '🌸 Aditi'} · opened{' '}
                                {new Date(readOpen.openOn + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div style={{
                                background: meta.grad,
                                borderLeft: `4px solid ${meta.accent}`,
                                borderRadius: 16, padding: '20px 18px',
                                fontFamily: "'Playfair Display', serif",
                                fontSize: '1rem', lineHeight: 1.75,
                                color: 'var(--text)', textAlign: 'left',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {readOpen.message}
                            </div>
                            <div style={{ marginTop: 20, fontSize: '1.5rem' }}>💕</div>
                        </div>
                    )
                })()}
            </Modal>

            {/* Add Modal */}
            <Modal open={addOpen} onClose={() => setAddOpen(false)} title="💌 Seal a Time Capsule">
                <div className="section-label">Type</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {Object.entries(TYPE_META).map(([k, v]) => (
                        <button
                            key={k}
                            onClick={() => setFType(k)}
                            style={{
                                flex: 1, padding: '10px 8px', borderRadius: 14,
                                border: `2px solid ${v.accent}`,
                                background: fType === k ? v.accent : v.grad,
                                color: fType === k ? 'white' : v.accent,
                                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent', transition: 'all 0.2s',
                            }}
                        >{v.icon} {v.label}</button>
                    ))}
                </div>

                <div className="section-label">Title</div>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="e.g. For our 1st anniversary 💕" style={{ marginBottom: 12 }} />

                <div className="section-label">Your message</div>
                <textarea
                    value={fMessage}
                    onChange={e => setFMessage(e.target.value)}
                    placeholder="Write from your heart… 🌸 This won't be readable until the reveal date."
                    style={{ marginBottom: 14, minHeight: 110 }}
                />

                <div className="section-label">Reveal date (earliest tomorrow)</div>
                <input type="date" value={fOpenOn} onChange={e => setFOpenOn(e.target.value)} min={minDate} style={{ marginBottom: 16 }} />

                <Button size="full" onClick={save} disabled={saving}>
                    {saving ? 'Sealing…' : '🔒 Seal Capsule'}
                </Button>
            </Modal>
        </div>
    )
}

const S = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
    pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
    hero: {
        background: 'linear-gradient(135deg, var(--mauve-deep) 0%, var(--mauve) 60%, var(--rose-dark) 100%)',
        borderRadius: 22, padding: '24px 20px', textAlign: 'center', color: 'white',
        marginBottom: 18,
    },
    heroIcon: { fontSize: '2.8rem', marginBottom: 8 },
    heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1rem', marginBottom: 4 },
    heroSub: { fontSize: '0.75rem', opacity: 0.75 },
    sectionHead: { fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', color: 'var(--mauve-deep)', fontWeight: 700, marginBottom: 10 },
    capsuleCard: {
        borderRadius: 18, padding: '16px 16px 14px', marginBottom: 12,
        boxShadow: '0 4px 16px rgba(107,63,82,0.1)',
        transition: 'transform 0.2s',
    },
    capsuleTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    capsuleTopLeft: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
    capsuleTitle: { fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 },
    capsuleMeta: { fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 2 },
    countdown: { fontSize: '0.8rem', fontWeight: 600 },
    typeBadge: { borderRadius: 20, padding: '3px 10px', fontSize: '0.65rem', fontWeight: 700 },
    delBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '0.9rem', WebkitTapHighlightColor: 'transparent' },
}
