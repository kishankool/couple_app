import React, { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import Card, { CardTitle } from '../components/Card'
import { fsListen } from '../firebase'
import { RoleContext } from '../App'

const MOOD_LABELS = {
    '😍': 'In Love', '🥰': 'Adoring', '😊': 'Happy',
    '🌸': 'Peaceful', '😢': 'Sad', '💭': 'Thoughtful',
    '✨': 'Excited', '💕': 'Romantic', '😄': 'Joyful',
    '🤗': 'Cozy', '😠': 'Frustrated',
}

const POSITIVE_MOODS = new Set(['😍', '🥰', '😊', '🌸', '✨', '💕', '😄', '🤗'])
const NEGATIVE_MOODS = new Set(['😢', '😠'])
const NEUTRAL_MOODS = new Set(['💭'])

function moodSentiment(emoji) {
    if (POSITIVE_MOODS.has(emoji)) return 'positive'
    if (NEGATIVE_MOODS.has(emoji)) return 'negative'
    return 'neutral'
}

function last7Days() {
    const arr = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        arr.push(d.toDateString())
    }
    return arr
}

function last30Days() {
    const arr = []
    for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        arr.push(d.toDateString())
    }
    return arr
}

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function MoodBar({ label, value, max, color, emoji }) {
    const pct = max > 0 ? (value / max) * 100 : 0
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    {emoji} {label}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--mauve-deep)' }}>{value}x</span>
            </div>
            <div style={{ height: 8, borderRadius: 10, background: 'var(--blush)', overflow: 'hidden' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                    style={{ height: '100%', borderRadius: 10, background: color }}
                />
            </div>
        </div>
    )
}

export default function MoodChart() {
    const { isVisitor } = useContext(RoleContext)
    const [moods, setMoods] = useState([])
    const [range, setRange] = useState('7d')  // '7d' | '30d' | 'all'

    useEffect(() => {
        const unsub = fsListen('moods', setMoods)
        return unsub
    }, [])

    if (isVisitor) {
        return (
            <div className="page-content">
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
                    🔒 Mood data is private
                </div>
            </div>
        )
    }

    // Filter by range
    const rangeFilter = (m) => {
        if (range === 'all') return true
        const days = range === '7d' ? 7 : 30
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        try { return new Date(m.date) >= cutoff } catch { return false }
    }

    const filtered = moods.filter(rangeFilter)

    // Per-person split
    const kishanMoods = filtered.filter(m => m.who === 'Kishan')
    const aditiMoods = filtered.filter(m => m.who === 'Aditi')

    // Emoji frequency counts (combined)
    const moodCounts = {}
    filtered.forEach(m => { moodCounts[m.emoji] = (moodCounts[m.emoji] || 0) + 1 })
    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])
    const maxCount = sortedMoods[0]?.[1] || 1

    // Sentiment breakdown
    const sentimentCount = { positive: 0, negative: 0, neutral: 0 }
    filtered.forEach(m => sentimentCount[moodSentiment(m.emoji)]++)
    const totalSentiment = filtered.length || 1
    const sentimentPct = {
        positive: Math.round(sentimentCount.positive / totalSentiment * 100),
        negative: Math.round(sentimentCount.negative / totalSentiment * 100),
        neutral: Math.round(sentimentCount.neutral / totalSentiment * 100),
    }

    // 7-day timeline bar chart data
    const timelineDays = range === '7d' ? last7Days() : last30Days()
    const timelineData = timelineDays.map(dayStr => {
        const dayMoods = filtered.filter(m => {
            try { return new Date(m.date).toDateString() === dayStr } catch { return false }
        })
        const kishanCount = dayMoods.filter(m => m.who === 'Kishan').length
        const aditiCount = dayMoods.filter(m => m.who === 'Aditi').length
        const d = new Date(dayStr)
        return { label: SHORT_DAY[d.getDay()], kishanCount, aditiCount, total: dayMoods.length }
    })
    const maxBarDay = Math.max(1, ...timelineData.map(d => d.total))

    // Most recent mood per person
    const lastKishan = kishanMoods[0]
    const lastAditi = aditiMoods[0]

    // Mood sync (do they feel the same today?)
    const todayStr = new Date().toDateString()
    const todayKishan = moods.filter(m => m.who === 'Kishan' && new Date(m.date).toDateString() === todayStr)
    const todayAditi = moods.filter(m => m.who === 'Aditi' && new Date(m.date).toDateString() === todayStr)
    const lastKishanToday = todayKishan[0]?.emoji
    const lastAditiToday = todayAditi[0]?.emoji
    const inSync = lastKishanToday && lastAditiToday && moodSentiment(lastKishanToday) === moodSentiment(lastAditiToday)

    return (
        <div className="page-content">
            {/* Header */}
            <div style={S.header}>
                <div>
                    <div style={S.pageTitle}>📊 Mood Chart</div>
                    <div style={S.pageSub}>Your emotional journey together</div>
                </div>
            </div>

            {/* Range toggle */}
            <div style={S.rangeRow}>
                {[['7d', '7 Days'], ['30d', '30 Days'], ['all', 'All Time']].map(([k, lbl]) => (
                    <button
                        key={k}
                        style={{ ...S.rangeBtn, ...(range === k ? S.rangeBtnActive : {}) }}
                        onClick={() => setRange(k)}
                    >{lbl}</button>
                ))}
            </div>

            {/* Today's mood sync card */}
            {(lastKishanToday || lastAditiToday) && (
                <div style={{
                    ...S.syncCard,
                    background: inSync
                        ? 'linear-gradient(135deg,#e8f5e9,#d4f0d4)'
                        : 'linear-gradient(135deg,#fde8ef,#f5dde0)',
                    borderColor: inSync ? '#2e7d32' : '#a04060',
                }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: inSync ? '#2e7d32' : '#a04060', fontWeight: 700, marginBottom: 8 }}>
                        {inSync ? '🎉 In Sync Today!' : '💭 Different Vibes Today'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem' }}>{lastKishanToday || '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>💙 Kishan</div>
                        </div>
                        <div style={{ fontSize: '1.2rem', alignSelf: 'center', opacity: 0.4 }}>vs</div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem' }}>{lastAditiToday || '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>🌸 Aditi</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Last logged moods */}
            <div style={S.twoCol}>
                <div style={S.lastMoodCard}>
                    <div style={S.lastWho}>💙 Kishan</div>
                    {lastKishan
                        ? <><div style={S.lastEmoji}>{lastKishan.emoji}</div><div style={S.lastLabel}>{MOOD_LABELS[lastKishan.emoji] || lastKishan.emoji}</div><div style={S.lastTime}>{new Date(lastKishan.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div></>
                        : <div style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: 8 }}>No mood yet</div>
                    }
                </div>
                <div style={S.lastMoodCard}>
                    <div style={S.lastWho}>🌸 Aditi</div>
                    {lastAditi
                        ? <><div style={S.lastEmoji}>{lastAditi.emoji}</div><div style={S.lastLabel}>{MOOD_LABELS[lastAditi.emoji] || lastAditi.emoji}</div><div style={S.lastTime}>{new Date(lastAditi.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div></>
                        : <div style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: 8 }}>No mood yet</div>
                    }
                </div>
            </div>

            {/* Timeline bar chart */}
            {range !== 'all' && (
                <Card>
                    <CardTitle icon="📈">Daily Mood Activity</CardTitle>
                    <div style={S.barChart}>
                        {timelineData.map((day, i) => (
                            <div key={i} style={S.barCol}>
                                <div style={S.barStack}>
                                    {day.kishanCount > 0 && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(day.kishanCount / maxBarDay) * 80}px` }}
                                            transition={{ duration: 0.6, delay: i * 0.04 }}
                                            style={{ ...S.bar, background: 'linear-gradient(to top, var(--mauve-deep), var(--mauve))' }}
                                            title={`Kishan: ${day.kishanCount}`}
                                        />
                                    )}
                                    {day.aditiCount > 0 && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(day.aditiCount / maxBarDay) * 80}px` }}
                                            transition={{ duration: 0.6, delay: i * 0.04 + 0.05 }}
                                            style={{ ...S.bar, background: 'linear-gradient(to top, var(--rose-dark), #f9a8c9)' }}
                                            title={`Aditi: ${day.aditiCount}`}
                                        />
                                    )}
                                </div>
                                <div style={S.barLabel}>{day.label}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8 }}>
                        <span style={S.legend}><span style={{ ...S.legendDot, background: 'var(--mauve-deep)' }} />💙 Kishan</span>
                        <span style={S.legend}><span style={{ ...S.legendDot, background: 'var(--rose-dark)' }} />🌸 Aditi</span>
                    </div>
                </Card>
            )}

            {/* Sentiment gauge */}
            {filtered.length > 0 && (
                <Card>
                    <CardTitle icon="✨">Vibe Check</CardTitle>
                    <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', height: 14, marginBottom: 14 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${sentimentPct.positive}%` }} transition={{ duration: 0.8 }} style={{ background: 'linear-gradient(90deg,#66bb6a,#a5d6a7)', height: '100%' }} />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${sentimentPct.neutral}%` }} transition={{ duration: 0.8, delay: 0.1 }} style={{ background: '#ffe082', height: '100%' }} />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${sentimentPct.negative}%` }} transition={{ duration: 0.8, delay: 0.2 }} style={{ background: 'linear-gradient(90deg,#ef9a9a,#e57373)', height: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        {[
                            { label: 'Happy', pct: sentimentPct.positive, color: '#2e7d32', emoji: '😊' },
                            { label: 'Neutral', pct: sentimentPct.neutral, color: '#f59f00', emoji: '💭' },
                            { label: 'Tough', pct: sentimentPct.negative, color: '#c0392b', emoji: '😢' },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.3rem' }}>{s.emoji}</div>
                                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: s.color }}>{s.pct}%</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-light)', textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Top moods frequency */}
            {sortedMoods.length > 0 && (
                <Card>
                    <CardTitle icon="🌸">Favourite Moods</CardTitle>
                    {sortedMoods.slice(0, 6).map(([emoji, count]) => (
                        <MoodBar
                            key={emoji}
                            emoji={emoji}
                            label={MOOD_LABELS[emoji] || emoji}
                            value={count}
                            max={maxCount}
                            color={
                                moodSentiment(emoji) === 'positive' ? 'linear-gradient(90deg,var(--mauve-deep),var(--mauve))'
                                    : moodSentiment(emoji) === 'negative' ? 'linear-gradient(90deg,#e57373,#ef9a9a)'
                                        : 'linear-gradient(90deg,#ffe082,#fff176)'
                            }
                        />
                    ))}
                </Card>
            )}

            {filtered.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🌸</div>
                    <p>No moods logged yet!<br />Start tracking from the Home page.</p>
                </div>
            )}
        </div>
    )
}

const S = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
    pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
    rangeRow: { display: 'flex', gap: 8, marginBottom: 14 },
    rangeBtn: {
        flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 600,
        border: '1.5px solid var(--border)', background: 'white', color: 'var(--text-light)',
        cursor: 'pointer', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
    },
    rangeBtnActive: {
        background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
        color: 'white', borderColor: 'transparent',
        boxShadow: '0 3px 10px rgba(107,63,82,0.3)',
    },
    syncCard: {
        borderRadius: 18, padding: '16px 18px', marginBottom: 14,
        border: '2px solid', textAlign: 'center',
    },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
    lastMoodCard: {
        background: 'white', borderRadius: 18, padding: '16px 12px',
        textAlign: 'center', boxShadow: '0 3px 14px var(--shadow)',
        border: '1px solid var(--border)',
    },
    lastWho: { fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    lastEmoji: { fontSize: '2.2rem', lineHeight: 1 },
    lastLabel: { fontSize: '0.72rem', color: 'var(--mauve)', marginTop: 4, fontWeight: 600 },
    lastTime: { fontSize: '0.65rem', color: 'var(--text-light)', marginTop: 2 },
    barChart: { display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, padding: '0 4px' },
    barCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
    barStack: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, height: 80, width: '100%', alignItems: 'center' },
    bar: { width: '80%', borderRadius: '4px 4px 0 0', minHeight: 3 },
    barLabel: { fontSize: '0.58rem', color: 'var(--text-light)', marginTop: 4, letterSpacing: 0.5 },
    legend: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-light)' },
    legendDot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
}
