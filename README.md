# 💕 Kishan & Aditi — Couple App

A beautiful, real-time shared couples app. Both of you see the same data instantly!

---

## 🚀 How to Deploy (Step-by-Step)

### Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `kishan-aditi-app` → click through
3. Once created, click **"Web"** icon (`</>`) to add a web app
4. Name it anything → click **"Register app"**
5. You'll see a `firebaseConfig` object — **copy those values**, you'll need them in Step 3

---

### Step 2 — Enable Firebase Services

In your Firebase project:

#### Firestore Database
1. Left sidebar → **"Firestore Database"** → **"Create database"**
2. Choose **"Start in test mode"** → select your region → Done

#### Storage (for photos)
1. Left sidebar → **"Storage"** → **"Get started"**
2. Choose **"Start in test mode"** → Done

> ⚠️ "Test mode" means anyone with the URL can read/write. Since this is a private couples app, this is fine. You can tighten rules later.

---

### Step 3 — Set Up Environment Variables

1. In this project folder, copy `.env.example` to a new file called **`.env.local`**
2. Fill in your Firebase values from Step 1:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=kishan-aditi-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kishan-aditi-app
VITE_FIREBASE_STORAGE_BUCKET=kishan-aditi-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

### Step 4 — Push to GitHub

1. Create a new repo on **https://github.com** (name it `couple-app`)
2. In this folder, run:

```bash
git init
git add .
git commit -m "Initial commit 💕"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/couple-app.git
git push -u origin main
```

---

### Step 5 — Deploy to Vercel

1. Go to **https://vercel.com** → Sign up / log in with GitHub
2. Click **"Add New Project"** → Import your `couple-app` repo
3. Framework will auto-detect as **Vite** ✅
4. Before deploying, click **"Environment Variables"** and add all 6 Firebase vars from your `.env.local`
5. Click **"Deploy"** 🚀

In ~2 minutes you'll get a live URL like `https://couple-app-xyz.vercel.app`

**Share that link with Aditi — you'll both see the same notes, photos, and memories in real-time!** 💕

---

## 💻 Run Locally (for testing)

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## ✨ Features

| Feature | Description |
|---|---|
| 🕐 Live Timer | Counts every second since April 21, 2025 |
| 💌 Love Notes | Write & read each other's messages in real-time |
| 📸 Memories | Upload photos with titles & dates |
| 🤳 Photo Updates | Daily selfies/snapshots with captions |
| 📍 Location Sharing | Share where you are (GPS or manual) |
| ✅ Shared To-dos | Add, tick off, and delete shared tasks |
| 🌹 Date Ideas | Built-in + custom date ideas |
| 🎉 Countdowns | Add events with live countdown |
| 🌸 Mood Tracker | Log daily moods, see each other's feelings |
| 📊 Relationship Stats | Days, weeks, months together |
| ✨ Daily Quote | Rotating love quotes |
| 🌸 Floating Petals | Romantic animated background |

---

## 🔒 Making it More Secure (Optional)

After you're happy with the app, update Firestore rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Keep for private use
    }
  }
}
```

For extra security, you could add Firebase Authentication so only you two can log in.

---

Made with 💕 for Kishan & Aditi
