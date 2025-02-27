"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, writeBatch } from "firebase/firestore"
import { db } from "../firebase"

interface User {
  uid: string;
}

export default function MarkStudentAttendance({ user }: { user: User }) {
  const [students, setStudents] = useState<{ id: string; displayName: string }[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "student"))
        const querySnapshot = await getDocs(q)
        const studentList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            displayName: data.displayName,
          };
        })
        setStudents(studentList)
      } catch (error) {
        console.error("Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const batch = writeBatch(db)
      const attendanceRef = collection(db, "attendance")
      const now = new Date()

      selectedStudents.forEach((studentId) => {
        const docRef = doc(attendanceRef, studentId.toString() + now.getTime().toString()) //Added studentID to docRef
        batch.set(docRef, {
          userId: studentId,
          date: now,
          status: "Present",
          markedBy: user.uid,
        })
      })

      await batch.commit()
      setMessage("Attendance marked successfully!")
    } catch (error) {
      console.error("Error marking attendance:", error)
      setMessage("Error marking attendance. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Mark Student Attendance</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          {students.map((student) => (
            <label key={student.id} className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={selectedStudents.includes(student.id)}
                onChange={() => handleStudentToggle(student.id)}
                className="mr-2"
              />
              {student.displayName}
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={selectedStudents.length === 0 || loading}
        >
          Mark Attendance
        </button>
      </form>
      {message && <p className="mt-4 text-green-500">{message}</p>}
    </div>
  )
}

