"use client"

import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "../firebase"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage("Password reset email sent. Please check your inbox.")
      setError("")
    } catch (error) {
      setError("Failed to send password reset email")
      setMessage("")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center text-blue-800">Reset Your Password</h3>
        <form onSubmit={handleResetPassword}>
          <div className="mt-4">
            <label className="block" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
          <div className="flex items-center justify-center mt-4">
            <button className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-900" type="submit">
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

