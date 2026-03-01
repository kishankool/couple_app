import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Home from './pages/Home'
import Notes from './pages/Notes'
import Memories from './pages/Memories'
import Updates from './pages/Updates'
import Todos from './pages/Todos'
import More from './pages/More'
import Petals from './components/Petals'
import Toast from './components/Toast'
import Modal from './components/Modal'
import LockScreen from './components/LockScreen'

export const ToastContext = React.createContext(null)
export const WhoContext = React.createContext(null)
export const RoleContext = React.createContext({ isVisitor: false })

const NAV_ALL = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/notes', icon: '💌', label: 'Notes', private: true },
  { path: '/memories', icon: '📸', label: 'Memories' },
  { path: '/updates', icon: '🤳', label: 'Updates', private: true },
  { path: '/todos', icon: '✅', label: 'Todos', private: true },
  { path: '/more', icon: '🌹', label: 'More' },
]

import { subscribeToPush } from './push'

// ── Notification Manager ──
function NotificationBell({ who, showToast }) {
  const [status, setStatus] = useState(() => {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  const request = async () => {
    if (!('Notification' in window)) return
    try {
      const perm = await Notification.requestPermission()
      setStatus(perm)
      if (perm === 'granted') {
        await subscribeToPush(who)
        showToast?.('Notifications enabled! 🌸')
      }
    } catch (err) {
      console.warn('Notification request failed:', err)
      setStatus('denied')
    }
  }

  if (status === 'unsupported') return null

  return (
    <button
      id="notification-bell"
      onClick={status !== 'granted' ? request : undefined}
      title={
        status === 'granted' ? 'Notifications on'
          : status === 'denied' ? 'Notifications blocked — enable in Settings'
            : 'Enable notifications'
      }
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 20,
        color: 'white',
        padding: '6px 12px',
        fontSize: '1rem',
        cursor: status === 'granted' ? 'default' : 'pointer',
        fontFamily: 'Lato, sans-serif',
        transition: 'all 0.2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {status === 'granted' ? '🔔' : status === 'denied' ? '🚫' : '🔕'}
    </button>
  )
}

// Smooth page transitions
const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.995 },
}

function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [toastMsg, setToastMsg] = useState(null)
  const [who, setWhoState] = useState(() => localStorage.getItem('ka_who') || 'Kishan')
  const [showWhoModal, setShowWhoModal] = useState(false)
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ka_unlocked') === '1')
  const [isVisitor, setIsVisitor] = useState(() => sessionStorage.getItem('ka_role') === 'visitor')
  const toastTimerRef = useRef(null)
  // Ref so NotificationBell can call showToast without re-renders
  const showToastRef = useRef(null)

  const NAV = isVisitor ? NAV_ALL.filter(n => !n.private) : NAV_ALL

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 2800)
  }, [])
  showToastRef.current = showToast

  const selectWho = (name) => {
    setWhoState(name)
    localStorage.setItem('ka_who', name)
    setShowWhoModal(false)
    showToast(`Welcome, ${name}! 💕`)
  }

  useEffect(() => {
    if (unlocked && !localStorage.getItem('ka_who')) setShowWhoModal(true)
  }, [unlocked])

  // iOS standalone mode - handle back swipe
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
    if (isStandalone) {
      document.body.style.overscrollBehavior = 'none'
    }
  }, [])

  // Register SW + auto-subscribe to push when owner logs in
  useEffect(() => {
    if (!unlocked || isVisitor) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async () => {
        if (Notification.permission === 'granted') {
          await subscribeToPush(who)
        }
      }).catch(console.warn)
    }
  }, [unlocked, isVisitor, who])

  // Show lock screen if not yet unlocked
  if (!unlocked) {
    return <LockScreen onUnlock={(role) => {
      setUnlocked(true)
      setIsVisitor(role === 'visitor')
      sessionStorage.setItem('ka_unlocked', '1')
    }} />
  }

  return (
    <ToastContext.Provider value={showToast}>
      <WhoContext.Provider value={{ who, setWho: selectWho }}>
        <RoleContext.Provider value={{ isVisitor }}>
          <div style={{
            maxWidth: 480, margin: '0 auto',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column', position: 'relative',
            paddingTop: 'var(--safe-top)',
          }}>
            <Petals />

            {/* ── Top Bar ── */}
            <header style={styles.topbar}>
              <div style={styles.topbarTitle}>Kishan & Aditi 💕</div>
              {/* Only show top-bar controls for owners */}
              {!isVisitor && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <NotificationBell who={who} showToast={showToast} />
                  <button style={styles.whoTag} onClick={() => setShowWhoModal(true)}>
                    {who === 'Kishan' ? '💙' : '🌸'} {who}
                  </button>
                </div>
              )}
            </header>

            {/* ── Pages ── */}
            <main style={styles.main}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
                  <Route path="/notes" element={isVisitor ? <PageWrapper><Home /></PageWrapper> : <PageWrapper><Notes /></PageWrapper>} />
                  <Route path="/memories" element={<PageWrapper><Memories /></PageWrapper>} />
                  <Route path="/updates" element={isVisitor ? <PageWrapper><Home /></PageWrapper> : <PageWrapper><Updates /></PageWrapper>} />
                  <Route path="/todos" element={isVisitor ? <PageWrapper><Home /></PageWrapper> : <PageWrapper><Todos /></PageWrapper>} />
                  <Route path="/more" element={<PageWrapper><More /></PageWrapper>} />
                </Routes>
              </AnimatePresence>
            </main>

            {/* ── Bottom Nav ── */}
            <nav style={styles.nav}>
              <div style={styles.navInner}>
                {NAV.map(n => {
                  const active = location.pathname === n.path
                  return (
                    <button
                      key={n.path}
                      id={`nav-${n.label.toLowerCase()}`}
                      style={styles.navItem}
                      onClick={() => navigate(n.path)}
                    >
                      <span style={{
                        fontSize: '1.25rem',
                        lineHeight: 1,
                        transform: active ? 'scale(1.18) translateY(-2px)' : 'scale(1)',
                        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'block',
                      }}>
                        {n.icon}
                      </span>
                      <span style={{
                        fontSize: '0.58rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: active ? 'var(--mauve-deep)' : 'var(--text-light)',
                        fontWeight: active ? 700 : 400,
                        transition: 'color 0.2s, font-weight 0.2s',
                      }}>
                        {n.label}
                      </span>
                      {active && (
                        <span style={{
                          position: 'absolute',
                          top: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 20,
                          height: 3,
                          borderRadius: 2,
                          background: 'var(--mauve-deep)',
                          transition: 'all 0.3s',
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
              <div style={styles.footerCredit}>
                Made with 💕 by Kishan
              </div>
            </nav>

            {toastMsg && <Toast msg={toastMsg} />}

            {/* ── Who are you modal ── */}
            <Modal open={showWhoModal} onClose={() => who && setShowWhoModal(false)} title="Who's using the app? 💕">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: 18, textAlign: 'center', lineHeight: 1.6 }}>
                Tell us who you are so we can personalise your experience!
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={styles.bigWhoBtn} onClick={() => selectWho('Kishan')}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>💙</div>
                  <strong>Kishan</strong>
                </button>
                <button style={styles.bigWhoBtn} onClick={() => selectWho('Aditi')}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>🌸</div>
                  <strong>Aditi</strong>
                </button>
              </div>
            </Modal>

          </div>
        </RoleContext.Provider>
      </WhoContext.Provider>
    </ToastContext.Provider>
  )
}

const styles = {
  topbar: {
    background: 'linear-gradient(135deg, var(--mauve-deep) 0%, var(--mauve) 100%)',
    color: 'white',
    padding: '14px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(107,63,82,0.3)',
    WebkitBackdropFilter: 'blur(10px)',
    backdropFilter: 'blur(10px)',
  },
  topbarTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.15rem',
    letterSpacing: '0.5px',
  },
  whoTag: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 20,
    color: 'white',
    padding: '6px 14px',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: "Lato, sans-serif",
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  visitorTag: {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 20,
    color: 'rgba(255,255,255,0.85)',
    padding: '6px 14px',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: 'Lato, sans-serif',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  main: {
    flex: 1,
    paddingBottom: 'calc(70px + var(--safe-bottom))',
    position: 'relative',
    overflowX: 'hidden',
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    background: 'rgba(255,255,255,0.95)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    backdropFilter: 'saturate(180%) blur(20px)',
    borderTop: '1px solid rgba(200,120,140,0.12)',
    boxShadow: '0 -4px 20px rgba(200,120,140,0.08)',
    zIndex: 100,
    paddingBottom: 'var(--safe-bottom)',
  },
  navInner: {
    display: 'flex',
  },
  footerCredit: {
    textAlign: 'center',
    fontSize: '0.58rem',
    color: 'rgba(155,107,123,0.55)',
    fontFamily: "'Playfair Display', serif",
    fontStyle: 'italic',
    letterSpacing: '0.4px',
    paddingBottom: '6px',
    paddingTop: '2px',
    userSelect: 'none',
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px 10px',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    WebkitTapHighlightColor: 'transparent',
  },
  bigWhoBtn: {
    flex: 1,
    padding: '22px 14px',
    border: '2px solid var(--border)',
    borderRadius: 18,
    background: 'var(--petal)',
    cursor: 'pointer',
    fontFamily: "Lato, sans-serif",
    lineHeight: 1.4,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
}
