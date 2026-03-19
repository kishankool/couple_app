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
    // ── Memories & Firsts ──
    { q: "What's your favourite memory of us so far?", icon: "💭" },
    { q: "What's the first thing you noticed about me?", icon: "👀" },
    { q: "If you could relive one day we've spent together, which would it be?", icon: "📅" },
    { q: "What moment made you realise you really liked me?", icon: "💘" },
    { q: "What's the funniest thing that's happened between us?", icon: "😂" },
    { q: "What's the most embarrassing moment we've shared?", icon: "🙈" },
    { q: "What's one small moment with us you'll never forget?", icon: "🌟" },
    { q: "What's the best surprise you've ever given me or I've given you?", icon: "🎁" },
    { q: "What was our weirdest first conversation about?", icon: "💬" },
    { q: "When did you first feel completely comfortable around me?", icon: "🤗" },

    // ── Dreams & Future ──
    { q: "What's your dream vacation for us?", icon: "🏖️" },
    { q: "Where do you see us in 5 years?", icon: "🔮" },
    { q: "What's a place you'd love to visit for our anniversary?", icon: "🎊" },
    { q: "If we could live anywhere in the world, where?", icon: "🌍" },
    { q: "What's one thing on your couple bucket list?", icon: "📝" },
    { q: "What kind of house do you imagine us in someday?", icon: "🏡" },
    { q: "Beach or Mountains — for our next trip?", icon: "🌊" },
    { q: "What's a tradition you'd love us to start?", icon: "🕯️" },
    { q: "What's a skill you'd love us to learn together?", icon: "🎨" },
    { q: "If we started a business together, what would it be?", icon: "💡" },

    // ── Love & Feelings ──
    { q: "What's one thing you secretly love about me?", icon: "💕" },
    { q: "What quality of mine do you admire the most?", icon: "🌟" },
    { q: "In one word, describe what I mean to you?", icon: "💌" },
    { q: "What's a little habit of mine you find adorable?", icon: "🌸" },
    { q: "What's one thing I do that always makes you smile?", icon: "😊" },
    { q: "Which of my qualities do you want to absorb for yourself?", icon: "💫" },
    { q: "What's something I said that you still think about?", icon: "🧠" },
    { q: "What makes you feel most loved by me?", icon: "❤️" },
    { q: "What's the best compliment I've ever given you?", icon: "🥰" },
    { q: "How do you know when I'm truly happy?", icon: "😁" },

    // ── Preferences & Opinions ──
    { q: "Would you rather: Candlelight dinner or Stargazing on a rooftop?", icon: "✨" },
    { q: "Morning person or night owl — and do you think we match?", icon: "🌙" },
    { q: "What's your love language and do you think I know it?", icon: "💗" },
    { q: "If I cook dinner tonight, what dish would you request?", icon: "🍳" },
    { q: "What's your comfort food that I should always keep stocked?", icon: "🍕" },
    { q: "Coffee date or late-night drive — which do you prefer?", icon: "☕" },
    { q: "What's a movie we should watch together this week?", icon: "🎬" },
    { q: "What's a show you want to binge-watch with me?", icon: "📺" },
    { q: "Rain and chai or sunshine and ice cream?", icon: "🌧️" },
    { q: "What's the best gift you can think of — under ₹500?", icon: "💳" },

    // ── Music & Entertainment ──
    { q: "One song that always reminds you of me?", icon: "🎵" },
    { q: "What's a song we should make 'our song'?", icon: "🎶" },
    { q: "What movie character reminds you of me?", icon: "🎭" },
    { q: "If our love story was a Bollywood movie, what genre would it be?", icon: "🎥" },
    { q: "What song would play during our slow dance?", icon: "💃" },
    { q: "What's a book, show, or movie that changed your perspective on love?", icon: "📖" },
    { q: "If I were a fictional character, who would I be?", icon: "🦸" },
    { q: "What's a podcast or YouTube channel you think we'd enjoy together?", icon: "🎧" },
    { q: "What's a concert or event you'd love to attend with me?", icon: "🎪" },
    { q: "What's a meme that perfectly describes our relationship?", icon: "😜" },

    // ── Hypotheticals & Fun ──
    { q: "If we could teleport anywhere right now, where would you take me?", icon: "🗺️" },
    { q: "If we had a couple superpower, what would it be?", icon: "🦸" },
    { q: "If we wrote a book about us, what would the title be?", icon: "📖" },
    { q: "If you could swap lives with me for a day, what would you do first?", icon: "🔄" },
    { q: "If we were stranded on an island, what 3 things would you bring?", icon: "🏝️" },
    { q: "If we could time-travel, what era would you take me to?", icon: "⏰" },
    { q: "If you had to describe me to a stranger in 3 words, which words?", icon: "🗣️" },
    { q: "If we won ₹1 crore together, how should we split the spending?", icon: "💰" },
    { q: "If we could have any pet, what would you choose?", icon: "🐾" },
    { q: "If we could only eat one cuisine for the rest of our lives, which one?", icon: "🍜" },

    // ── Deep & Thoughtful ──
    { q: "What's something you've never told me but want to?", icon: "🤫" },
    { q: "What's something you want us to try together?", icon: "🎲" },
    { q: "What does a perfect Sunday with me look like?", icon: "☀️" },
    { q: "What's a fear you trust me enough to share?", icon: "🌑" },
    { q: "What's one way I've helped you grow as a person?", icon: "🌱" },
    { q: "What's a hard moment we got through together that made us stronger?", icon: "💪" },
    { q: "What's one thing about our relationship you'd never change?", icon: "🔒" },
    { q: "What's an argument we had that actually brought us closer?", icon: "🤝" },
    { q: "What do you think is our biggest strength as a couple?", icon: "🏆" },
    { q: "What's a question you're afraid to ask me?", icon: "😶" },

    // ── Daily Life ──
    { q: "What's your favourite thing about how we spend weekends?", icon: "🛋️" },
    { q: "What's a chore you secretly don't mind doing together?", icon: "🧹" },
    { q: "What's the best meal we've ordered on Swiggy/Zomato together?", icon: "🍔" },
    { q: "What's a habit of mine you wish I'd change — just a little?", icon: "😅" },
    { q: "What's the best date night we've ever had?", icon: "🌃" },
    { q: "What's one thing you do for me that you think I don't notice?", icon: "🕵️" },
    { q: "Morning tea/coffee made by me or a lazy sleep-in — your pick?", icon: "🫖" },
    { q: "What's a random act of kindness from me that stuck with you?", icon: "🫶" },
    { q: "What's your favourite way for us to spend a rainy evening?", icon: "🌦️" },
    { q: "What's the most 'us' thing we do?", icon: "👫" },

    // ── Silly & Light ──
    { q: "What's my most predictable behaviour?", icon: "🤔" },
    { q: "What's an inside joke only we understand?", icon: "😁" },
    { q: "If I were a flavour of ice cream, which would I be?", icon: "🍦" },
    { q: "What emoji describes our relationship best?", icon: "📲" },
    { q: "What's the weirdest food combo I like that you judge?", icon: "🤮" },
    { q: "Rate my cooking from 1-10 and explain your score honestly!", icon: "👨‍🍳" },
    { q: "What's a nickname for me that you haven't told me yet?", icon: "🏷️" },
    { q: "What's my most used phrase or word?", icon: "🗨️" },
    { q: "What's the most dramatic thing I've done?", icon: "🎭" },
    { q: "If I were a Hogwarts house, which one?", icon: "🧙" },

    // ── Gratitude & Appreciation ──
    { q: "What's one thing I did recently that meant a lot to you?", icon: "🙏" },
    { q: "What's the nicest text or message I've ever sent you?", icon: "💌" },
    { q: "When do you feel most proud of us?", icon: "😤" },
    { q: "What's something about me that impresses you?", icon: "🤩" },
    { q: "What's a sacrifice I've made for us that you appreciate?", icon: "🫡" },
    { q: "What's your favourite photo of us and why?", icon: "📸" },
    { q: "What part of our daily routine do you look forward to most?", icon: "⏰" },
    { q: "What's something I do that you brag about to your friends?", icon: "📢" },
    { q: "How has our relationship made your life better?", icon: "✨" },
    { q: "If you could replay our first meeting, would you change anything?", icon: "🔁" },

    // ── Growth & Goals ──
    { q: "What's a goal you want us to achieve together this year?", icon: "🎯" },
    { q: "What's an adventure you want us to have before next year?", icon: "🏔️" },
    { q: "What's one thing we should do more of as a couple?", icon: "📈" },
    { q: "What's one thing we should do less of?", icon: "📉" },
    { q: "What's the next milestone you're excited about for us?", icon: "🚀" },
    { q: "If we could take a course or class together, what subject?", icon: "📚" },
    { q: "What's a healthy habit you'd love us to start together?", icon: "🏃" },
    { q: "What's something you want to teach me?", icon: "🎓" },
    { q: "What's something you want me to teach you?", icon: "🤓" },
    { q: "What's the best advice someone gave us about our relationship?", icon: "💬" },

    // ── Bonus / Seasonal ──
    { q: "What's a perfect winter evening with me?", icon: "❄️" },
    { q: "What Diwali gift would make you the happiest?", icon: "🪔" },
    { q: "What should our next birthday surprise for each other be?", icon: "🎂" },
    { q: "What's a road trip route you'd love to take with me?", icon: "🚗" },
    { q: "What's a festival or celebration you want to make extra special with me?", icon: "🎉" },
    { q: "If we could adopt any holiday tradition, which one?", icon: "🎄" },
    { q: "What's a sunrise or sunset spot you want to visit with me?", icon: "🌅" },
    { q: "What's the most romantic thing you can imagine us doing?", icon: "🌹" },
    { q: "What would you write on a love letter to me right now?", icon: "✉️" },
    { q: "What's one thing you want to say to future-us?", icon: "🔭" },
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
