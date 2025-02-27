"use client"

import { useState } from "react"
import { updateProfile } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

export default function UpdateProfile({ user }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
  })
  const [message, setMessage] = useState("")

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateProfile(user, {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
      })
      await updateDoc(doc(db, "users", user.uid), {
        displayName: formData.displayName,
        photoURL: formData.photoURL,
      })
      setMessage("Profile updated successfully!")
    } catch (error) {
      setMessage("Error updating profile. Please try again.")
    }
  }

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4">Update Profile</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="displayName" className="block mb-2">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="photoURL" className="block mb-2">
            Photo URL
          </label>
          <input
            type="url"
            id="photoURL"
            name="photoURL"
            value={formData.photoURL}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Update Profile
        </button>
      </form>
      {message && <p className="mt-4 text-green-500">{message}</p>}
    </div>
  )
}

