"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"
import Link from "next/link"
import { db, auth } from "../firebase"
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { subjectMapping } from "../components/subjectMapping";

const departments = ["CSE", "ME", "EE", "ECE", "CE", "MC"]
const semesters = Array.from({ length: 8 }, (_, i) => i + 1)


const sendVerificationEmailWithRetry = async (user, maxRetries = 2, delay = 5000) => {
  let lastError = null;

  for (let i = 0; i < maxRetries; i++) {
      try {
          const actionCodeSettings = {
              url: `${window.location.origin}/login`,
              handleCodeInApp: true,
          };

          await sendEmailVerification(user, actionCodeSettings);
          localStorage.setItem("lastVerificationEmailTime", Date.now().toString());
          return true;
      } catch (error) {
          lastError = error;

          if (error.code === "auth/too-many-requests") {
              setError("Too many verification attempts. Please wait a few minutes and try again.");
              return;
          }

          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
  }

  throw lastError;
};


export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    enrollmentNumber: "",
    email: "",
    department: "",
    semester: "",
    subjects: [] as string[],
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)
  const router = useRouter()
  const videoRef = useRef(null)
  const [faceImage, setFaceImage] = useState(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      // Update subjects when department or semester changes
      if (name === "department" || name === "semester") {
        const dept = name === "department" ? value : prev.department
        const sem = name === "semester" ? Number.parseInt(value) : Number.parseInt(prev.semester)

        if (dept && sem && subjectMapping[dept]?.[sem]) {
          newData.subjects = subjectMapping[dept][sem]
        } else {
          newData.subjects = []
        }
      }

      return newData
    })
  }

  const validateEmail = (email: string) => {
    const emailRegex = /@nitmz\.ac\.in$/
    return emailRegex.test(email)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
    } catch (err) {
      setError("Failed to access camera")
    }
  }

  const captureFace = () => {
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0)
    setFaceImage(canvas.toDataURL("image/jpeg"))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      // Validation checks
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (!formData.department || !formData.semester) {
        throw new Error("Please select department and semester")
      }

      if (formData.subjects.length === 0) {
        throw new Error("No subjects available for selected department and semester")
      }

      if (!validateEmail(formData.email)) {
        throw new Error("Please use your @nitmz.ac.in email address")
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      )
      
      const user = userCredential.user

      try {
        // Attempt to send verification email
        await sendVerificationEmailWithRetry(user)
        setVerificationSent(true)
      } catch (verificationError) {
        // If verification email fails, we'll still create the account
        // but inform the user about the verification issue
        console.warn("Verification email failed:", verificationError)
        setError("Account created but verification email could not be sent. Please try verifying later.")
      }

      // Add user to Firestore regardless of verification email status
      await setDoc(doc(db, "users", user.uid), {
        name: formData.fullName,
        email: formData.email,
        enrollmentNumber: formData.enrollmentNumber,
        department: formData.department,
        semester: formData.semester,
        subjects: formData.subjects,
        role: "student",
        activated: false,
        verificationSent: verificationSent,
        createdAt: new Date().toISOString(),
      })

      // Navigate to face registration if everything succeeded
      router.push("/face-registration")
      
    } catch (error: any) {
      console.error("Signup error:", error)
      if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again in a few minutes.")
      } else if (error.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.")
      } else {
        setError(error.message || "Failed to create account. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Create your account</h2>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                id="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="enrollmentNumber" className="block text-sm font-medium text-gray-700">
                Enrollment Number
              </label>
              <input
                type="text"
                name="enrollmentNumber"
                id="enrollmentNumber"
                required
                value={formData.enrollmentNumber}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address (@nitmz.ac.in)
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleChange}
                pattern=".*@nitmz\.ac\.in$"
                title="Please use your @nitmz.ac.in email address"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                name="department"
                id="department"
                required
                value={formData.department}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700">
                Semester
              </label>
              <select
                name="semester"
                id="semester"
                required
                value={formData.semester}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select Semester</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem.toString()}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            {formData.subjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjects for {formData.department} - Semester {formData.semester}
                </label>
                <div className="bg-gray-50 p-3 rounded-md">
                  <ul className="list-disc pl-5 space-y-1">
                    {formData.subjects.map((subject, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {subject}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                required
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Continue to Face Registration"}
              </button>
            </div>

            <div className="text-center">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

