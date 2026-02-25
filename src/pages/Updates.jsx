import React, { useState, useEffect, useContext } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import WhoSelector from '../components/WhoSelector'
import ImageUpload from '../components/ImageUpload'
import { fsAdd, fsDelete, fsListen, uploadImageCloudinary } from '../firebase'
import { WhoContext, ToastContext } from '../App'

export default function Updates() {
  const { who } = useContext(WhoContext)
  const showToast = useContext(ToastContext)
  const [photos, setPhotos] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [locOpen, setLocOpen] = useState(false)

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
      setPCaption(''); setPFile(null); setPPreview(null)
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
      setLName(''); setLAddr(''); setLNote('')
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

  return (
    <div style={{ padding: '18px 16px' }} className="fade-up">
      {/* Photo Updates */}
      <div style={styles.header}>
        <div>
          <div style={styles.pageTitle}>🤳 Photo Updates</div>
          <div style={styles.pageSub}>Selfies & daily snapshots</div>
        </div>
        <Button size="sm" onClick={() => { setPWho(who); setPhotoOpen(true) }}>+ Post</Button>
      </div>

      {loading ? <div className="loading">🌸</div> : photos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🤳</div>
          <p>No photo updates yet.<br />Post your first selfie!</p>
        </div>
      ) : (
        <div style={styles.photosGrid}>
          {photos.map(p => (
            <div key={p.id} style={styles.photoCard}>
              <img src={p.imgUrl} alt={p.caption} style={styles.photoImg} />
              <div style={styles.photoInfo}>
                <div style={styles.photoCaption}>{p.caption || 'No caption'}</div>
                <div style={styles.photoMeta}>
                  {p.who === 'Kishan' ? '💙' : '🌸'} {p.who} · {p.date}
                </div>
                <button style={styles.delBtn} onClick={() => fsDelete('photos', p.id).then(() => showToast('Deleted'))}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="divider" />

      {/* Location Updates */}
      <div style={{ ...styles.header, marginTop: 4 }}>
        <div>
          <div style={styles.pageTitle}>📍 Location Updates</div>
          <div style={styles.pageSub}>Where we are</div>
        </div>
        <Button size="sm" onClick={() => { setLWho(who); setLocOpen(true) }}>+ Share</Button>
      </div>

      {locations.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          <div className="empty-icon">📍</div>
          <p>No location updates yet.</p>
        </div>
      ) : locations.map(l => (
        <div key={l.id} style={styles.locCard}>
          <div style={styles.locIcon}>📍</div>
          <div style={{ flex: 1 }}>
            <div style={styles.locName}>{l.name}</div>
            {l.addr && <div style={styles.locAddr}>{l.addr}</div>}
            {l.note && <div style={{ ...styles.locAddr, color: 'var(--mauve)', marginTop: 4 }}>"{l.note}"</div>}
            <div style={styles.locWhen}>{l.who === 'Kishan' ? '💙' : '🌸'} {l.who} · {l.date}</div>
          </div>
          <button style={{ ...styles.delBtn, position: 'static' }} onClick={() => fsDelete('locations', l.id).then(() => showToast('Deleted'))}>🗑</button>
        </div>
      ))}

      {/* Photo Modal */}
      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="🤳 Post a Photo Update">
        <WhoSelector value={pWho} onChange={setPWho} />
        <ImageUpload onFile={f => { setPFile(f); setPPreview(URL.createObjectURL(f)) }} preview={pPreview} label="Tap to upload your selfie" />
        <input value={pCaption} onChange={e => setPCaption(e.target.value)} placeholder="Caption (optional)" style={{ marginBottom: 12 }} />
        <Button size="full" onClick={savePhoto} disabled={pSaving}>
          {pSaving ? 'Uploading…' : 'Post Update 🌸'}
        </Button>
      </Modal>

      {/* Location Modal */}
      <Modal open={locOpen} onClose={() => setLocOpen(false)} title="📍 Share Your Location">
        <WhoSelector value={lWho} onChange={setLWho} />
        <input value={lName} onChange={e => setLName(e.target.value)} placeholder="Place name (e.g. Marine Drive 🌊)" style={{ marginBottom: 8 }} />
        <input value={lAddr} onChange={e => setLAddr(e.target.value)} placeholder="Address or area" style={{ marginBottom: 8 }} />
        <textarea value={lNote} onChange={e => setLNote(e.target.value)} placeholder="Optional note… (e.g. Thinking of you here 💕)" style={{ marginBottom: 12, minHeight: 60 }} />
        <Button size="full" onClick={getCurrentLocation} disabled={gettingLoc} style={{ marginBottom: 8 }}>
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
  pageTitle: { fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', color: 'var(--mauve-deep)' },
  pageSub: { fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 2 },
  photosGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  photoCard: { borderRadius: 16, overflow: 'hidden', background: 'white', boxShadow: '0 3px 12px var(--shadow)' },
  photoImg: { width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' },
  photoInfo: { padding: '8px 10px', position: 'relative' },
  photoCaption: { fontSize: '0.82rem', color: 'var(--text)', paddingRight: 20 },
  photoMeta: { fontSize: '0.68rem', color: 'var(--text-light)', marginTop: 3 },
  locCard: {
    background: 'white', borderRadius: 14, padding: 14, marginBottom: 10,
    boxShadow: '0 3px 12px var(--shadow)', display: 'flex', gap: 12, alignItems: 'flex-start',
  },
  locIcon: {
    width: 42, height: 42, background: 'var(--blush)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0,
  },
  locName: { fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' },
  locAddr: { fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 3, lineHeight: 1.4 },
  locWhen: { fontSize: '0.68rem', color: 'var(--rose-dark)', marginTop: 5 },
  delBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.95rem' },
}
