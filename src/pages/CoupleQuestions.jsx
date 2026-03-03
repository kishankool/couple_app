import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/Button'
import { db } from '../firebase'
import {
    doc, setDoc, collection, query, onSnapshot, serverTimestamp, orderBy, limit,
} from 'firebase/firestore'
import { WhoContext, ToastContext, RoleContext } from '../App'
import { notifyPartner } from '../push'

const QUESTIONS = [
    { q: "If we could teleport anywhere right now, where would you take me?", icon: "🗺️" },
    { q: "What's your favourite memory of us so far?", icon: "💭" },
    { q: "One song that always reminds you of me?", icon: "🎵" },
    { q: "Would you rather: Candlelight dinner or Stargazing on a rooftop?", icon: "✨" },
    { q: "What's one thing you secretly love about me?", icon: "💕" },
    { q: "If you could relive one day we've spent together, which would it be?", icon: "📅" },
    { q: "What's your dream vacation for us?", icon: "🏖️" },
    { q: "What quality of mine do you admire the most?", icon: "🌟" },
    { q: "Beach or Mountains — for our next trip?", icon: "🌊" },
    { q: "What's something you want us to try together?", icon: "🎲" },
    { q: "What does a perfect Sunday with me look like?", icon: "☀️" },
    { q: "In one word, describe what I mean to you?", icon: "💌" },
    { q: "Morning person or night owl — and do you think we match?", icon: "🌙" },
    { q: "What's one thing I do that always makes you smile?", icon: "😊" },
    { q: "If we had a couple superpower, what would it be?", icon: "🦸" },
    { q: "What's a little habit of mine you find adorable?", icon: "🌸" },
    { q: "What's the first thing you noticed about me?", icon: "👀" },
    { q: "What's a place you'd love to visit for our anniversary?", icon: "🎊" },
    { q: "Which of my qualities do you want to absorb for yourself?", icon: "💫" },
    { q: "If we wrote a book about us, what would the title be?", icon: "📖" },
]

const ALLOWED_WHO = new Set(['Kishan', 'Aditi'])

// Derive today's index from the same local-date basis as getTodayKey()
// so the question shown always matches the document key used for storage.
function getTodayIdx() {
    const todayKey = getTodayKey() // YYYY-MM-DD local
    const epoch = '2025-01-01'
    // Days between epoch and today, both in local time
    const msPerDay = 86400000
    const diffMs = new Date(todayKey + 'T00:00:00').getTime() - new Date(epoch + 'T00:00:00').getTime()
    return Math.floor(diffMs / msPerDay) % QUESTIONS.length
}

function getTodayKey() {
    return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local
}

export default function CoupleQuestions() {
    const { who } = useContext(WhoContext)
    const showToast = useContext(ToastContext)
    const { isVisitor } = useContext(RoleContext)

    const todayIdx = getTodayIdx()
    const todayKey = getTodayKey()
    const todayQ = QUESTIONS[todayIdx]

    const [myAnswer, setMyAnswer] = useState('')
    const [savedAnswer, setSavedAnswer] = useState('') // what's persisted in Firestore
    const [submitted, setSubmitted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [partnerAnswer, setPartnerAnswer] = useState(null)
    const [viewingPast, setViewPast] = useState(false)
    const [pastGroups, setPastGroups] = useState([])

    // ── Real-time listener on the couple_answers/<todayKey> doc ──
    // Structure: { Kishan: { answer, date }, Aditi: { answer, date } }
    useEffect(() => {
        // Clear draft on identity/day change (prevents Kishan's text leaking to Aditi)
        setMyAnswer('')

        // Today's answers
        const todayRef = doc(db, 'couple_answers', todayKey)
        const unsubToday = onSnapshot(todayRef, snap => {
            const data = snap.exists() ? snap.data() : {}

            // Guard: only proceed with known identities
            if (!ALLOWED_WHO.has(who)) {
                console.warn('CoupleQuestions: unexpected who value:', who)
                return
            }

            const mine = data[who]
            const partner = data[who === 'Kishan' ? 'Aditi' : 'Kishan']
            if (mine?.answer) {
                setSavedAnswer(mine.answer)
                setSubmitted(true)
                // Pre-fill textarea only on first load (don't overwrite edits)
                setMyAnswer(prev => prev || mine.answer)
            } else {
                // No answer from me yet — reset stale state
                setSavedAnswer('')
                setSubmitted(false)
            }
            setPartnerAnswer(partner?.answer || null)
        }, err => {
            console.warn('couple_answers today listener error:', err)
        })

        // Past answers — bounded query: 20 most-recently-updated docs, client-side filter today
        const pastQ = query(
            collection(db, 'couple_answers'),
            orderBy('updatedAt', 'desc'),
            limit(20)
        )
        const unsubPast = onSnapshot(pastQ, snap => {
            const groups = []
            snap.docs.forEach(d => {
                if (d.id === todayKey) return // skip today
                const data = d.data()
                // Only include days that have at least one answer
                const answers = []
                if (data.Kishan?.answer) answers.push({ who: 'Kishan', answer: data.Kishan.answer, date: data.Kishan.date })
                if (data.Aditi?.answer) answers.push({ who: 'Aditi', answer: data.Aditi.answer, date: data.Aditi.date })
                if (answers.length > 0 && data.question) {
                    groups.push({ key: d.id, question: data.question, icon: data.icon || '💬', answers })
                }
            })
            // Sort by date descending (most recent first)
            groups.sort((a, b) => b.key.localeCompare(a.key))
            setPastGroups(groups.slice(0, 15))
        }, err => {
            console.warn('couple_answers past listener error:', err)
        })

        return () => { unsubToday(); unsubPast() }
    }, [todayKey, who])

    const submit = async () => {
        const trimmed = myAnswer.trim()
        if (!trimmed) return showToast('Write an answer first 💕')
        if (isVisitor) return showToast('Only Kishan & Aditi can answer 🔒')
        if (!ALLOWED_WHO.has(who)) return showToast('Unknown user — please reload')
        if (trimmed === savedAnswer) return showToast('No changes to save ✓')
        setSaving(true)
        try {
            const ref = doc(db, 'couple_answers', todayKey)
            await setDoc(ref, {
                question: todayQ.q,
                icon: todayQ.icon,
                questionIdx: todayIdx,
                [who]: {
                    answer: trimmed,
                    date: new Date().toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    }),
                },
                updatedAt: serverTimestamp(),
            }, { merge: true })
            setSavedAnswer(trimmed)
            setSubmitted(true)
            showToast(savedAnswer ? 'Answer updated! ✓' : 'Answer saved! 💕')
            notifyPartner(who, {
                title: '💬 Couple question answered!',
                body: `${who} answered today's question — go check theirs!`,
                url: '/questions',
            }).catch(() => { })
        } catch (err) {
            console.error('Failed to save answer:', err)
            showToast('Error saving answer — try again')
        }
        setSaving(false)
    }

    const partner = who === 'Kishan' ? 'Aditi' : 'Kishan'
    const hasEdited = myAnswer.trim() !== savedAnswer

    return (
        <div className="page-content">
            <div style={s.header}>
                <div>
                    <div style={s.title}>💬 Couple Questions</div>
                    <div style={s.sub}>A new question every day</div>
                </div>
                <button style={s.historyBtn} onClick={() => setViewPast(v => !v)}>
                    {viewingPast ? '← Today' : 'History 📚'}
                </button>
            </div>

            {!viewingPast ? (
                <>
                    {/* Today's Question Card */}
                    <div style={s.questionCard}>
                        <div style={s.qIcon}>{todayQ.icon}</div>
                        <div style={s.qDate}>Today's Question</div>
                        <div style={s.qText}>{todayQ.q}</div>
                    </div>

                    {/* Status pills */}
                    <div style={s.statusRow}>
                        <div style={{ ...s.pill, background: submitted ? '#e8f5e9' : '#fdf0f5', color: submitted ? '#2e7d32' : 'var(--mauve)' }}>
                            {who === 'Kishan' ? '💙' : '🌸'} {who}: {submitted ? 'Answered ✓' : 'Not answered'}
                        </div>
                        <div style={{ ...s.pill, background: partnerAnswer ? '#e8f5e9' : '#fdf0f5', color: partnerAnswer ? '#2e7d32' : 'var(--mauve)' }}>
                            {who === 'Kishan' ? '🌸' : '💙'} {partner}: {partnerAnswer ? 'Answered ✓' : 'Waiting…'}
                        </div>
                    </div>

                    {/* Answer input */}
                    {!isVisitor && (
                        <div style={s.answerSection}>
                            <div className="section-label">Your Answer {who === 'Kishan' ? '💙' : '🌸'}</div>
                            <textarea
                                value={myAnswer}
                                onChange={e => setMyAnswer(e.target.value)}
                                placeholder="Write your answer… be honest! 😊"
                                style={{ marginBottom: 12 }}
                            />
                            <Button
                                size="full"
                                onClick={submit}
                                disabled={saving || !myAnswer.trim() || (!hasEdited && submitted)}
                            >
                                {saving ? 'Saving…'
                                    : !hasEdited && submitted ? 'Saved ✓'
                                        : submitted ? 'Update Answer ✏️'
                                            : 'Submit Answer 💕'}
                            </Button>
                        </div>
                    )}

                    {/* Reveal partner's answer — only after you've answered */}
                    <AnimatePresence>
                        {submitted && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={s.partnerSection}
                            >
                                <div className="section-label">{partner}'s Answer</div>
                                {partnerAnswer ? (
                                    <div style={s.partnerAnswerCard}>
                                        <div style={s.partnerAnswerIcon}>{who === 'Kishan' ? '🌸' : '💙'}</div>
                                        <div style={s.partnerAnswerText}>"{partnerAnswer}"</div>
                                    </div>
                                ) : (
                                    <div style={s.waitingCard}>
                                        <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>⏳</div>
                                        <div style={{ fontSize: '0.88rem', color: 'var(--text-light)' }}>
                                            Waiting for {partner} to answer…
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                /* Past Answers */
                <div>
                    {pastGroups.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📚</div>
                            <p>No past answers yet.<br />Answer today's question first!</p>
                        </div>
                    ) : pastGroups.map((group, i) => (
                        <div key={group.key} style={{ ...s.pastGroup, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
                            <div style={s.pastMeta}>{group.icon} {group.key}</div>
                            <div style={s.pastQ}>{group.question}</div>
                            {group.answers.map(a => (
                                <div key={a.who} style={s.pastAnswer}>
                                    <span style={s.pastWho}>{a.who === 'Kishan' ? '💙' : '🌸'} {a.who}</span>
                                    <span style={s.pastAnswerText}>{a.answer}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const s = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
    sub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
    historyBtn: {
        background: 'var(--petal)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '6px 14px',
        fontSize: '0.78rem', color: 'var(--mauve)', cursor: 'pointer',
        fontFamily: 'Lato, sans-serif',
        WebkitTapHighlightColor: 'transparent',
        transition: 'all 0.2s',
    },

    questionCard: {
        background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
        borderRadius: 22,
        padding: '28px 22px',
        textAlign: 'center',
        color: 'white',
        marginBottom: 14,
        boxShadow: '0 8px 32px rgba(107,63,82,0.3)',
    },
    qIcon: { fontSize: '2.5rem', marginBottom: 10 },
    qDate: { fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 12 },
    qText: {
        fontFamily: "'Playfair Display', serif",
        fontSize: 'clamp(0.95rem, 3vw, 1.15rem)',
        lineHeight: 1.6,
        fontStyle: 'italic',
    },

    statusRow: {
        display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
    },
    pill: {
        flex: 1, minWidth: 120,
        borderRadius: 20, padding: '7px 14px',
        fontSize: '0.76rem', fontWeight: 700,
        textAlign: 'center',
        border: '1px solid rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
    },

    answerSection: { marginBottom: 20 },

    partnerSection: { marginTop: 4 },
    partnerAnswerCard: {
        background: 'linear-gradient(135deg, #fff0f5, #fde8ef)',
        border: '2px solid var(--rose)',
        borderRadius: 18,
        padding: '20px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
    },
    partnerAnswerIcon: { fontSize: '1.8rem', flexShrink: 0 },
    partnerAnswerText: {
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: '0.94rem',
        color: 'var(--mauve-deep)',
        lineHeight: 1.7,
        flex: 1,
    },
    waitingCard: {
        background: 'var(--petal)', borderRadius: 18,
        padding: '24px', textAlign: 'center',
        border: '1px solid var(--border)',
    },

    pastGroup: {
        background: 'white', borderRadius: 16,
        padding: '16px', marginBottom: 12,
        boxShadow: '0 3px 12px var(--shadow)',
        border: '1px solid var(--border)',
        animation: 'fadeUp 0.3s ease both',
    },
    pastMeta: {
        fontSize: '0.65rem', color: 'var(--text-light)',
        textTransform: 'uppercase', letterSpacing: 1,
        marginBottom: 6,
    },
    pastQ: {
        fontFamily: "'Playfair Display', serif",
        fontSize: '0.9rem', color: 'var(--mauve-deep)',
        fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5,
    },
    pastAnswer: {
        display: 'flex', gap: 10, flexDirection: 'column',
        padding: '10px 0', borderTop: '1px solid var(--border)',
    },
    pastWho: { fontSize: '0.72rem', fontWeight: 700, color: 'var(--mauve)' },
    pastAnswerText: { fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 },
}
