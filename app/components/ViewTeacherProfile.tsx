"use client"

import { useState, useEffect } from "react"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "../firebase"
import LoadingSpinner from "./LoadingSpinner"
import { subjectMapping } from "./subjectMapping"

// Helper to convert subject ID to subject name and details
const getSubjectDetailsFromId = (subjectId) => {
  const [department, semester, index] = subjectId.split("-")
  if (
    subjectMapping[department] &&
    subjectMapping[department][semester] &&
    subjectMapping[department][semester][index] !== undefined
  ) {
    return {
      id: subjectId,
      name: subjectMapping[department][semester][index],
      department,
      semester,
    }
  }
  return null
}

export default function ViewTeacherProfile({ user }) {
  const [newPassword, setNewPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("") // Added state for current password
  const [message, setMessage] = useState("")
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    semester: "",
    lastAttendanceDate: null,
    assignedSubjects: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfileData()
  }, [user])

  const fetchProfileData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setProfileData({
          name: data.name || "",
          email: data.email || "",
          department: data.department || "",
          designation: data.designation || "",
          semester: data.semester || "",
          lastAttendanceDate: data.lastAttendanceDate
            ? new Date(data.lastAttendanceDate.seconds * 1000).toLocaleDateString()
            : "No attendance recorded",
          assignedSubjects: data.assignedSubjects || []
        })
      }
      setLoading(false)
    } catch (error) {
      console.error("Error fetching profile data:", error)
      setMessage("Error loading profile data")
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    try {
      // Step 1: Re-authenticate the user with their current password
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Step 2: Update the password if re-authentication succeeds
      await updatePassword(auth.currentUser, newPassword)
      setMessage("Password updated successfully!")
      setNewPassword("")
      setCurrentPassword("") // Clear current password field
    } catch (error) {
      // Step 3: Handle specific error cases with user-friendly messages
      if (error.code === "auth/wrong-password") {
        setMessage("Current password is incorrect.")
      } else if (error.code === "auth/too-many-requests") {
        setMessage("Too many failed attempts. Please try again later.")
      } else {
        setMessage(`Error updating password: ${error.message}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-0 space-y-8">
      {/* Profile Header (Personal Details) */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div>
          <h2 className="text-3xl font-bold text-blue-600">{profileData.name}</h2>
          <div className="mt-4 space-y-2">
            <p className="text-gray-700">
              <span className="font-medium">Email:</span> {profileData.email}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Department:</span> {profileData.department}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Designation:</span> {profileData.designation}
            </p>
          </div>
        </div>
      </div>

      {/* Grid for Subjects and Change Password */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Your Subjects Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-blue-600 mb-4">Your Subjects</h3>
          {profileData.assignedSubjects.length === 0 ? (
            <p className="text-gray-500">No subjects assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profileData.assignedSubjects.map((subjectId, index) => {
                const subjectDetails = getSubjectDetailsFromId(subjectId)
                return (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {subjectDetails ? subjectDetails.name : "Unknown Subject"}{" "}
                    <span className="text-xs text-gray-600">
                      ({subjectId.split("-")[0]} - Sem {subjectId.split("-")[1]})
                    </span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
        {/* Change Password Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-blue-600 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Added Current Password Input */}
            <div>
              <label htmlFor="currentPassword" className="block text-gray-700 font-medium">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 mb-4 border rounded"
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-gray-700 font-medium">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 mb-4 border rounded"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Update Password
            </button>
          </form>
          {message && (
            <p
              className={`mt-4 text-center text-sm ${
                message.includes("Error") || message.includes("incorrect") || message.includes("failed")
                  ? "text-red-500"
                  : "text-green-500"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}