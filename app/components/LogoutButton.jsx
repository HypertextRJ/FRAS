"use client"

import { signOut } from "firebase/auth"
import { auth } from "../firebase"
import { useRouter } from "next/navigation"
import { cleanupFirestoreListeners, setSigningOut } from "../module/firestoreListeners"

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Indicate that sign out is in progress.
      setSigningOut(true)
      // Unsubscribe from all active Firestore listeners.
      cleanupFirestoreListeners()
      // Optional short delay to ensure listeners have time to clean up.
      setTimeout(async () => {
        await signOut(auth)
        router.push("/")
      }, 100)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm"
    >
      Logout
    </button>
  )
}
