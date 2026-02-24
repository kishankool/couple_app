// src/firebase.js
// ⚠️  Replace these values with your own Firebase project config
// Go to: https://console.firebase.google.com → Your project → Project Settings → Your apps → SDK setup

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

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
export const storage = getStorage(app)

// ─── Firestore helpers ────────────────────────────────────────────────────────

export const fsAdd = (col, data) =>
  addDoc(collection(db, col), { ...data, createdAt: serverTimestamp() })

export const fsDelete = (col, id) => deleteDoc(doc(db, col, id))

export const fsUpdate = (col, id, data) => updateDoc(doc(db, col, id), data)

export const fsListen = (col, cb, order = 'createdAt') => {
  const q = query(collection(db, col), orderBy(order, 'desc'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export const uploadImage = async (file, path) => {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export const deleteImage = async (url) => {
  try {
    const fileRef = ref(storage, url)
    await deleteObject(fileRef)
  } catch {}
}
