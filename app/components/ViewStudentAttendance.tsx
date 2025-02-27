"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, where } from "firebase/firestore"
import { db } from "../firebase"

export default function ViewStudentAttendance({ user }) {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "student"))
        const querySnapshot = await getDocs(q)
        const studentList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setStudents(studentList)
      } catch (error) {
        console.error("Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

  const fetchAttendance = async (studentId) => {
    setLoading(true)
    try {
      const q = query(collection(db, "attendance"), where("userId", "==", studentId))
      const querySnapshot = await getDocs(q)
      const records = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAttendanceRecords(records)
      setSelectedStudent(students.find((s) => s.id === studentId))
    } catch (error) {
      console.error("Error fetching attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">View Student Attendance</h2>
      <select onChange={(e) => fetchAttendance(e.target.value)} className="w-full mb-4 p-2 border rounded">
        <option value="">Select a student</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.displayName}
          </option>
        ))}
      </select>
      {selectedStudent && (
        <div>
          <h3 className="text-xl font-bold mb-2">Attendance for {selectedStudent.displayName}</h3>
          {attendanceRecords.length === 0 ? (
            <p>No attendance records found.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="border p-2">{record.date.toDate().toLocaleDateString()}</td>
                    <td className="border p-2">{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

