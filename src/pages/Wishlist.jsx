import React, { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { fsAdd, fsDelete, fsUpdate, fsListen } from '../firebase'
import { WhoContext, ToastContext, RoleContext } from '../App'
import { USER_KISHAN, USER_ADITI } from '../constants'

// Only allow safe URL schemes; returns a sanitised URL or null if rejected.
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:']
function safeUrl(raw) {
    if (!raw) return null
    let href = raw.trim()
    if (!href) return null
    // Prepend https:// if no scheme present
    if (!/^[a-z][a-z0-9+\-.]*:/i.test(href)) href = 'https://' + href
    try {
        const { protocol } = new URL(href)
        return ALLOWED_SCHEMES.includes(protocol) ? href : null
    } catch {
        return null
    }
}

export default function Wishlist() {
    const { who } = useContext(WhoContext)
    const showToast = useContext(ToastContext)
    const { isVisitor } = useContext(RoleContext)

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [link, setLink] = useState('')
    const [price, setPrice] = useState('')
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('all')

    useEffect(() => {
        const unsub = fsListen('wishlist', d => {
            setItems(d)
            setLoading(false)
        })
        return unsub
    }, [])

    const save = async () => {
        if (!name.trim()) return showToast('Enter an item name 🎁')
        setSaving(true)
        const sanitisedLink = link.trim() ? safeUrl(link.trim()) : ''
        if (link.trim() && !sanitisedLink) {
            setSaving(false) // Reset saving state before returning
            return showToast('Please enter a valid http/https link 🔗')
        }
        try {
            await fsAdd('wishlist', {
                who,
                name: name.trim(),
                link: sanitisedLink || '',
                price: price.trim(),
                bought: false,
            })
            setName(''); setLink(''); setPrice('')
            setOpen(false)
            showToast('Added to wishlist! 🎁')
        } catch { showToast('Error saving') }
        setSaving(false)
    }

    const toggleBought = async (item) => {
        try {
            await fsUpdate('wishlist', item.id, { bought: !item.bought })
            if (!item.bought) showToast('Marked as gifted! 🎀')
        } catch { showToast('Error') }
    }

    const del = async (id) => {
        try { await fsDelete('wishlist', id); showToast('Removed') }
        catch { showToast('Error') }
    }

    // Partner is the opposite of the logged-in user
    const partner = who === USER_KISHAN ? USER_ADITI : USER_KISHAN

    const myItems = items.filter(i => i.who === who)
    const partnerItems = items.filter(i => i.who === partner)

    const showItems = activeTab === 'mine' ? myItems
        : activeTab === 'partner' ? partnerItems
            : items

    const pendingCount = items.filter(i => !i.bought).length

    return (
        <div className="page-content">
            <div style={s.header}>
                <div>
                    <div style={s.title}>🎁 Wishlist</div>
                    <div style={s.sub}>{pendingCount} gifts to give · {items.length} total</div>
                </div>
                {!isVisitor && (
                    <Button size="sm" onClick={() => { setName(''); setLink(''); setPrice(''); setOpen(true) }}>
                        + Add
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                {[
                    { key: 'all', label: 'All', icon: '🎁', count: items.length },
                    { key: 'mine', label: 'Mine', icon: who === USER_KISHAN ? '💙' : '🌸', count: myItems.length },
                    { key: 'partner', label: partner, icon: who === USER_KISHAN ? '🌸' : '💙', count: partnerItems.length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span>{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                        <span className="tab-count">{tab.count}</span>
                    </button>
                ))}
            </div>

            {loading ? <div className="loading">🌸</div>
                : showItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🎁</div>
                        <p>No wishlist items yet.<br />Add something you'd love!</p>
                    </div>
                ) : (
                    <div>
                        {showItems.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{ ...s.itemCard, opacity: item.bought ? 0.6 : 1 }}
                            >
                                {/* Bought stamp */}
                                {item.bought && (
                                    <div style={s.boughtStamp}>GIFTED 🎀</div>
                                )}

                                <div style={s.itemTop}>
                                    <div style={s.ownerTag}>
                                        {item.who === USER_KISHAN ? '💙' : '🌸'} {item.who}'s wish
                                    </div>
                                    {!isVisitor && (
                                        <button style={s.delBtn} onClick={() => del(item.id)}>🗑</button>
                                    )}
                                </div>

                                <div style={s.itemName}>{item.name}</div>

                                {item.price && (
                                    <div style={s.itemPrice}>💰 {item.price}</div>
                                )}

                                {(() => {
                                    const url = safeUrl(item.link)
                                    return url ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer" style={s.itemLink}>
                                            🔗 View item
                                        </a>
                                    ) : null
                                })()}

                                {!isVisitor && !item.bought && item.who !== who && (
                                    <button
                                        style={s.giftBtn}
                                        onClick={() => toggleBought(item)}
                                    >
                                        🎀 Mark as Gifted!
                                    </button>
                                )}
                                {!isVisitor && item.bought && (
                                    <button style={s.undoBtn} onClick={() => toggleBought(item)}>
                                        ↩ Undo
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}

            <Modal open={open} onClose={() => setOpen(false)} title="🎁 Add a Wish">
                <div className="section-label">What do you want?</div>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. A cute plushie 🧸"
                    style={{ marginBottom: 10 }}
                />
                <div className="section-label">Approximate price (optional)</div>
                <input
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="e.g. ₹500"
                    style={{ marginBottom: 10 }}
                />
                <div className="section-label">Link (optional)</div>
                <input
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="https://…"
                    style={{ marginBottom: 16 }}
                />
                <Button size="full" onClick={save} disabled={saving}>
                    {saving ? 'Adding…' : 'Add to Wishlist 🎁'}
                </Button>
            </Modal>
        </div>
    )
}

const s = {
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
    sub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },

    itemCard: {
        background: 'white', borderRadius: 18, padding: '16px',
        marginBottom: 12,
        boxShadow: '0 3px 14px var(--shadow)',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'opacity 0.3s',
    },
    boughtStamp: {
        position: 'absolute',
        top: 12, right: 12,
        background: 'linear-gradient(135deg, #e8a0a0, #c97a7a)',
        color: 'white',
        fontSize: '0.65rem',
        fontWeight: 800,
        letterSpacing: 2,
        borderRadius: 20,
        padding: '3px 10px',
        transform: 'rotate(3deg)',
    },
    itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    ownerTag: {
        fontSize: '0.72rem', color: 'var(--mauve)',
        background: 'var(--petal)', padding: '3px 10px',
        borderRadius: 20, fontWeight: 700,
    },
    delBtn: {
        background: 'none', border: 'none', color: '#ccc',
        cursor: 'pointer', fontSize: '0.9rem',
        WebkitTapHighlightColor: 'transparent',
    },
    itemName: {
        fontFamily: "'Playfair Display', serif",
        fontSize: '1rem', color: 'var(--mauve-deep)',
        marginBottom: 6, lineHeight: 1.4,
    },
    itemPrice: { fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: 8 },
    itemLink: {
        display: 'inline-block',
        fontSize: '0.8rem', color: 'var(--mauve)',
        marginBottom: 10,
        textDecoration: 'none',
        fontWeight: 600,
    },
    giftBtn: {
        width: '100%', padding: '10px',
        background: 'linear-gradient(135deg, #4ade80, #22c55e)',
        color: 'white', border: 'none', borderRadius: 14,
        cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700,
        fontFamily: 'Lato, sans-serif',
        WebkitTapHighlightColor: 'transparent',
        transition: 'all 0.2s',
    },
    undoBtn: {
        background: 'none', border: '1px solid var(--border)',
        borderRadius: 14, padding: '8px 14px',
        fontSize: '0.78rem', color: 'var(--text-light)',
        cursor: 'pointer', fontFamily: 'Lato, sans-serif',
        WebkitTapHighlightColor: 'transparent',
    },
}
