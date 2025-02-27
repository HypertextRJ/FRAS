"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, sendEmailVerification, User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase"
import StudentDashboard from "../components/StudentDashboard"
import TeacherDashboard from "../components/TeacherDashboard"
import AdminDashboard from "../components/AdminDashboard"
import LoadingSpinner from "../components/LoadingSpinner"

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role === "student" && !currentUser.emailVerified) {
            setError("Please verify your email to access the dashboard. Check your inbox for the verification link.")
          }
          setRole(userData.role)
          setDisplayName(userData.name) // Store the teacher's or student's name
          setUser(currentUser)
        } else {
          setError("User data not found")
        }
      } else {
        router.push("/")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Restricted</h2>
          <p className="text-gray-600">{error}</p>
          {!user?.emailVerified && (
            <button
              onClick={async () => {
                try {
                  if (auth.currentUser) {
                    await sendEmailVerification(auth.currentUser)
                  } else {
                    alert("No authenticated user found.")
                  }
                  alert("Verification email sent. Please check your inbox.")
                } catch (error) {
                  console.error("Error sending verification email:", error)
                  alert("Failed to send verification email. Please try again later.")
                }
              }}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Resend Verification Email
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Welcome, {displayName}</h1>
      {role === "student" && <StudentDashboard user={user} />}
      {role === "teacher" && <TeacherDashboard user={user} />}
      {role === "admin" && <AdminDashboard user={user} />}
      {!role && <div>Role not assigned. Please contact an administrator.</div>}
    </div>
  )
}
