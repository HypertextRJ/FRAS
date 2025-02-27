"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

const roles = ["Student", "Teacher", "Admin"]

export default function Login() {
  const [role, setRole] = useState("Student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (error) {
      setError("Invalid email or password")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center text-blue-800">Login to Your Account</h3>
        <div className="mt-4 flex justify-center space-x-4">
          {roles.map((r) => (
            <button
              key={r}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                role === r ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-600"
              }`}
              onClick={() => setRole(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <form onSubmit={handleLogin}>
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
          <div className="mt-4">
            <label className="block" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex items-center justify-between mt-4">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
            {role === "Student" && (
              <Link href="/signup" className="text-sm text-blue-600 hover:underline">
                Create Account
              </Link>
            )}
          </div>
          <div className="flex items-center justify-center mt-4">
            <button className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-900" type="submit">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

