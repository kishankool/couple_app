// src/firebase.js
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, addDoc, deleteDoc, doc, setDoc,
  query, orderBy, onSnapshot, updateDoc, serverTimestamp
} from 'firebase/firestore'
import imageCompression from 'browser-image-compression'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export const fsAdd    = (col, data) => addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() })
export const fsDelete = (col, id)   => deleteDoc(doc(db, col, id))
export const fsUpdate = (col, id, data) => updateDoc(doc(db, col, id), data)
export const fsSet    = (col, id, data) => setDoc(doc(db, col, id), { ...data, updatedAt: serverTimestamp() }, { merge: true })

// Listen to ALL docs in a collection (no limit)
// Previously had limit(100) which could block additions if Firestore index wasn't created
export const fsListen = (col, cb, order = 'createdAt') => {
  const q = query(collection(db, col), orderBy(order, 'desc'))
  let fallbackUnsub = null
  const primaryUnsub = onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.warn(`Firestore listener error on "${col}":`, error.message)
      // If the index isn't ready yet, fall back to unordered query
      const fallbackQ = query(collection(db, col))
      fallbackUnsub = onSnapshot(fallbackQ, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    }
  )
  return () => {
    primaryUnsub()
    if (fallbackUnsub) fallbackUnsub()
  }
}

// Cloudinary upload — free tier, no payment needed
export const uploadImageCloudinary = async (file) => {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  
  // Compress image before upload
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }
  const compressedFile = await imageCompression(file, options)

  const formData = new FormData()
  formData.append('file', compressedFile)
  formData.append('upload_preset', uploadPreset)
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return data.secure_url
}

// Send in-app notification when partner adds content
export const sendPartnerNotification = (who, action) => {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  
  const partnerName = who === 'Kishan' ? 'Aditi' : 'Kishan'
  
  const messages = {
    note: `${partnerName} sent you a love note 💌`,
    photo: `${partnerName} posted a new photo 🤳`,
    memory: `${partnerName} added a new memory 📸`,
    location: `${partnerName} shared their location 📍`,
    mood: `${partnerName} logged their mood 🌸`,
    todo: `${partnerName} added a new to-do ✅`,
  }

  try {
    new Notification('Kishan & Aditi 💕', {
      body: messages[action] || `${partnerName} updated something 🌸`,
      icon: '/heart.svg',
      tag: `partner-${action}`,
      renotify: true,
      silent: false,
    })
  } catch (e) {
    console.warn('Notification failed:', e)
  }
}
