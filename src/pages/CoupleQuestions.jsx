import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '../components/Button'
import { fsAdd, fsListen, fsSet } from '../firebase'
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
]

// Get today's question index (changes daily)
function getTodayIdx() {
    const msPerDay = 86400000
    const epoch = new Date('2025-01-01').getTime()
    return Math.floor((Date.now() - epoch) / msPerDay) % QUESTIONS.length
}

export default function CoupleQuestions() {
    const { who } = useContext(WhoContext)
    const showToast = useContext(ToastContext)
    const { isVisitor } = useContext(RoleContext)

    const todayIdx = getTodayIdx()
    const todayKey = `question_${new Date().toLocaleDateString('en-CA')}`
    const todayQ = QUESTIONS[todayIdx]

    const [myAnswer, setMyAnswer] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [answers, setAnswers] = useState([])
    const [viewingPast, setViewPast] = useState(false)
    const [pastAnswers, setPastAnswers] = useState([])

    // Listen to today's answers
    useEffect(() => {
        const unsub = fsListen('couple_answers', d => {
            const today = d.filter(a => a.questionKey === todayKey)
            setAnswers(today)
            const mine = today.find(a => a.who === who)
            if (mine) { setSubmitted(true); setMyAnswer(mine.answer) }
            setPastAnswers(d.filter(a => a.questionKey !== todayKey))
        })
        return unsub
    }, [todayKey, who])

    const submit = async () => {
        if (!myAnswer.trim()) return showToast('Write an answer first 💕')
        if (isVisitor) return showToast('Only Kishan & Aditi can answer 🔒')
        setSaving(true)
        try {
            await fsSet('couple_answers', `${todayKey}_${who}`, {
                who,
                questionKey: todayKey,
                questionIdx: todayIdx,
                question: todayQ.q,
                answer: myAnswer.trim(),
                date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            })
            setSubmitted(true)
            showToast('Answer saved! 💕')
            notifyPartner(who, {
                title: '💬 New couple question answered!',
                body: `${who} answered today's question — go check theirs!`,
                url: '/questions',
            }).catch(() => { })
        } catch { showToast('Error saving answer') }
        setSaving(false)
    }

    const partnerAnswer = answers.find(a => a.who !== who)

    // Group past answers by date
    const pastGrouped = Object.values(
        pastAnswers.reduce((acc, a) => {
            if (!acc[a.questionKey]) acc[a.questionKey] = { key: a.questionKey, question: a.question, answers: [] }
            acc[a.questionKey].answers.push(a)
            return acc
        }, {})
    ).slice(0, 10)

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

                    {/* Answer input */}
                    {!isVisitor && (
                        <div style={s.answerSection}>
                            <div className="section-label">Your Answer {who === 'Kishan' ? '💙' : '🌸'}</div>
                            <textarea
                                value={myAnswer}
                                onChange={e => { setMyAnswer(e.target.value); setSubmitted(false) }}
                                placeholder="Write your answer… be honest! 😊"
                                style={{ marginBottom: 12 }}
                            />
                            <Button size="full" onClick={submit} disabled={saving}>
                                {saving ? 'Saving…' : submitted ? 'Update Answer ✓' : 'Submit Answer 💕'}
                            </Button>
                        </div>
                    )}

                    {/* Reveal partner's answer */}
                    <AnimatePresence>
                        {submitted && (
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={s.partnerSection}
                            >
                                <div className="section-label">{who === 'Kishan' ? 'Aditi' : 'Kishan'}'s Answer</div>
                                {partnerAnswer ? (
                                    <div style={s.partnerAnswerCard}>
                                        <div style={s.partnerAnswerIcon}>{who === 'Kishan' ? '🌸' : '💙'}</div>
                                        <div style={s.partnerAnswerText}>"{partnerAnswer.answer}"</div>
                                    </div>
                                ) : (
                                    <div style={s.waitingCard}>
                                        <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>⏳</div>
                                        <div style={{ fontSize: '0.88rem', color: 'var(--text-light)' }}>
                                            Waiting for {who === 'Kishan' ? 'Aditi' : 'Kishan'} to answer…
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
                    {pastGrouped.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📚</div>
                            <p>No past answers yet.<br />Answer today's question first!</p>
                        </div>
                    ) : pastGrouped.map((group, i) => (
                        <div key={group.key} style={{ ...s.pastGroup, animationDelay: `${i * 0.05}s` }}>
                            <div style={s.pastQ}>{group.question}</div>
                            {group.answers.map(a => (
                                <div key={a.id} style={s.pastAnswer}>
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
    },

    questionCard: {
        background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
        borderRadius: 22,
        padding: '28px 22px',
        textAlign: 'center',
        color: 'white',
        marginBottom: 20,
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
    pastQ: {
        fontFamily: "'Playfair Display', serif",
        fontSize: '0.9rem', color: 'var(--mauve-deep)',
        fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5,
    },
    pastAnswer: {
        display: 'flex', gap: 10, flexDirection: 'column',
        padding: '8px 0', borderTop: '1px solid var(--border)',
    },
    pastWho: { fontSize: '0.72rem', fontWeight: 700, color: 'var(--mauve)' },
    pastAnswerText: { fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 },
}
