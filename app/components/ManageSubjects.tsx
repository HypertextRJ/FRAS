"use client"

import { useState, useEffect } from "react"
import { db } from "../firebase"
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, getDoc } from "firebase/firestore"

// Constants for dropdowns
const DEPARTMENTS = ["CSE", "ME", "EE", "ECE", "CE", "MC"]
const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1)

export default function ManageSubjects({ user }) {
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState({ name: "", department: DEPARTMENTS[0], semester: "1" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      // Get teacher's assigned subjects
      const teacherDoc = await getDoc(doc(db, "users", user.uid))
      const teacherData = teacherDoc.data()
      
      if (teacherData?.assignedSubjects?.length > 0) {
        // Query subjects that this teacher is assigned to
        const subjectsQuery = query(collection(db, "subjects"), where("teacherId", "==", user.uid))
        const subjectsSnapshot = await getDocs(subjectsQuery)
        const subjectsList = subjectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setSubjects(subjectsList)
      } else {
        setSubjects([])
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      setError("Failed to fetch subjects. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    setError("")
    try {
      const docRef = await addDoc(collection(db, "subjects"), {
        ...newSubject,
        teacherId: user.uid,
        createdAt: new Date(),
      })

      // Update the teacher's assignedSubjects array
      const teacherRef = doc(db, "users", user.uid)
      const teacherDoc = await getDoc(teacherRef)
      const currentSubjects = teacherDoc.data()?.assignedSubjects || []
      
      await updateDoc(teacherRef, {
        assignedSubjects: [...currentSubjects, docRef.id]
      })

      setNewSubject({ name: "", department: DEPARTMENTS[0], semester: "1" })
      fetchSubjects()
    } catch (error) {
      console.error("Error adding subject:", error)
      setError("Failed to add subject. Please check your permissions and try again.")
    }
  }

  const handleUpdateSubject = async (id, updatedData) => {
    try {
      await updateDoc(doc(db, "subjects", id), updatedData)
      fetchSubjects()
    } catch (error) {
      console.error("Error updating subject:", error)
      setError("Failed to update subject. Please try again.")
    }
  }

  const handleDeleteSubject = async (id) => {
    try {
      await deleteDoc(doc(db, "subjects", id))
      
      // Remove subject from teacher's assignedSubjects
      const teacherRef = doc(db, "users", user.uid)
      const teacherDoc = await getDoc(teacherRef)
      const assignedSubjects = teacherDoc.data()?.assignedSubjects || []
      await updateDoc(teacherRef, {
        assignedSubjects: assignedSubjects.filter(subjectId => subjectId !== id)
      })

      fetchSubjects()
    } catch (error) {
      console.error("Error deleting subject:", error)
      setError("Failed to delete subject. Please try again.")
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Manage Subjects</h2>
      
      {error && (
        <div className="mb-4 p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleAddSubject} className="mb-8 p-4 bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Subject Name"
            value={newSubject.name}
            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            className="p-2 border rounded"
            required
          />
          
          <select
            value={newSubject.department}
            onChange={(e) => setNewSubject({ ...newSubject, department: e.target.value })}
            className="p-2 border rounded"
            required
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={newSubject.semester}
            onChange={(e) => setNewSubject({ ...newSubject, semester: e.target.value })}
            className="p-2 border rounded"
            required
          >
            {SEMESTERS.map((sem) => (
              <option key={sem} value={sem.toString()}>
                Semester {sem}
              </option>
            ))}
          </select>

          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Add Subject
          </button>
        </div>
      </form>

      {subjects.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">No subjects assigned yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold mb-2">{subject.name}</h3>
              <div className="space-y-1 mb-4">
                <p className="text-gray-600">Department: {subject.department}</p>
                <p className="text-gray-600">Semester: {subject.semester}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newName = prompt("Enter new subject name:", subject.name)
                    if (newName) handleUpdateSubject(subject.id, { name: newName })
                  }}
                  className="flex-1 bg-yellow-500 text-white px-3 py-1.5 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this subject?")) {
                      handleDeleteSubject(subject.id)
                    }
                  }}
                  className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}