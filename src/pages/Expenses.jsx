import React, { useState, useEffect, useContext, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card, { CardTitle } from '../components/Card'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsDelete, fsListen } from '../firebase'
import { ToastContext, WhoContext, RoleContext } from '../App'

// ── Platform config ──
const PLATFORMS = [
  { key: 'swiggy',    label: 'Swiggy',    icon: '🍕', color: '#fc8019', bg: '#fff5eb' },
  { key: 'zomato',    label: 'Zomato',    icon: '🍽️', color: '#e23744', bg: '#fce8ea' },
  { key: 'zepto',     label: 'Zepto',     icon: '⚡', color: '#7b2ff2', bg: '#f3ebff' },
  { key: 'flipkart',  label: 'Flipkart',  icon: '📦', color: '#2874f0', bg: '#ebf1ff' },
  { key: 'blinkit',   label: 'Blinkit',   icon: '🛒', color: '#f5c518', bg: '#fffbe6' },
  { key: 'amazon',    label: 'Amazon',    icon: '📱', color: '#ff9900', bg: '#fff5e6' },
  { key: 'visit',     label: 'Visit',     icon: '🚆', color: '#00897b', bg: '#e0f2f1' },
  { key: 'movies',    label: 'Movies',    icon: '🎬', color: '#b71c1c', bg: '#fce4ec' },
  { key: 'other',     label: 'Other',     icon: '💳', color: '#6b3f52', bg: '#fdf0f2' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getMonthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(amt) {
  return '₹' + Number(amt).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function getRelativeDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.floor((today - target) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Tabs ──
const TABS = [
  { key: 'log',     icon: '➕', label: 'Log' },
  { key: 'history', icon: '📋', label: 'History' },
  { key: 'summary', icon: '📊', label: 'Summary' },
]

export default function Expenses() {
  const showToast = useContext(ToastContext)
  const { who } = useContext(WhoContext)
  const { isVisitor } = useContext(RoleContext)

  const [activeTab, setActiveTab] = useState('log')
  const [expenses, setExpenses] = useState([])

  // Add form
  const [platform, setPlatform] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(who)
  const [orderedFor, setOrderedFor] = useState(who === 'Kishan' ? 'Aditi' : 'Kishan')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null)

  // Firestore listener
  useEffect(() => {
    const unsub = fsListen('expenses', d => setExpenses(d))
    return () => unsub()
  }, [])

  // ── Calculations ──
  const spending = useMemo(() => {
    let kishanForAditi = 0
    let aditiForKishan = 0
    let total = 0

    expenses.forEach(e => {
      total += (e.amount || 0)
      if (e.paidBy === 'Kishan' && e.orderedFor === 'Aditi') kishanForAditi += (e.amount || 0)
      if (e.paidBy === 'Aditi' && e.orderedFor === 'Kishan') aditiForKishan += (e.amount || 0)
    })

    return { kishanForAditi, aditiForKishan, total }
  }, [expenses])

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const key = e.date ? getMonthKey(e.date) : 'unknown'
      if (!map[key]) map[key] = { total: 0, kishanSpent: 0, aditiSpent: 0, count: 0 }
      map[key].total += (e.amount || 0)
      map[key].count++
      if (e.paidBy === 'Kishan') map[key].kishanSpent += (e.amount || 0)
      else map[key].aditiSpent += (e.amount || 0)
    })
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => {
        const [year, month] = key.split('-')
        return { key, label: `${MONTHS[parseInt(month) - 1]} ${year}`, ...data }
      })
  }, [expenses])

  // Platform breakdown
  const platformData = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const p = e.platform || 'other'
      if (!map[p]) map[p] = { total: 0, count: 0 }
      map[p].total += (e.amount || 0)
      map[p].count++
    })
    return Object.entries(map)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([key, data]) => {
        const platInfo = PLATFORMS.find(p => p.key === key) || PLATFORMS[PLATFORMS.length - 1]
        return { ...platInfo, ...data }
      })
  }, [expenses])

  // ── Save expense ──
  const saveExpense = async () => {
    if (isVisitor) return showToast('Only Kishan & Aditi can do this 🔒')
    if (!platform) return showToast('Select a platform 📱')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return showToast('Enter a valid amount 💸')

    setSaving(true)
    try {
      await fsAdd('expenses', {
        platform,
        amount: amt,
        paidBy,
        orderedFor,
        note: note.trim(),
        date: new Date().toISOString(),
        addedBy: who,
      })
      setPlatform('')
      setAmount('')
      setNote('')
      setPaidBy(who)
      setOrderedFor(who === 'Kishan' ? 'Aditi' : 'Kishan')
      showToast('Expense logged! 💸')
    } catch (err) {
      console.error(err)
      showToast('Error saving expense')
    }
    setSaving(false)
  }

  // ── Delete expense ──
  const handleDelete = async (id) => {
    try {
      await fsDelete('expenses', id)
      showToast('Expense removed 🗑')
      setDeleteId(null)
    } catch {
      showToast('Error deleting')
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>💸 Expenses</div>
          <div style={styles.pageSub}>Track what we spend on each other</div>
        </div>
      </div>

      {/* ── Spending Banner ── */}
      <div style={S.banner}>
        <div style={S.bannerLabel}>Together we've spent</div>
        <div style={S.bannerAmount}>
          {spending.total > 0 ? formatCurrency(spending.total) : '₹0'}
        </div>
        <div style={S.bannerSub}>on each other 💕</div>
        <div style={S.bannerStats}>
          <div style={S.bannerStat}>
            <span style={S.bannerStatIcon}>💙</span>
            <span style={S.bannerStatVal}>{formatCurrency(spending.kishanForAditi)}</span>
            <span style={S.bannerStatLabel}>Kishan spent for Aditi</span>
          </div>
          <div style={S.bannerDivider} />
          <div style={S.bannerStat}>
            <span style={S.bannerStatIcon}>🌸</span>
            <span style={S.bannerStatVal}>{formatCurrency(spending.aditiForKishan)}</span>
            <span style={S.bannerStatLabel}>Aditi spent for Kishan</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tabs-container">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`expense-tab-${tab.key}`}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══ LOG TAB ══ */}
      {activeTab === 'log' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          <Card>
            <CardTitle icon="➕">Log an Expense</CardTitle>

            {/* Platform selector */}
            <div className="section-label">Where did you order?</div>
            <div style={S.platformGrid}>
              {PLATFORMS.map(p => (
                <motion.button
                  key={p.key}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    ...S.platformBtn,
                    background: platform === p.key ? p.bg : 'var(--petal)',
                    borderColor: platform === p.key ? p.color : 'var(--border)',
                    boxShadow: platform === p.key ? `0 4px 14px ${p.color}25` : 'none',
                  }}
                  onClick={() => setPlatform(p.key)}
                >
                  <span style={{ fontSize: '1.5rem' }}>{p.icon}</span>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    color: platform === p.key ? p.color : 'var(--text-light)',
                    textTransform: 'uppercase', letterSpacing: 0.3,
                  }}>{p.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Amount */}
            <div className="section-label" style={{ marginTop: 16 }}>Amount (₹)</div>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 350"
              style={{ marginBottom: 14, fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}
            />

            {/* Paid by / Ordered for */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="section-label">Paid by</div>
                <div style={S.toggleRow}>
                  {['Kishan', 'Aditi'].map(name => (
                    <button
                      key={name}
                      style={{
                        ...S.toggleBtn,
                        ...(paidBy === name ? S.toggleBtnActive : {}),
                      }}
                      onClick={() => {
                        setPaidBy(name)
                        setOrderedFor(name === 'Kishan' ? 'Aditi' : 'Kishan')
                      }}
                    >
                      {name === 'Kishan' ? '💙' : '🌸'} {name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="section-label">For</div>
                <div style={S.toggleRow}>
                  {['Kishan', 'Aditi'].map(name => (
                    <button
                      key={name}
                      style={{
                        ...S.toggleBtn,
                        ...(orderedFor === name ? S.toggleBtnActive : {}),
                      }}
                      onClick={() => setOrderedFor(name)}
                    >
                      {name === 'Kishan' ? '💙' : '🌸'} {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="section-label">Note (optional)</div>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={platform === 'visit' ? 'e.g. Train ticket to Delhi' : 'e.g. Dinner from Biryani Blues'}
              style={{ marginBottom: 16 }}
            />

            {/* Preview */}
            {platform && amount && (
              <div style={S.previewCard}>
                <span style={{ fontSize: '1.3rem' }}>{PLATFORMS.find(p => p.key === platform)?.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={S.previewTitle}>
                    {paidBy === 'Kishan' ? '💙' : '🌸'} {paidBy} spent {formatCurrency(amount)} on {PLATFORMS.find(p => p.key === platform)?.label}
                  </div>
                  <div style={S.previewSub}>
                    For {orderedFor === 'Kishan' ? '💙' : '🌸'} {orderedFor}
                    {note ? ` — ${note}` : ''}
                  </div>
                </div>
              </div>
            )}

            <Button size="full" onClick={saveExpense} disabled={saving}>
              {saving ? 'Saving…' : 'Log Expense 💸'}
            </Button>
          </Card>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {activeTab === 'history' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          <Card>
            <CardTitle icon="📋">Expense History</CardTitle>
            {expenses.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-icon">💸</div>
                <p>No expenses logged yet!<br />Use the Log tab to add your first order.</p>
              </div>
            ) : (
              <div>
                {expenses.map((e, i) => {
                  const platInfo = PLATFORMS.find(p => p.key === e.platform) || PLATFORMS[PLATFORMS.length - 1]
                  const isSelfOrder = e.paidBy === e.orderedFor
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      style={S.historyItem}
                    >
                      <div style={{ ...S.historyIcon, background: platInfo.bg, color: platInfo.color }}>
                        {platInfo.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.historyRow1}>
                          <span style={S.historyPlatform}>{platInfo.label}</span>
                          <span style={S.historyAmount}>{formatCurrency(e.amount)}</span>
                        </div>
                        <div style={S.historyRow2}>
                          {e.paidBy === 'Kishan' ? '💙' : '🌸'} {e.paidBy} → {e.orderedFor === 'Kishan' ? '💙' : '🌸'} {e.orderedFor}
                          {isSelfOrder && <span style={S.selfTag}>self</span>}
                        </div>
                        {e.note && <div style={S.historyNote}>{e.note}</div>}
                        <div style={S.historyDate}>{e.date ? getRelativeDate(e.date) : ''}</div>
                      </div>
                      {!isVisitor && (
                        <button
                          style={S.delBtn}
                          aria-label={`Delete expense`}
                          onClick={() => setDeleteId(e.id)}
                        >🗑</button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══ SUMMARY TAB ══ */}
      {activeTab === 'summary' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          {/* Per-Platform breakdown */}
          <Card>
            <CardTitle icon="📱">By Platform</CardTitle>
            {platformData.length === 0 ? (
              <div className="empty-state" style={{ padding: 16 }}>No data yet</div>
            ) : platformData.map((p, i) => {
              const pct = spending.total > 0 ? Math.round((p.total / spending.total) * 100) : 0
              return (
                <div key={p.key} style={{ ...S.platRow, animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.3rem' }}>{p.icon}</span>
                    <span style={S.platName}>{p.label}</span>
                    <span style={S.platCount}>{p.count} orders</span>
                    <span style={{ ...S.platAmount, marginLeft: 'auto' }}>{formatCurrency(p.total)}</span>
                  </div>
                  <div style={S.barBg}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      style={{ ...S.barFill, background: p.color }}
                    />
                  </div>
                </div>
              )
            })}
          </Card>

          {/* Monthly breakdown */}
          <Card>
            <CardTitle icon="📅">Monthly Breakdown</CardTitle>
            {monthlyData.length === 0 ? (
              <div className="empty-state" style={{ padding: 16 }}>No data yet</div>
            ) : monthlyData.map((m, i) => (
              <div key={m.key} style={{ ...S.monthRow, animationDelay: `${i * 0.05}s` }}>
                <div style={S.monthLabel}>{m.label}</div>
                <div style={S.monthDetails}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{m.count} orders</span>
                  <span style={S.monthTotal}>{formatCurrency(m.total)}</span>
                </div>
                <div style={S.monthSplit}>
                  <span style={S.monthSplitItem}>💙 Kishan: {formatCurrency(m.kishanSpent)}</span>
                  <span style={S.monthSplitItem}>🌸 Aditi: {formatCurrency(m.aditiSpent)}</span>
                </div>
              </div>
            ))}
          </Card>

          {/* Grand total */}
          <Card>
            <div style={S.grandTotal}>
              <div style={S.grandTotalLabel}>Total Spending</div>
              <div style={S.grandTotalAmount}>{formatCurrency(spending.total)}</div>
              <div style={S.grandTotalSub}>{expenses.length} orders across {platformData.length} platforms</div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="🗑 Delete Expense">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: 18, textAlign: 'center', lineHeight: 1.6 }}>
          Are you sure you want to delete this expense? This can't be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button size="full" variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button size="full" variant="danger" onClick={() => handleDelete(deleteId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
}

const S = {
  // Spending banner
  banner: {
    background: 'linear-gradient(135deg, var(--mauve-deep) 0%, var(--mauve) 60%, var(--rose-dark) 100%)',
    borderRadius: 22, padding: '22px 18px',
    textAlign: 'center', color: 'white', marginBottom: 14,
    boxShadow: '0 8px 28px rgba(107,63,82,0.28)',
  },
  bannerLabel: {
    fontSize: '0.68rem', letterSpacing: 2, textTransform: 'uppercase',
    opacity: 0.8, marginBottom: 6,
  },
  bannerAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', fontWeight: 700, lineHeight: 1.1,
    color: '#ffe8d6',
  },
  bannerSub: {
    fontSize: '0.82rem', opacity: 0.85, marginTop: 4, fontWeight: 500,
  },
  bannerStats: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 0, marginTop: 14,
    background: 'rgba(255,255,255,0.12)', borderRadius: 14,
    padding: '12px 16px',
  },
  bannerStat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1,
  },
  bannerStatIcon: { fontSize: '1.1rem' },
  bannerStatVal: { fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700 },
  bannerStatLabel: { fontSize: '0.58rem', opacity: 0.75, lineHeight: 1.2, textAlign: 'center' },
  bannerDivider: { width: 1, height: 40, background: 'rgba(255,255,255,0.25)', margin: '0 14px' },

  // Platform selector
  platformGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4,
  },
  platformBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '12px 6px', border: '2px solid var(--border)',
    borderRadius: 16, cursor: 'pointer',
    transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
    background: 'none',
  },

  // Toggle btns (Paid by / For)
  toggleRow: { display: 'flex', gap: 6 },
  toggleBtn: {
    flex: 1, padding: '10px 8px',
    border: '2px solid var(--border)', borderRadius: 12,
    background: 'var(--petal)', cursor: 'pointer',
    fontSize: '0.78rem', fontWeight: 600,
    fontFamily: 'Lato, sans-serif',
    transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
    color: 'var(--text-light)',
  },
  toggleBtnActive: {
    background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
    borderColor: 'transparent', color: 'white',
  },

  // Preview
  previewCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(135deg, #fdf0f5, #f5e8ee)',
    borderRadius: 14, padding: '12px 14px', marginBottom: 16,
    border: '1px solid var(--border)',
  },
  previewTitle: {
    fontSize: '0.85rem', fontWeight: 700, color: 'var(--mauve-deep)', lineHeight: 1.4,
  },
  previewSub: {
    fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 2,
  },

  // History
  historyItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '14px 0', borderBottom: '1px solid var(--border)',
  },
  historyIcon: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.2rem', flexShrink: 0,
  },
  historyRow1: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  historyPlatform: {
    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)',
  },
  historyAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1rem', fontWeight: 700, color: 'var(--mauve-deep)',
  },
  historyRow2: {
    fontSize: '0.74rem', color: 'var(--text-light)', marginTop: 2,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  selfTag: {
    fontSize: '0.58rem', background: 'var(--blush)', color: 'var(--mauve)',
    padding: '1px 6px', borderRadius: 20, fontWeight: 700,
  },
  historyNote: {
    fontSize: '0.74rem', color: 'var(--mauve)', fontStyle: 'italic', marginTop: 2,
  },
  historyDate: {
    fontSize: '0.65rem', color: '#b89090', marginTop: 3,
  },
  delBtn: {
    background: 'none', border: 'none',
    color: '#ccc', cursor: 'pointer', fontSize: '0.95rem', flexShrink: 0,
    transition: 'color 0.2s', WebkitTapHighlightColor: 'transparent',
    padding: '4px',
  },

  // Platform breakdown
  platRow: {
    padding: '12px 0', borderBottom: '1px solid var(--border)',
    animation: 'fadeUp 0.3s ease both',
  },
  platName: {
    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)',
  },
  platCount: {
    fontSize: '0.65rem', color: 'var(--text-light)',
    background: 'var(--blush)', padding: '2px 8px', borderRadius: 20,
  },
  platAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.95rem', fontWeight: 700, color: 'var(--mauve-deep)',
  },
  barBg: {
    height: 6, background: 'var(--blush)', borderRadius: 3, overflow: 'hidden',
  },
  barFill: {
    height: '100%', borderRadius: 3,
  },

  // Monthly
  monthRow: {
    padding: '14px 0', borderBottom: '1px solid var(--border)',
    animation: 'fadeUp 0.3s ease both',
  },
  monthLabel: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '0.95rem', color: 'var(--mauve-deep)', fontWeight: 700,
  },
  monthDetails: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
  },
  monthTotal: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)',
  },
  monthSplit: {
    display: 'flex', gap: 14, marginTop: 6,
  },
  monthSplitItem: {
    fontSize: '0.74rem', color: 'var(--text-light)',
    background: 'var(--petal)', padding: '3px 10px', borderRadius: 20,
    fontWeight: 600,
  },

  // Grand total
  grandTotal: {
    textAlign: 'center', padding: '8px 0',
  },
  grandTotalLabel: {
    fontSize: '0.68rem', letterSpacing: 2, textTransform: 'uppercase',
    color: 'var(--text-light)', marginBottom: 6,
  },
  grandTotalAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', fontWeight: 700,
    color: 'var(--mauve-deep)', lineHeight: 1.1,
  },
  grandTotalSub: {
    fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 6,
  },
}
