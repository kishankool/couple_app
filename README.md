# 💕 Kishan & Aditi — Couple App v2

A beautiful, real-time shared couples app with lock screen, polaroid memories, live countdowns, and more.

---

## 🚀 Deploy Guide

### Step 1 — Firebase (for notes, moods, todos, etc.)

1. Go to **https://console.firebase.google.com** → Create project → name it `kishan-aditi`
2. Click the `</>` Web icon → Register app → copy the `firebaseConfig` values
3. Left sidebar → **Firestore Database** → Create database → **Start in test mode** → Done
4. *(No need to enable Storage — photos go to Cloudinary)*

### Step 2 — Cloudinary (FREE photo hosting — no payment needed)

1. Go to **https://cloudinary.com** → Sign up free (just email, no card)
2. On your Dashboard you'll see your **Cloud name** (e.g. `dxyz1234`) — copy it
3. Click top-right **Settings (⚙️)** → **Upload tab** → scroll to **Upload Presets**
4. Click **"Add upload preset"** → set Signing mode to **"Unsigned"** → give it a name like `couple_app` → Save
5. Copy that preset name

### Step 3 — Create .env.local

Copy `.env.example` to `.env.local` and fill in:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=kishan-aditi.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kishan-aditi
VITE_FIREBASE_STORAGE_BUCKET=kishan-aditi.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123...web:abc...

VITE_CLOUDINARY_CLOUD_NAME=dxyz1234
VITE_CLOUDINARY_UPLOAD_PRESET=couple_app
```

### Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "💕 Kishan & Aditi app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/couple-app.git
git push -u origin main
```

### Step 5 — Deploy on Vercel

1. **https://vercel.com** → Add New Project → Import your GitHub repo
2. Framework auto-detected as **Vite** ✅
3. Click **"Environment Variables"** → add all 8 vars from `.env.local`
4. Click **Deploy** 🚀

Share the live URL with Aditi — you'll both see the same data in real-time! 💕

---

## 🔒 Lock Screen

The app is protected. The answer to enter is: **21 april 2025**

Only you two know this! Multiple date formats are accepted.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔒 Lock Screen | Secret answer gate — only you two can enter |
| 🕐 Live Timer | Counts every second since April 21, 2025 |
| 💌 Love Notes | Real-time shared messages |
| 📸 Polaroid Memories | Beautiful polaroid wall with handwritten fonts, tilts & captions |
| 🤳 Photo Updates | Daily selfies with Cloudinary hosting |
| 📍 Location Sharing | Share where you are with GPS auto-detect |
| ✅ Shared To-dos | Check off tasks together |
| 🌹 Date Ideas | Built-in + add/delete custom ideas |
| 🎉 Countdowns | Easy day/month/year entry, sorted by soonest |
| 🌸 Mood Tracker | Daily moods with history |
| 📊 Relationship Stats | Years, months, weeks, days, hours, minutes, seconds live counter |
| ✨ Daily Quote | Rotating love quotes |

---

Made with 💕 for Kishan & Aditi
