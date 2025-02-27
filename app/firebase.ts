import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)

const actionCodeSettings = {
  url: process.env.NEXT_PUBLIC_VERIFICATION_URL || "http://localhost:3000/dashboard",
  handleCodeInApp: true,
  // Add your Android package name if you have one
  // androidPackageName: 'com.example.android',
  // Add your iOS bundle ID if you have one
  // iOS: {
  //   bundleId: 'com.example.ios'
  // },
}

export { app, auth, db, actionCodeSettings }

