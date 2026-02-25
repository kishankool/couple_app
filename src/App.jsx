import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Notes from './pages/Notes'
import Memories from './pages/Memories'
import Updates from './pages/Updates'
import Todos from './pages/Todos'
import More from './pages/More'
import Petals from './components/Petals'
import Toast from './components/Toast'
import Modal from './components/Modal'
import WhoSelector from './components/WhoSelector'
import LockScreen from './components/LockScreen'

export const ToastContext = React.createContext(null)
export const WhoContext   = React.createContext(null)

const NAV = [
  { path: '/',          icon: '🏠', label: 'Home'     },
  { path: '/notes',     icon: '💌', label: 'Notes'    },
  { path: '/memories',  icon: '📸', label: 'Memories' },
  { path: '/updates',   icon: '🤳', label: 'Updates'  },
  { path: '/todos',     icon: '✅', label: 'Todos'    },
  { path: '/more',      icon: '🌹', label: 'More'     },
]

export default function App() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [toast, setToast]               = useState(null)
  const [who,   setWhoState]            = useState(() => localStorage.getItem('ka_who') || 'Kishan')
  const [showWhoModal, setShowWhoModal] = useState(false)
  const [unlocked, setUnlocked]         = useState(() => sessionStorage.getItem('ka_unlocked') === '1')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const selectWho = (name) => {
    setWhoState(name)
    localStorage.setItem('ka_who', name)
    setShowWhoModal(false)
    showToast(`Welcome, ${name}! 💕`)
  }

  useEffect(() => {
    if (unlocked && !localStorage.getItem('ka_who')) setShowWhoModal(true)
  }, [unlocked])

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />

  return (
    <ToastContext.Provider value={showToast}>
      <WhoContext.Provider value={{ who, setWho: selectWho }}>
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

          <Petals />

          {/* Top Bar */}
          <header style={styles.topbar}>
            <div style={styles.topbarTitle}>Kishan & Aditi 💕</div>
            <button style={styles.whoTag} onClick={() => setShowWhoModal(true)}>
              {who === 'Kishan' ? '💙' : '🌸'} {who}
            </button>
          </header>

          {/* Pages */}
          <main style={{ flex: 1, paddingBottom: 70 }}>
            <Routes>
              <Route path="/"          element={<Home />}     />
              <Route path="/notes"     element={<Notes />}    />
              <Route path="/memories"  element={<Memories />} />
              <Route path="/updates"   element={<Updates />}  />
              <Route path="/todos"     element={<Todos />}    />
              <Route path="/more"      element={<More />}     />
            </Routes>
          </main>

          {/* Bottom Nav */}
          <nav style={styles.nav}>
            {NAV.map(n => (
              <button
                key={n.path}
                style={styles.navItem}
                onClick={() => navigate(n.path)}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{n.icon}</span>
                <span style={{
                  fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: location.pathname === n.path ? 'var(--mauve-deep)' : 'var(--text-light)',
                  fontWeight: location.pathname === n.path ? 700 : 400,
                }}>
                  {n.label}
                </span>
              </button>
            ))}
          </nav>

          {toast && <Toast msg={toast} />}

          {/* Who are you modal */}
          <Modal open={showWhoModal} onClose={() => who && setShowWhoModal(false)} title="Who's using the app? 💕">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-light)', marginBottom: 16, textAlign: 'center' }}>
              Tell us who you are so we can personalise your experience!
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={styles.bigWhoBtn} onClick={() => selectWho('Kishan')}>
                💙<br /><strong>Kishan</strong>
              </button>
              <button style={styles.bigWhoBtn} onClick={() => selectWho('Aditi')}>
                🌸<br /><strong>Aditi</strong>
              </button>
            </div>
          </Modal>

        </div>
      </WhoContext.Provider>
    </ToastContext.Provider>
  )
}

const styles = {
  topbar: {
    background: 'linear-gradient(135deg, var(--mauve-deep) 0%, var(--mauve) 100%)',
    color: 'white',
    padding: '16px 20px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 4px 20px rgba(107,63,82,0.3)',
  },
  topbarTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.2rem', letterSpacing: '0.5px',
  },
  whoTag: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 20, color: 'white',
    padding: '5px 14px', fontSize: '0.8rem',
    cursor: 'pointer', fontFamily: "'Lato', sans-serif",
  },
  nav: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, background: 'white',
    display: 'flex', borderTop: '1px solid rgba(200,120,140,0.15)',
    boxShadow: '0 -4px 20px rgba(200,120,140,0.12)', zIndex: 100,
  },
  navItem: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '10px 4px 12px', gap: 3, background: 'none', border: 'none', cursor: 'pointer',
  },
  bigWhoBtn: {
    flex: 1, padding: '20px',
    border: '2px solid var(--border)', borderRadius: 16,
    background: 'var(--petal)', cursor: 'pointer',
    fontSize: '1.5rem', fontFamily: "'Lato', sans-serif",
    lineHeight: 1.6, transition: 'all 0.2s',
  },
}
