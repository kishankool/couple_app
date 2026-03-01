import React, { useState, useEffect, useContext } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import WhoSelector from '../components/WhoSelector'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImageCloudinary } from '../firebase'
import { WhoContext, ToastContext } from '../App'

const TABS = [
  { key: 'photos', icon: '🤳', label: 'Photos' },
  { key: 'locations', icon: '📍', label: 'Locations' },
]

export default function Updates() {
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const [activeTab, setActiveTab] = useState('photos')
  const [photos, setPhotos] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const [viewPhoto, setViewPhoto] = useState(null)

  // Photo form
  const [pWho, setPWho] = useState(who)
  const [pCaption, setPCaption] = useState('')
  const [pFile, setPFile] = useState(null)
  const [pPreview, setPPreview] = useState(null)
  const [pSaving, setPSaving] = useState(false)

  // Location form
  const [lWho, setLWho] = useState(who)
  const [lName, setLName] = useState('')
  const [lAddr, setLAddr] = useState('')
  const [lNote, setLNote] = useState('')
  const [lSaving, setLSaving] = useState(false)
  const [gettingLoc, setGettingLoc] = useState(false)

  useEffect(() => {
    const u1 = fsListen('photos', d => { setPhotos(d); setLoading(false) })
    const u2 = fsListen('locations', d => setLocations(d))
    return () => { u1(); u2() }
  }, [])

  const resetPhotoForm = () => {
    setPCaption(''); setPFile(null); setPPreview(null)
  }

  const resetLocForm = () => {
    setLName(''); setLAddr(''); setLNote('')
  }

  const savePhoto = async () => {
    if (!pFile) return showToast('Pick a photo first 📷')
    setPSaving(true)
    try {
      const imgUrl = await uploadImageCloudinary(pFile)
      await fsAdd('photos', {
        who: pWho,
        caption: pCaption.trim(),
        imgUrl,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      })
      resetPhotoForm()
      setPhotoOpen(false)
      showToast('Photo posted! 🤳')
    } catch { showToast('Error uploading photo') }
    setPSaving(false)
  }

  const saveLocation = async () => {
    if (!lName.trim()) return showToast('Enter a place name 📍')
    setLSaving(true)
    try {
      await fsAdd('locations', {
        who: lWho,
        name: lName.trim(),
        addr: lAddr.trim(),
        note: lNote.trim(),
        date: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      })
      resetLocForm()
      setLocOpen(false)
      showToast('Location shared! 📍')
    } catch { showToast('Error sharing location') }
    setLSaving(false)
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return showToast('Geolocation not supported')
    setGettingLoc(true)
    showToast('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const data = await res.json()
          const parts = (data.display_name || '').split(',')
          setLName(parts[0] || 'My location')
          setLAddr(parts.slice(1, 4).join(',').trim())
        } catch {
          setLAddr(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        }
        setGettingLoc(false)
      },
      () => { showToast('Could not get location'); setGettingLoc(false) }
    )
  }

  const delPhoto = async (id) => {
    try { await fsDelete('photos', id); showToast('Deleted') }
    catch { showToast('Error deleting') }
  }

  const delLocation = async (id) => {
    try { await fsDelete('locations', id); showToast('Deleted') }
    catch { showToast('Error deleting') }
  }

  return (
    <div className="page-content">
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>🤳 Updates</div>
          <div style={styles.pageSub}>Photos & locations shared</div>
        </div>
        <Button size="sm" onClick={() => {
          if (activeTab === 'photos') {
            setPWho(who); resetPhotoForm(); setPhotoOpen(true)
          } else {
            setLWho(who); resetLocForm(); setLocOpen(true)
          }
        }}>
          + {activeTab === 'photos' ? 'Post' : 'Share'}
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="tabs-container">
        {TABS.map(tab => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="tab-count">
              {tab.key === 'photos' ? photos.length : locations.length}
            </span>
          </button>
        ))}
      </div>

      {/* Photo Updates Tab */}
      {activeTab === 'photos' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          {loading ? <div className="loading">🌸</div> : photos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤳</div>
              <p>No photo updates yet.<br />Post your first selfie!</p>
            </div>
          ) : (
            <div style={styles.photosGrid}>
              {photos.map((p, i) => (
                <div key={p.id} style={{ ...styles.photoCard, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
                  <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setViewPhoto(p)}>
                    <img src={p.imgUrl} alt={p.caption} style={styles.photoImg} loading="lazy" />
                    <div style={styles.photoOverlay}>
                      <span style={styles.photoOverlayText}>Tap to view</span>
                    </div>
                  </div>
                  <div style={styles.photoInfo}>
                    <div style={styles.photoCaption}>{p.caption || 'No caption'}</div>
                    <div style={styles.photoMeta}>
                      {p.who === 'Kishan' ? '💙' : '🌸'} {p.who} · {p.date}
                    </div>
                    <button style={styles.delBtn} onClick={() => delPhoto(p.id)} title="Delete">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Location Updates Tab */}
      {activeTab === 'locations' && (
        <div style={{ animation: 'fadeUp 0.25s ease' }}>
          {locations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📍</div>
              <p>No location updates yet.<br />Share where you are!</p>
            </div>
          ) : (
            <div>
              {locations.map((l, i) => (
                <div key={l.id} style={{ ...styles.locCard, animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
                  <div style={styles.locIcon}>📍</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.locName}>{l.name}</div>
                    {l.addr && <div style={styles.locAddr}>{l.addr}</div>}
                    {l.note && <div style={{ ...styles.locAddr, color: 'var(--mauve)', marginTop: 4, fontStyle: 'italic' }}>"{l.note}"</div>}
                    <div style={styles.locWhen}>{l.who === 'Kishan' ? '💙' : '🌸'} {l.who} · {l.date}</div>
                  </div>
                  <button style={{ ...styles.delBtn, position: 'static', padding: 8 }} onClick={() => delLocation(l.id)} title="Delete">🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Photo Modal */}
      <Modal open={!!viewPhoto} onClose={() => setViewPhoto(null)} title="">
        {viewPhoto && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={viewPhoto.imgUrl}
              alt={viewPhoto.caption}
              style={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'contain',
                borderRadius: 12,
                marginBottom: 12,
              }}
            />
            {viewPhoto.caption && (
              <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>
                {viewPhoto.caption}
              </div>
            )}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-light)', marginBottom: 16 }}>
              {viewPhoto.who === 'Kishan' ? '💙' : '🌸'} {viewPhoto.who} · {viewPhoto.date}
            </div>
            <Button variant="danger" size="sm" onClick={async () => {
              await fsDelete('photos', viewPhoto.id)
              setViewPhoto(null)
              showToast('Deleted')
            }}>
              Delete Photo
            </Button>
          </div>
        )}
      </Modal>

      {/* Photo Modal */}
      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="🤳 Post a Photo Update">
        <WhoSelector value={pWho} onChange={setPWho} />
        <ImageUpload onFile={f => { setPFile(f); setPPreview(URL.createObjectURL(f)) }} preview={pPreview} label="Tap to upload your selfie" />
        <input value={pCaption} onChange={e => setPCaption(e.target.value)} placeholder="Caption (optional)" style={{ marginBottom: 14 }} />
        <Button size="full" onClick={savePhoto} disabled={pSaving}>
          {pSaving ? 'Uploading…' : 'Post Update 🌸'}
        </Button>
      </Modal>

      {/* Location Modal */}
      <Modal open={locOpen} onClose={() => setLocOpen(false)} title="📍 Share Your Location">
        <WhoSelector value={lWho} onChange={setLWho} />
        <input value={lName} onChange={e => setLName(e.target.value)} placeholder="Place name (e.g. Marine Drive 🌊)" style={{ marginBottom: 10 }} />
        <input value={lAddr} onChange={e => setLAddr(e.target.value)} placeholder="Address or area" style={{ marginBottom: 10 }} />
        <textarea value={lNote} onChange={e => setLNote(e.target.value)} placeholder="Optional note… (e.g. Thinking of you here 💕)" style={{ marginBottom: 14, minHeight: 60 }} />
        <Button size="full" onClick={getCurrentLocation} disabled={gettingLoc} style={{ marginBottom: 10 }}>
          {gettingLoc ? 'Getting location…' : '📍 Use My Current Location'}
        </Button>
        <Button size="full" variant="outline" onClick={saveLocation} disabled={lSaving}>
          {lSaving ? 'Sharing…' : 'Share Location 🌸'}
        </Button>
      </Modal>
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },

  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  photoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    background: 'white',
    boxShadow: '0 3px 14px var(--shadow)',
    animation: 'fadeUp 0.35s ease both',
    transition: 'transform 0.2s',
  },
  photoImg: { width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
    padding: '20px 8px 8px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  photoOverlayText: {
    color: 'white',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  photoInfo: { padding: '10px 12px', position: 'relative' },
  photoCaption: { fontSize: '0.84rem', color: 'var(--text)', paddingRight: 22, lineHeight: 1.4 },
  photoMeta: { fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 4 },

  locCard: {
    background: 'white', borderRadius: 16, padding: 16, marginBottom: 10,
    boxShadow: '0 3px 14px var(--shadow)', display: 'flex', gap: 12, alignItems: 'flex-start',
    animation: 'fadeUp 0.35s ease both',
    border: '1px solid var(--border)',
    transition: 'transform 0.2s',
  },
  locIcon: {
    width: 44, height: 44, background: 'var(--blush)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
  },
  locName: { fontWeight: 700, fontSize: '0.94rem', color: 'var(--text)', lineHeight: 1.4 },
  locAddr: { fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 3, lineHeight: 1.4 },
  locWhen: { fontSize: '0.7rem', color: 'var(--rose-dark)', marginTop: 6 },
  delBtn: {
    background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.95rem',
    position: 'absolute', top: 8, right: 8,
    transition: 'color 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
}
