"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { auth, db } from "../firebase"
import LoadingSpinner from "../components/LoadingSpinner"
import { doc, getDoc } from "firebase/firestore"

export default function Login() {
  // Set the expected role for this login portal.
  // Change this value on each login page as needed.
  const expectedRole = "student"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Fetch user data from Firestore.
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()

      if (userData) {
        // If the user's role does not match the expected role, sign them out and show an error.
        if (userData.role !== expectedRole) {
          setError(
            `Invalid login portal. You are registered as a ${userData.role}. Please use the ${userData.role} login portal.`
          )
          await signOut(auth)
          return
        }

        // For students, ensure email is verified.
        if (expectedRole === "student" && !user.emailVerified) {
          setError("Please verify your email to access the dashboard. Check your inbox for the verification link.")
          await signOut(auth)
          return
        }

        // Route the user to their corresponding dashboard.
        if (expectedRole === "teacher") {
          router.push("/teacher-dashboard")
        } else if (expectedRole === "student") {
          router.push("/dashboard")
        } else if (expectedRole === "admin") {
          router.push("/admin-dashboard")
        } else {
          setError("Invalid user role")
          await signOut(auth)
        }
      } else {
        setError("User data not found. Please contact support.")
        await signOut(auth)
      }
    } catch (err) {
      setError("Failed to log in. Please check your email and password.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleLogin} className="w-full max-w-xs">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 mb-4 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 mb-4 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={isLoading}
        >
          {isLoading ? <LoadingSpinner /> : "Login"}
        </button>
      </form>
    </div>
  )
}
