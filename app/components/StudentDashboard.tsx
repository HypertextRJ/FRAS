"use client"

import { useState, useEffect, useRef } from "react"
import { db, auth } from "../firebase"
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import SelectSubjects from "./SelectSubjects"
import ViewProfile from "./ViewProfile"
import MarkAttendance from "./MarkAttendance"
import NotificationCenter from "./NotificationCenter"
import LoadingSpinner from "./LoadingSpinner"

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("markAttendance")
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isNavOpen, setIsNavOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef(null)

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        const userData = userDoc.data()

        if (userData?.subjects?.length > 0) {
          setSubjects(
            userData.subjects.map((subject, index) => ({
              id: `subject-${index}`,
              name: subject,
            }))
          )
        } else if (userData?.department && userData?.semester) {
          const subjectsQuery = query(
            collection(db, "subjects"),
            where("department", "==", userData.department),
            where("semester", "==", userData.semester)
          )
          const subjectsSnapshot = await getDocs(subjectsQuery)
          const subjectsList = subjectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          setSubjects(subjectsList)
        } else {
          setSubjects([])
        }
      } catch (error) {
        console.error("Error fetching subjects:", error)
        setError("Failed to fetch subjects. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    fetchSubjects()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      setError("Failed to sign out. Please try again.")
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsNavOpen(false)
      }
    }

    if (isNavOpen) {
      document.addEventListener("click", handleOutsideClick)
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick)
    }
  }, [isNavOpen])

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Mobile Header */}
      <div className="md:hidden mb-0">
        <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
        <div className="flex justify-between items-center">
          <NotificationCenter user={user} userRole="students" />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="p-2 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {isNavOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <button
                  onClick={() => {
                    setActiveTab("markAttendance")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Mark Attendance
                </button>
                <button
                  onClick={() => {
                    setActiveTab("selectSubjects")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Check Attedance
                </button>
                <button
                  onClick={() => {
                    setActiveTab("viewProfile")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  View Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <NotificationCenter user={user} userRole="students" />
      </div>

      {/* Tab Navigation (Desktop) */}
      <div className="bg-white rounded-xl shadow-lg p-2 mb-8">
        <div className="hidden md:flex justify-center space-x-4">
          <button
            onClick={() => setActiveTab("markAttendance")}
            className={`px-4 py-2 rounded ${
              activeTab === "markAttendance"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab("selectSubjects")}
            className={`px-4 py-2 rounded ${
              activeTab === "selectSubjects"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Check Attedance
          </button>
          <button
            onClick={() => setActiveTab("viewProfile")}
            className={`px-4 py-2 rounded ${
              activeTab === "viewProfile"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            View Profile
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "markAttendance" && subjects.length > 0 && (
        <MarkAttendance user={user} subjects={subjects} />
      )}
      {activeTab === "markAttendance" && subjects.length === 0 && (
        <div className="text-red-500">No subjects assigned yet.</div>
      )}
      {activeTab === "selectSubjects" && <SelectSubjects user={user} subjects={subjects} />}
      {activeTab === "viewProfile" && <ViewProfile user={user} />}
    </div>
  )
}
