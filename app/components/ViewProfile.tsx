"use client"

import { useState, useEffect } from "react"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../firebase"
import LoadingSpinner from "./LoadingSpinner"
import { subjectMapping } from "./subjectMapping"

// Helper to convert subject ID (e.g., "CSE-8-2") to subject details using subjectMapping
const getSubjectDetailsFromId = (subjectId) => {
  const parts = subjectId.split("-")
  if (parts.length !== 3) return null
  const [department, semester, index] = parts
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

export default function ViewProfile({ user }) {
  const [newPassword, setNewPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("") // Added state for current password
  const [message, setMessage] = useState("")
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    department: "",
    semester: "",
    enrollmentNumber: "",
    profileImage: "",
    lastAttendanceDate: null,
    subjects: [] // Expected to be an array of subject IDs (e.g., "CSE-8-2")
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
          semester: data.semester || "",
          enrollmentNumber: data.enrollmentNumber || "",
          profileImage: data.profileImage || "",
          lastAttendanceDate: data.lastAttendanceDate
            ? new Date(data.lastAttendanceDate.seconds * 1000).toLocaleDateString()
            : "No attendance recorded",
          subjects: data.subjects || [] // subjects as array of subject IDs
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
      setCurrentPassword("") // Clear the current password field
    } catch (error) {
      // Enhanced error handling
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
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  // Filter subjects: only include subject IDs that start with the student's department code.
  let studentSubjects = profileData.subjects.filter((subject) =>
    subject.includes("-") && subject.startsWith(profileData.department)
  )

  // Fallback: if no subjects match, use subjectMapping for department and semester.
  if (studentSubjects.length === 0 && profileData.department && profileData.semester) {
    console.warn("No subjects match student's department in Firestore. Falling back to subjectMapping.")
    const subjectsForDept =
      subjectMapping[profileData.department] && subjectMapping[profileData.department][profileData.semester]
    if (subjectsForDept && subjectsForDept.length > 0) {
      studentSubjects = subjectsForDept.map((subj, index) => `${profileData.department}-${profileData.semester}-${index}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-2 py-6 space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center sm:space-x-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0 mb-6 sm:mb-0 flex flex-col items-center">
            {profileData.profileImage ? (
              <img
                src={profileData.profileImage}
                alt="Profile"
                className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-blue-500"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                <span className="text-gray-500 text-sm">No Photo</span>
              </div>
            )}
            <p className="mt-2 text-center text-xs sm:text-sm text-gray-500">
              Last Attendance: {profileData.lastAttendanceDate}
            </p>
          </div>
          {/* Personal Details */}
          <div className="text-left sm:text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">{profileData.name}</h2>
            <div className="mt-4 space-y-1 sm:space-y-2">
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Email:</span> {profileData.email}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Department:</span> {profileData.department}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Semester:</span> {profileData.semester}
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-medium">Enrollment Number:</span> {profileData.enrollmentNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid for Subjects and Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Subjects Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl sm:text-2xl font-semibold text-blue-600 mb-4">Your Subjects</h3>
          {studentSubjects.length === 0 ? (
            <p className="text-gray-500 text-sm">No subjects available.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {studentSubjects.map((subject, index) => {
                const details = getSubjectDetailsFromId(subject)
                return (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm"
                  >
                    {details ? details.name : subject}{" "}
                    {details && (
                      <span className="text-xs text-gray-600">
                        ({details.department} - Sem {details.semester})
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        {/* Change Password Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl sm:text-2xl font-semibold text-blue-600 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password Input */}
            <div>
              <label htmlFor="currentPassword" className="block text-gray-700 font-medium text-sm">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            {/* New Password Input */}
            <div>
              <label htmlFor="newPassword" className="block text-gray-700 font-medium text-sm">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 px-4 rounded-md text-sm"
            >
              Update Password
            </button>
          </form>
          {message && (
            <p
              className={`mt-4 text-center text-xs sm:text-sm ${
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
