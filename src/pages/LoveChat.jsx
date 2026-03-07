import React, { useState, useEffect, useContext, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fsListen, db } from '../firebase'
import {
    collection, addDoc, serverTimestamp, query,
    orderBy, onSnapshot, updateDoc, doc, limit,
    startAfter, getDocs, limitToLast
} from 'firebase/firestore'
import { WhoContext, ToastContext, RoleContext } from '../App'
import { notifyPartner } from '../push'

const REACTIONS = ['💕', '😂', '🥰', '😮', '😢', '🔥']

/* ─── Unread counter helpers ─── */
function getSeenKey(who) { return `ka_chat_seen_${who}` }
export function markChatSeen(who) {
    localStorage.setItem(getSeenKey(who), Date.now().toString())
}
export function getUnreadCount(messages, who) {
    const seen = parseInt(localStorage.getItem(getSeenKey(who)) || '0', 10)
    if (!seen) return messages.length > 0 ? Math.min(messages.length, 99) : 0
    return messages.filter(m => {
        if (m.who === who) return false // my own messages don't count
        if (!m.createdAt) return false
        const ts = m.createdAt.toMillis ? m.createdAt.toMillis() : new Date(m.createdAt).getTime()
        return ts > seen
    }).length
}

function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function formatDateGroup(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0)
    if (msgDay.getTime() === today.getTime()) return 'Today'
    if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const MESSAGES_PER_PAGE = 40

export default function LoveChat() {
    const { who } = useContext(WhoContext)
    const showToast = useContext(ToastContext)
    const { isVisitor } = useContext(RoleContext)

    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [reacting, setReacting] = useState(null)  // message id showing picker
    const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const listRef = useRef(null)

    // Real-time listener — fetch latest 200 messages, display in chronological order
    useEffect(() => {
        const q = query(collection(db, 'love_chat'), orderBy('createdAt', 'desc'), limit(200))
        const unsub = onSnapshot(q, snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            docs.reverse()  // show oldest-first in UI
            setMessages(docs)
        }, err => console.warn('Chat listener error:', err))
        return unsub
    }, [])

    // Mark as seen when chat page is open (and when new messages arrive)
    useEffect(() => {
        markChatSeen(who)
    }, [messages, who])

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const send = async () => {
        const trimmed = text.trim()
        if (!trimmed || sending) return
        if (isVisitor) return showToast('Only Kishan & Aditi can chat 🔒')
        setSending(true)
        setText('')
        try {
            await addDoc(collection(db, 'love_chat'), {
                text: trimmed,
                who,
                createdAt: serverTimestamp(),
                reaction: null,
            })
            notifyPartner(who, {
                title: `💬 ${who}`,
                body: trimmed,
                url: '/chat',
            }).catch(() => { })
        } catch { showToast('Error sending message'); setText(trimmed) }
        setSending(false)
        inputRef.current?.focus()
    }

    const react = async (msgId, emoji) => {
        try { await updateDoc(doc(db, 'love_chat', msgId), { reaction: emoji }) }
        catch { showToast('Could not react') }
        setReacting(null)
    }

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    }

    // Load older messages: preserve scroll position
    const loadOlder = () => {
        const el = listRef.current
        const prevH = el ? el.scrollHeight : 0
        setVisibleCount(c => c + MESSAGES_PER_PAGE)
        // after React re-renders, restore scroll so user doesn't jump
        requestAnimationFrame(() => {
            if (el) el.scrollTop = el.scrollHeight - prevH
        })
    }

    // Group messages by date — show only the last visibleCount
    const visibleMessages = messages.slice(-visibleCount)
    const hasOlder = messages.length > visibleCount
    const grouped = []
    let lastDate = null
    visibleMessages.forEach(m => {
        const dLabel = formatDateGroup(m.createdAt)
        if (dLabel !== lastDate) { grouped.push({ type: 'divider', label: dLabel }); lastDate = dLabel }
        grouped.push({ type: 'msg', ...m })
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)' }}>
            {/* Header */}
            <div style={S.header}>
                <div style={S.pageTitle}>💬 Love Chat</div>
                <div style={S.pageSub}>Your private little inbox 💕</div>
            </div>

            {/* Messages list */}
            <div ref={listRef} style={S.msgList}>
                {/* Load older button */}
                {hasOlder && (
                    <button
                        style={S.loadOlderBtn}
                        onClick={loadOlder}
                    >
                        ⬆ Load older messages ({messages.length - visibleCount} more)
                    </button>
                )}

                {grouped.length === 0 && (
                    <div style={S.empty}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💕</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                            Start the conversation!<br />Say something sweet 🌸
                        </div>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {grouped.map((item, i) => {
                        if (item.type === 'divider') return (
                            <div key={`div-${i}`} style={S.divider}>{item.label}</div>
                        )

                        const isMe = item.who === who
                        const isMsgKishan = item.who === 'Kishan'
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                style={{ ...S.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                            >
                                {/* Avatar – partner side only */}
                                {!isMe && (
                                    <div style={S.avatar}>{isMsgKishan ? '💙' : '🌸'}</div>
                                )}

                                <div style={{ maxWidth: '72%', position: 'relative' }}>
                                    {/* Bubble */}
                                    <div
                                        style={{
                                            ...S.bubble,
                                            background: isMe
                                                ? 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))'
                                                : 'white',
                                            color: isMe ? 'white' : 'var(--text)',
                                            borderBottomRightRadius: isMe ? 4 : 18,
                                            borderBottomLeftRadius: isMe ? 18 : 4,
                                            boxShadow: isMe
                                                ? '0 4px 14px rgba(107,63,82,0.3)'
                                                : '0 3px 10px var(--shadow)',
                                        }}
                                        onDoubleClick={() => !isVisitor && setReacting(reacting === item.id ? null : item.id)}
                                        title="Double-tap to react"
                                    >
                                        {item.text}
                                    </div>

                                    {/* Reaction badge */}
                                    {item.reaction && (
                                        <div style={{ ...S.reactionBadge, [isMe ? 'right' : 'left']: 0 }}>
                                            {item.reaction}
                                        </div>
                                    )}

                                    {/* Reaction picker */}
                                    <AnimatePresence>
                                        {reacting === item.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8, y: 4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.8, y: 4 }}
                                                style={{ ...S.emojiPicker, [isMe ? 'right' : 'left']: 0 }}
                                            >
                                                {REACTIONS.map(em => (
                                                    <button key={em} style={S.emojiBtn} onClick={() => react(item.id, em)}>
                                                        {em}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Timestamp */}
                                    <div style={{ ...S.timestamp, textAlign: isMe ? 'right' : 'left' }}>
                                        {formatTime(item.createdAt)}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            {!isVisitor ? (
                <div style={S.inputBar}>
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Say something sweet… 💕"
                        rows={1}
                        style={S.input}
                    />
                    <motion.button
                        whileTap={{ scale: 0.88 }}
                        style={{ ...S.sendBtn, opacity: text.trim() ? 1 : 0.5 }}
                        onClick={send}
                        disabled={sending || !text.trim()}
                    >
                        {sending ? '…' : '💌'}
                    </motion.button>
                </div>
            ) : (
                <div style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-light)' }}>
                    🔒 Chat is private to Kishan & Aditi
                </div>
            )}
        </div>
    )
}

const S = {
    header: { padding: '14px 16px 6px', flexShrink: 0 },
    pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
    pageSub: { fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 2 },
    msgList: {
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: 6,
        WebkitOverflowScrolling: 'touch',
    },
    empty: { textAlign: 'center', margin: 'auto', padding: '40px 20px' },
    divider: {
        textAlign: 'center', fontSize: '0.66rem', color: 'var(--text-light)',
        textTransform: 'uppercase', letterSpacing: 1,
        padding: '8px 0', userSelect: 'none',
    },
    msgRow: { display: 'flex', alignItems: 'flex-end', gap: 8 },
    avatar: { fontSize: '1.2rem', flexShrink: 0, width: 28, textAlign: 'center', marginBottom: 16 },
    bubble: {
        padding: '10px 14px', borderRadius: 18,
        fontSize: '0.94rem', lineHeight: 1.55,
        wordBreak: 'break-word', cursor: 'default',
        position: 'relative',
    },
    reactionBadge: {
        position: 'absolute', bottom: -10,
        background: 'white', borderRadius: 20,
        padding: '1px 6px', fontSize: '0.85rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    },
    emojiPicker: {
        position: 'absolute', bottom: '110%',
        background: 'white',
        borderRadius: 24, padding: '6px 10px',
        display: 'flex', gap: 6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        zIndex: 200,
    },
    emojiBtn: {
        background: 'none', border: 'none', fontSize: '1.2rem',
        cursor: 'pointer', padding: 4,
        WebkitTapHighlightColor: 'transparent',
    },
    timestamp: { fontSize: '0.6rem', color: 'var(--text-light)', marginTop: 2, padding: '0 2px' },
    inputBar: {
        display: 'flex', alignItems: 'flex-end', gap: 8,
        padding: '10px 12px', flexShrink: 0,
        borderTop: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
    },
    input: {
        flex: 1, border: '1.5px solid var(--border)', borderRadius: 22,
        padding: '10px 16px', fontSize: '0.94rem', resize: 'none',
        fontFamily: 'Lato, sans-serif', outline: 'none', lineHeight: 1.4,
        maxHeight: 100, overflowY: 'auto',
        background: 'var(--blush)',
        color: 'var(--text)',
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: '50%',
        border: 'none', cursor: 'pointer', fontSize: '1.2rem',
        background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        transition: 'opacity 0.2s',
    },
}
