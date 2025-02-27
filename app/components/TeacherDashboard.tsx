"use client"

import { useState, useEffect, useRef } from "react"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { auth } from "../firebase"
import ScheduleClasses from "./ScheduleClasses"
import ManageAttendance from "./ManageAttendance"
import ViewTeacherProfile from "./ViewTeacherProfile"
import NotificationCenter from "./NotificationCenter"
import SendNotification from "./SendNotification"
import MonitorAttendanceTeacher from "./MonitorAttendanceTeacher"
import { Toaster } from "@/components/ui/toaster"

export default function TeacherDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("viewProfile")
  const [isNavOpen, setIsNavOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef(null)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Close the hamburger menu when clicking outside
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
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Mobile Header */}
      <div className="md:hidden mb-6">
        <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <SendNotification user={user} userRole="teachers" />
            <NotificationCenter user={user} userRole="teachers" />
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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <button
                  onClick={() => {
                    setActiveTab("viewProfile")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  View Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab("scheduleClasses")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Schedule Classes
                </button>
                <button
                  onClick={() => {
                    setActiveTab("manageAttendance")
                    setIsNavOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Manage Attendance
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
        <div className="flex items-center gap-4">
          <SendNotification user={user} userRole="teachers" />
          <NotificationCenter user={user} userRole="teachers" />
        </div>
      </div>

      {/* Tab Navigation (Desktop) */}
      <div className="hidden md:flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab("viewProfile")}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === "viewProfile" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          View Profile
        </button>
        <button
          onClick={() => setActiveTab("scheduleClasses")}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === "scheduleClasses" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Schedule Classes
        </button>
        <button
          onClick={() => setActiveTab("manageAttendance")}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === "manageAttendance" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Manage Attendance
        </button>
        <button
          onClick={() => setActiveTab("monitorAttendance")}
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === "monitorAttendance" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Monitor Attendance
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === "viewProfile" && <ViewTeacherProfile user={user} />}
        {activeTab === "scheduleClasses" && <ScheduleClasses user={user} />}
        {activeTab === "manageAttendance" && <ManageAttendance user={user} />}
        {activeTab === "monitorAttendance" && <MonitorAttendanceTeacher user={user} />}
      </div>

      {/* Toaster */}
      <div className="fixed top-0 right-0 z-50">
        <Toaster />
      </div>
    </div>
  )
}

