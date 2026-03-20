import React, { useState, useEffect, useContext, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Card, { CardTitle } from '../components/Card'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { fsAdd, fsListen } from '../firebase'
import { ToastContext, WhoContext, RoleContext } from '../App'

// ── Tabs ──
const TABS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'history',   icon: '📋', label: 'History' },
  { key: 'settings',  icon: '⚙️', label: 'Settings' },
]

function formatCurrency(amt) {
  return '₹' + Number(amt).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function getStatusInfo(status) {
  switch (status) {
    case 'active':
      return { label: 'Active', color: '#27ae60', bg: '#e8f8f0', icon: '✅' }
    case 'authenticated':
      return { label: 'Authenticated', color: '#2980b9', bg: '#ebf5fb', icon: '🔐' }
    case 'pending':
      return { label: 'Pending', color: '#f39c12', bg: '#fef9e7', icon: '⏳' }
    case 'created':
      return { label: 'Created', color: '#8e44ad', bg: '#f5eef8', icon: '🆕' }
    case 'halted':
      return { label: 'Paused', color: '#e67e22', bg: '#fef5e7', icon: '⏸️' }
    case 'cancelled':
      return { label: 'Cancelled', color: '#e74c3c', bg: '#fdedec', icon: '❌' }
    case 'completed':
      return { label: 'Completed', color: '#27ae60', bg: '#e8f8f0', icon: '🎉' }
    case 'expired':
      return { label: 'Expired', color: '#95a5a6', bg: '#f2f3f4', icon: '⌛' }
    default:
      return { label: status || 'Unknown', color: '#7f8c8d', bg: '#f2f3f4', icon: '❓' }
  }
}

function getSessionToken() {
  return sessionStorage.getItem('ka_session_token') || ''
}

export default function Savings() {
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const { isVisitor } = useContext(RoleContext)

  const [tab, setTab] = useState('dashboard')
  const [mandates, setMandates] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showConfirmCreate, setShowConfirmCreate] = useState(false)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [mandateStatus, setMandateStatus] = useState(null)
  const [fetchingStatus, setFetchingStatus] = useState(false)

  // Listen to mandates stored in Firestore
  useEffect(() => {
    if (isVisitor) return
    const unsub = fsListen('savings_mandates', data => {
      setMandates(data)
      setLoading(false)
    })
    return unsub
  }, [isVisitor])

  // Listen to payment history
  useEffect(() => {
    if (isVisitor) return
    const unsub = fsListen('savings_payments', data => {
      setPayments(data.sort((a, b) => new Date(b.date) - new Date(a.date)))
    })
    return unsub
  }, [isVisitor])

  // Get the active mandate for the current user
  const myMandate = useMemo(() => {
    return mandates.find(m => m.who === who && m.status !== 'cancelled' && m.status !== 'expired')
  }, [mandates, who])

  // Compute stats
  const stats = useMemo(() => {
    const myPayments = payments.filter(p => p.who === who && p.status === 'paid')
    const totalSaved = myPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const daysSaving = myPayments.length
    const partnerPayments = payments.filter(p => p.who !== who && p.status === 'paid')
    const partnerSaved = partnerPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    return { totalSaved, daysSaving, partnerSaved, partnerDays: partnerPayments.length }
  }, [payments, who])

  // Fetch live status from Razorpay
  const fetchLiveStatus = async (subscriptionId) => {
    if (!subscriptionId) return
    setFetchingStatus(true)
    try {
      const res = await fetch('/api/razorpay-mandate-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': getSessionToken(),
        },
        body: JSON.stringify({ subscriptionId }),
      })
      const data = await res.json()
      if (data.ok) {
        setMandateStatus(data.subscription)
      } else {
        showToast('Could not fetch status')
      }
    } catch {
      showToast('Network error')
    }
    setFetchingStatus(false)
  }

  // Fetch status on mount if mandate exists
  useEffect(() => {
    if (myMandate?.subscriptionId) {
      fetchLiveStatus(myMandate.subscriptionId)
    }
  }, [myMandate?.subscriptionId])

  // Create mandate
  const handleCreate = async () => {
    if (isVisitor) return showToast('Only Kishan & Aditi can do this 🔒')
    setShowConfirmCreate(false)
    setCreating(true)
    try {
      const res = await fetch('/api/razorpay-create-mandate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': getSessionToken(),
        },
        body: JSON.stringify({ who, amount: 5000 }),
      })
      const data = await res.json()
      if (data.ok) {
        // Store mandate info in Firestore
        await fsAdd('savings_mandates', {
          who,
          subscriptionId: data.subscriptionId,
          shortUrl: data.shortUrl,
          status: data.status || 'created',
          planId: data.planId,
          amount: 50,
          createdDate: new Date().toISOString(),
        })
        showToast('Mandate created! Complete setup via UPI 🎉')
        // Open the Razorpay payment link
        if (data.shortUrl) {
          window.open(data.shortUrl, '_blank')
        }
      } else {
        showToast(data.error || 'Failed to create mandate')
      }
    } catch {
      showToast('Network error — try again')
    }
    setCreating(false)
  }

  // Cancel mandate
  const handleCancel = async () => {
    if (!myMandate?.subscriptionId) return
    setShowConfirmCancel(false)
    setCancelling(true)
    try {
      const res = await fetch('/api/razorpay-cancel-mandate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': getSessionToken(),
        },
        body: JSON.stringify({ subscriptionId: myMandate.subscriptionId }),
      })
      const data = await res.json()
      if (data.ok) {
        // Update Firestore — we'll just add a new record with the cancelled status
        await fsAdd('savings_mandates', {
          who,
          subscriptionId: myMandate.subscriptionId,
          status: 'cancelled',
          cancelledDate: new Date().toISOString(),
        })
        showToast('Mandate cancelled ❌')
        setMandateStatus(null)
      } else {
        showToast(data.error || 'Failed to cancel')
      }
    } catch {
      showToast('Network error — try again')
    }
    setCancelling(false)
  }

  if (isVisitor) {
    return (
      <div className="page-content">
        <Card>
          <div style={styles.visitorMsg}>
            🔒 Savings SIP is a private feature for Kishan & Aditi
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerDecor}>💰 ✨ 🏦</div>
        <div style={styles.headerTitle}>Daily Savings SIP</div>
        <div style={styles.headerSub}>₹50/day autopay · Save together 💕</div>
      </div>

      {/* ── Tabs ── */}
      <div style={styles.tabRow}>
        {TABS.map(t => (
          <button
            key={t.key}
            style={{
              ...styles.tabBtn,
              ...(tab === t.key ? styles.tabActive : {}),
            }}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span>
            <span style={styles.tabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ════════ Dashboard ════════ */}
        {tab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {/* Savings Stats */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={{ fontSize: '1.4rem' }}>💰</span>
                <span style={styles.statNum}>{formatCurrency(stats.totalSaved)}</span>
                <span style={styles.statLabel}>Your Savings</span>
              </div>
              <div style={styles.statCard}>
                <span style={{ fontSize: '1.4rem' }}>📅</span>
                <span style={styles.statNum}>{stats.daysSaving}</span>
                <span style={styles.statLabel}>Days Saved</span>
              </div>
              <div style={styles.statCard}>
                <span style={{ fontSize: '1.4rem' }}>💕</span>
                <span style={styles.statNum}>{formatCurrency(stats.totalSaved + stats.partnerSaved)}</span>
                <span style={styles.statLabel}>Together</span>
              </div>
            </div>

            {/* Mandate Status */}
            <Card>
              <CardTitle icon="🏦">Mandate Status</CardTitle>
              {loading ? (
                <div style={styles.loadingMsg}>Loading...</div>
              ) : myMandate ? (
                <div>
                  {/* Status Badge */}
                  {(() => {
                    const status = mandateStatus?.status || myMandate.status
                    const info = getStatusInfo(status)
                    return (
                      <div style={{ ...styles.statusBadge, background: info.bg, color: info.color }}>
                        <span>{info.icon}</span>
                        <span style={{ fontWeight: 700 }}>{info.label}</span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                          · ₹{myMandate.amount || 50}/day
                        </span>
                      </div>
                    )
                  })()}

                  {/* Subscription Details */}
                  <div style={styles.detailGrid}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Started</span>
                      <span style={styles.detailValue}>{formatDate(myMandate.createdDate)}</span>
                    </div>
                    {mandateStatus?.paidCount != null && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Paid</span>
                        <span style={styles.detailValue}>{mandateStatus.paidCount} / {mandateStatus.totalCount}</span>
                      </div>
                    )}
                    {mandateStatus?.currentEnd && (
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Next Payment</span>
                        <span style={styles.detailValue}>{formatDate(mandateStatus.currentEnd)}</span>
                      </div>
                    )}
                  </div>

                  {/* Complete setup link (if not active yet) */}
                  {(myMandate.status === 'created' || myMandate.status === 'pending') && myMandate.shortUrl && (
                    <div style={{ marginTop: 12 }}>
                      <Button
                        onClick={() => window.open(myMandate.shortUrl, '_blank')}
                        style={{ width: '100%' }}
                      >
                        🔗 Complete UPI Setup
                      </Button>
                    </div>
                  )}

                  {/* Refresh status */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => fetchLiveStatus(myMandate.subscriptionId)}
                      disabled={fetchingStatus}
                      style={{ flex: 1, fontSize: '0.78rem' }}
                    >
                      {fetchingStatus ? '⏳ Checking...' : '🔄 Refresh Status'}
                    </Button>
                    {myMandate.status !== 'cancelled' && (
                      <Button
                        variant="danger"
                        onClick={() => setShowConfirmCancel(true)}
                        disabled={cancelling}
                        style={{ fontSize: '0.78rem' }}
                      >
                        ❌ Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* No mandate — show create UI */
                <div style={styles.emptyState}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🐷</div>
                  <div style={styles.emptyTitle}>Start Your Daily SIP</div>
                  <div style={styles.emptyDesc}>
                    Set up a ₹50/day UPI Autopay mandate and build your savings together!
                  </div>
                  <div style={styles.featureList}>
                    <div style={styles.featureItem}>✅ Auto-debit ₹50 daily via UPI</div>
                    <div style={styles.featureItem}>📊 Track savings growth together</div>
                    <div style={styles.featureItem}>🔒 Secure Razorpay-powered payments</div>
                    <div style={styles.featureItem}>❌ Cancel anytime with one tap</div>
                  </div>
                  <Button
                    onClick={() => setShowConfirmCreate(true)}
                    disabled={creating}
                    style={{ width: '100%', marginTop: 16 }}
                  >
                    {creating ? '⏳ Setting up...' : '🚀 Start ₹50/day SIP'}
                  </Button>
                </div>
              )}
            </Card>

            {/* Partner Status */}
            {(() => {
              const partner = who === 'Kishan' ? 'Aditi' : 'Kishan'
              const partnerMandate = mandates.find(m => m.who === partner && m.status !== 'cancelled' && m.status !== 'expired')
              if (!partnerMandate) return null
              const info = getStatusInfo(partnerMandate.status)
              return (
                <Card>
                  <CardTitle icon={who === 'Kishan' ? '🌸' : '💙'}>{partner}'s SIP</CardTitle>
                  <div style={{ ...styles.statusBadge, background: info.bg, color: info.color }}>
                    <span>{info.icon}</span>
                    <span style={{ fontWeight: 700 }}>{info.label}</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                      · ₹{partnerMandate.amount || 50}/day
                    </span>
                  </div>
                  <div style={styles.partnerStat}>
                    Saved {formatCurrency(stats.partnerSaved)} over {stats.partnerDays} days 🎉
                  </div>
                </Card>
              )
            })()}
          </motion.div>
        )}

        {/* ════════ History ════════ */}
        {tab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <Card>
              <CardTitle icon="📋">Payment History</CardTitle>
              {payments.length === 0 ? (
                <div style={styles.emptyHistory}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📭</div>
                  <div style={styles.emptyTitle}>No payments yet</div>
                  <div style={styles.emptyDesc}>Payments will appear here once your SIP is active.</div>
                </div>
              ) : (
                <div style={styles.historyList}>
                  {payments.slice(0, 50).map((p, i) => (
                    <div key={p.id || i} style={styles.historyItem}>
                      <div style={styles.historyLeft}>
                        <span style={{
                          ...styles.historyIcon,
                          background: p.status === 'paid' ? '#e8f8f0' : '#fdedec',
                          color: p.status === 'paid' ? '#27ae60' : '#e74c3c',
                        }}>
                          {p.status === 'paid' ? '✅' : '❌'}
                        </span>
                        <div>
                          <div style={styles.historyWho}>
                            {p.who === 'Kishan' ? '💙' : '🌸'} {p.who}
                          </div>
                          <div style={styles.historyDate}>
                            {formatDate(p.date)} · {formatTime(p.date)}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        ...styles.historyAmount,
                        color: p.status === 'paid' ? '#27ae60' : '#e74c3c',
                      }}>
                        {p.status === 'paid' ? '+' : ''}{formatCurrency(p.amount || 50)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ════════ Settings ════════ */}
        {tab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <Card>
              <CardTitle icon="⚙️">SIP Settings</CardTitle>
              <div style={styles.settingsInfo}>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Daily Amount</span>
                  <span style={styles.settingValue}>₹50</span>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Frequency</span>
                  <span style={styles.settingValue}>Daily</span>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Duration</span>
                  <span style={styles.settingValue}>365 days (1 year)</span>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Payment Method</span>
                  <span style={styles.settingValue}>UPI Autopay</span>
                </div>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>Gateway</span>
                  <span style={styles.settingValue}>Razorpay</span>
                </div>
              </div>

              <div style={styles.disclaimer}>
                <strong>💡 How it works:</strong>
                <ul style={styles.disclaimerList}>
                  <li>₹50 is auto-debited daily from your UPI-linked bank account</li>
                  <li>The money settles into your Razorpay-linked bank account</li>
                  <li>This is NOT a mutual fund — it's a disciplined savings mechanism</li>
                  <li>You can cancel anytime from the Dashboard tab</li>
                </ul>
              </div>
            </Card>

            {/* Danger zone */}
            {myMandate && myMandate.status !== 'cancelled' && (
              <Card>
                <CardTitle icon="⚠️">Danger Zone</CardTitle>
                <div style={styles.dangerInfo}>
                  Cancelling your SIP mandate will stop all future auto-debits immediately.
                  This action cannot be undone.
                </div>
                <Button
                  variant="danger"
                  onClick={() => setShowConfirmCancel(true)}
                  disabled={cancelling}
                  style={{ width: '100%', marginTop: 12 }}
                >
                  {cancelling ? '⏳ Cancelling...' : '❌ Cancel My SIP Mandate'}
                </Button>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm Create Modal ── */}
      <Modal
        open={showConfirmCreate}
        onClose={() => setShowConfirmCreate(false)}
        title="Start Daily SIP? 🐷"
      >
        <div style={styles.modalContent}>
          <p style={styles.modalText}>
            You're about to set up a <strong>₹50/day UPI Autopay</strong> mandate.
          </p>
          <div style={styles.modalHighlight}>
            <div>💰 <strong>₹50</strong> will be auto-debited daily</div>
            <div>📅 Duration: <strong>365 days</strong></div>
            <div>💵 Total: <strong>₹18,250</strong> over 1 year</div>
          </div>
          <p style={styles.modalText}>
            You'll be redirected to complete UPI authorization via Razorpay.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmCreate(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              style={{ flex: 1 }}
            >
              {creating ? '⏳ Creating...' : '🚀 Start SIP'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Cancel Modal ── */}
      <Modal
        open={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        title="Cancel SIP? 😢"
      >
        <div style={styles.modalContent}>
          <p style={styles.modalText}>
            Are you sure you want to cancel your daily savings mandate?
          </p>
          <p style={{ ...styles.modalText, color: '#e74c3c' }}>
            This will stop all future auto-debits immediately.
            Previously saved amounts are not affected.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmCancel(false)}
              style={{ flex: 1 }}
            >
              Keep SIP
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={cancelling}
              style={{ flex: 1 }}
            >
              {cancelling ? '⏳...' : '❌ Cancel SIP'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Styles ──
const styles = {
  header: {
    background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 60%, #2980b9 100%)',
    borderRadius: 24,
    padding: '28px 20px',
    textAlign: 'center',
    color: 'white',
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecor: {
    position: 'absolute', top: 12, right: 16,
    fontSize: '1.1rem', opacity: 0.2, letterSpacing: 8,
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1.4rem, 5vw, 1.8rem)',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: '0.72rem', opacity: 0.85,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  tabRow: {
    display: 'flex', gap: 8, marginBottom: 14,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  tabBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 8px',
    background: 'white', border: '2px solid var(--border)',
    borderRadius: 14, cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
    fontSize: '1.1rem',
    minWidth: 0,
  },
  tabActive: {
    background: 'linear-gradient(135deg, var(--mauve-deep), var(--mauve))',
    borderColor: 'transparent',
    color: 'white',
  },
  tabLabel: {
    fontSize: '0.62rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10, marginBottom: 14,
  },
  statCard: {
    background: 'white', borderRadius: 16, padding: '14px 8px',
    textAlign: 'center', boxShadow: '0 3px 14px var(--shadow)',
    border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  statNum: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(1rem, 3.5vw, 1.3rem)',
    color: 'var(--mauve-deep)',
  },
  statLabel: {
    fontSize: '0.58rem', color: 'var(--text-light)',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  statusBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderRadius: 12,
    fontSize: '0.88rem', marginBottom: 12,
  },

  detailGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  detailItem: {
    background: 'var(--petal)', borderRadius: 10, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  detailLabel: {
    fontSize: '0.62rem', color: 'var(--text-light)',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: '0.85rem', fontWeight: 700, color: 'var(--mauve-deep)',
  },

  partnerStat: {
    fontSize: '0.85rem', color: 'var(--text-light)',
    textAlign: 'center', padding: '8px 0',
  },

  loadingMsg: {
    textAlign: 'center', color: 'var(--text-light)',
    padding: '20px 0',
  },

  emptyState: {
    textAlign: 'center', padding: '8px 0',
  },
  emptyTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem', color: 'var(--mauve-deep)',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: '0.82rem', color: 'var(--text-light)',
    lineHeight: 1.6, marginBottom: 14,
  },
  featureList: {
    textAlign: 'left', marginBottom: 4,
  },
  featureItem: {
    fontSize: '0.78rem', color: 'var(--mauve)',
    padding: '6px 0', borderBottom: '1px solid var(--border)',
    lineHeight: 1.5,
  },

  emptyHistory: {
    textAlign: 'center', padding: '24px 0',
  },

  historyList: {
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  historyItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  historyLeft: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  historyIcon: {
    width: 36, height: 36, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1rem', flexShrink: 0,
  },
  historyWho: {
    fontSize: '0.85rem', fontWeight: 600, color: 'var(--mauve-deep)',
  },
  historyDate: {
    fontSize: '0.68rem', color: 'var(--text-light)', marginTop: 2,
  },
  historyAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1rem', fontWeight: 700,
  },

  settingsInfo: {
    marginBottom: 16,
  },
  settingRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  settingLabel: {
    fontSize: '0.82rem', color: 'var(--text-light)',
  },
  settingValue: {
    fontSize: '0.82rem', fontWeight: 700, color: 'var(--mauve-deep)',
  },

  disclaimer: {
    background: 'linear-gradient(135deg, #fef9e7, #fdf2e9)',
    borderRadius: 12, padding: '14px 16px',
    fontSize: '0.78rem', color: '#7d6608', lineHeight: 1.6,
    border: '1px solid #f9e79f',
  },
  disclaimerList: {
    margin: '8px 0 0 0', paddingLeft: 18,
    listStyleType: 'disc',
  },

  dangerInfo: {
    fontSize: '0.82rem', color: '#e74c3c', lineHeight: 1.6,
    background: '#fdedec', borderRadius: 10, padding: '12px 14px',
    border: '1px solid #f5b7b1',
  },

  modalContent: {
    padding: '4px 0',
  },
  modalText: {
    fontSize: '0.85rem', color: 'var(--text-light)',
    lineHeight: 1.6, marginBottom: 12,
  },
  modalHighlight: {
    background: 'linear-gradient(135deg, #eaf2f8, #e8f8f5)',
    borderRadius: 12, padding: '14px 16px',
    fontSize: '0.82rem', color: '#2c3e50',
    lineHeight: 1.8, marginBottom: 8,
    border: '1px solid #d5dbdb',
    display: 'flex', flexDirection: 'column', gap: 4,
  },

  visitorMsg: {
    textAlign: 'center', padding: '30px 16px',
    fontSize: '0.9rem', color: 'var(--text-light)',
  },
}
