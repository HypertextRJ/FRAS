"use client"

import { useState, useEffect, useRef } from "react"
import { db, auth } from "../firebase"
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import ManageTeachers from "./ManageTeachers"
import ManageStudents from "./ManageStudents"
import AssignSubjects from "./AssignSubjects"
import MonitorAttendance from "./MonitorAttendance"
import ManageSystemSettings from "./ManageSystemSettings"
import NotificationCenter from "./NotificationCenter"
import SendNotification from "./SendNotification"

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("manageTeachers")
  const router = useRouter()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const menuRef = useRef(null)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Close dropdown menu when clicking outside
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Mobile Header */}
      <div className="md:hidden mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <SendNotification user={user} userRole="admins" />
            <NotificationCenter user={user} userRole="admins" />
          </div>
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
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10">
                <button
                  onClick={() => {
                    setActiveTab("manageTeachers")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Manage Teachers
                </button>
                <button
                  onClick={() => {
                    setActiveTab("manageStudents")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Manage Students
                </button>
                <button
                  onClick={() => {
                    setActiveTab("assignSubjects")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Assign Subjects
                </button>
                <button
                  onClick={() => {
                    setActiveTab("monitorAttendance")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Monitor Attendance
                </button>
                <button
                  onClick={() => {
                    setActiveTab("manageSystemSettings")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  System Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <SendNotification user={user} userRole="admins" />
          <NotificationCenter user={user} userRole="admins" />
          {/* Logout button can be placed here if needed */}
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="hidden md:flex justify-center space-x-4 mb-8">
        <button
          onClick={() => setActiveTab("manageTeachers")}
          className={`px-4 py-2 rounded ${
            activeTab === "manageTeachers"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Manage Teachers
        </button>
        <button
          onClick={() => setActiveTab("manageStudents")}
          className={`px-4 py-2 rounded ${
            activeTab === "manageStudents"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Manage Students
        </button>
        <button
          onClick={() => setActiveTab("assignSubjects")}
          className={`px-4 py-2 rounded ${
            activeTab === "assignSubjects"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Assign Subjects
        </button>
        <button
          onClick={() => setActiveTab("monitorAttendance")}
          className={`px-4 py-2 rounded ${
            activeTab === "monitorAttendance"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Monitor Attendance
        </button>
        <button
          onClick={() => setActiveTab("manageSystemSettings")}
          className={`px-4 py-2 rounded ${
            activeTab === "manageSystemSettings"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          System Settings
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === "manageTeachers" && <ManageTeachers user={user} />}
        {activeTab === "manageStudents" && <ManageStudents user={user} />}
        {activeTab === "assignSubjects" && <AssignSubjects user={user} />}
        {activeTab === "monitorAttendance" && <MonitorAttendance user={user} />}
        {activeTab === "manageSystemSettings" && <ManageSystemSettings user={user} />}
      </div>
    </div>
  )
}
