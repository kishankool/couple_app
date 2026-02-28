// src/firebase.js
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  query, orderBy, limit, onSnapshot, updateDoc, serverTimestamp
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

export const fsListen = (col, cb, order = 'createdAt') => {
  const q = query(collection(db, col), orderBy(order, 'desc'), limit(100))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

// Cloudinary upload — free tier, no payment needed
// Setup: cloudinary.com → free signup → Settings → Upload → Upload Presets → Add preset → Unsigned
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
