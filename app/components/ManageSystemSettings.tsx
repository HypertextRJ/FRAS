"use client"

import { useState, useEffect } from "react"
import { db } from "../firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

export default function ManageSystemSettings({ user }) {
  const [settings, setSettings] = useState({
    attendanceCutoffTime: 15,
    gracePeriod: 5,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, "systemSettings", "attendance"))
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data())
      }
      setLoading(false)
    } catch (error) {
      console.error("Error fetching settings:", error)
      setLoading(false)
    }
  }

  const handleSettingChange = (e) => {
    const { name, value } = e.target
    setSettings({ ...settings, [name]: Number.parseInt(value) })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Using setDoc with merge: true creates the document if it doesn't exist.
      await setDoc(doc(db, "systemSettings", "attendance"), settings, { merge: true })
      alert("Settings updated successfully")
    } catch (error) {
      console.error("Error updating settings:", error)
      alert("Error updating settings")
    }
    setLoading(false)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Manage System Settings</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="attendanceCutoffTime" className="block mb-2">
            Attendance Cutoff Time (minutes)
          </label>
          <input
            type="number"
            id="attendanceCutoffTime"
            name="attendanceCutoffTime"
            value={settings.attendanceCutoffTime}
            onChange={handleSettingChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="gracePeriod" className="block mb-2">
            Grace Period (minutes)
          </label>
          <input
            type="number"
            id="gracePeriod"
            name="gracePeriod"
            value={settings.gracePeriod}
            onChange={handleSettingChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Save Settings
        </button>
      </form>
    </div>
  )
}
