"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { db } from "../firebase"

export default function ManageUsers({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"))
        const querySnapshot = await getDocs(q)
        const userList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(userList)
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole })
      setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))
      setMessage("User role updated successfully!")
    } catch (error) {
      console.error("Error updating user role:", error)
      setMessage("Error updating user role. Please try again.")
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", userId))
        setUsers(users.filter((user) => user.id !== userId))
        setMessage("User deleted successfully!")
      } catch (error) {
        console.error("Error deleting user:", error)
        setMessage("Error deleting user. Please try again.")
      }
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      {message && <p className="mb-4 text-green-500">{message}</p>}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Role</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border p-2">{user.displayName}</td>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className="w-full p-1 border rounded"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="border p-2">
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

