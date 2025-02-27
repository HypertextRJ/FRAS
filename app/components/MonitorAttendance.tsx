"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "../firebase"
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import LoadingSpinner from "./LoadingSpinner"

const DEPARTMENTS = ["CSE", "ME", "EE", "ECE", "CE", "MC"]

// Import your subjectMapping (should be an object mapping department & semester to an array of subject names)
import { subjectMapping } from "./subjectMapping"

// Helper to convert a subject ID (e.g., "CSE-8-2") to subject details using subjectMapping
const getSubjectDetailsFromId = (subjectId) => {
  const parts = subjectId.split("-")
  if (parts.length !== 3) return null
  const [dept, sem, index] = parts
  if (
    subjectMapping[dept] &&
    subjectMapping[dept][sem] &&
    subjectMapping[dept][sem][index] !== undefined
  ) {
    return {
      id: subjectId,
      name: subjectMapping[dept][sem][index],
      department: dept,
      semester: sem,
    }
  }
  return null
}

export default function MonitorAttendance({ user }) {
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [attendanceSummary, setAttendanceSummary] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch students based on selected semester and department
  const fetchStudents = useCallback(async () => {
    if (!selectedSemester || !selectedDepartment) return

    setLoading(true)
    setError("")
    try {
      console.log("Fetching students for:", selectedDepartment, selectedSemester)
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("department", "==", selectedDepartment),
        where("semester", "==", selectedSemester)
      )
      const snapshot = await getDocs(studentsQuery)
      const studentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log("Fetched students:", studentsList)
      setStudents(studentsList)
      if (studentsList.length === 0) {
        setError("No students found for the selected semester and department.")
      }
    } catch (err) {
      console.error("Error fetching students:", err)
      setError("Failed to fetch students. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [selectedDepartment, selectedSemester])

  useEffect(() => {
    if (selectedSemester && selectedDepartment) {
      fetchStudents()
    }
  }, [selectedSemester, selectedDepartment, fetchStudents])

  // Fetch overall attendance summary for a given student
  const fetchAttendanceSummary = async (student) => {
    try {
      if (!student.subjects || student.subjects.length === 0) {
        return { details: [], overall: { total: 0, attended: 0, percentage: "0.0" } }
      }
      // For each subject in the student's subjects array, query total classes and attendance records
      const summaryPromises = student.subjects.map(async (subjectId) => {
        // Use subjectMapping to get subject name for query
        const details = getSubjectDetailsFromId(subjectId)
        const querySubject = details ? details.name : subjectId

        // Query total classes using subjectName
        const classesQuery = query(
          collection(db, "classes"),
          where("subjectName", "==", querySubject)
        )
        const classesSnapshot = await getDocs(classesQuery)
        let totalClasses = classesSnapshot.size

        // Query attendance records for this student using subjectName
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("userId", "==", student.id),
          where("subjectName", "==", querySubject)
        )
        const attendanceSnapshot = await getDocs(attendanceQuery)
        let attendedClasses = attendanceSnapshot.size

        console.log(`Subject ${subjectId} (${querySubject}): totalClasses=${totalClasses}, attendedClasses=${attendedClasses}`)

        const percentage = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(1) : "0.0"
        return {
          subjectId,
          subjectName: querySubject,
          total: totalClasses,
          attended: attendedClasses,
          percentage,
        }
      })

      const detailsArray = await Promise.all(summaryPromises)
      const overallTotal = detailsArray.reduce((sum, d) => sum + d.total, 0)
      const overallAttended = detailsArray.reduce((sum, d) => sum + d.attended, 0)
      const overallPercentage = overallTotal > 0 ? ((overallAttended / overallTotal) * 100).toFixed(1) : "0.0"

      return {
        details: detailsArray,
        overall: { total: overallTotal, attended: overallAttended, percentage: overallPercentage },
      }
    } catch (error) {
      console.error("Error fetching attendance summary:", error)
      setError("Failed to fetch attendance summary. Please try again.")
      return { details: [], overall: { total: 0, attended: 0, percentage: "0.0" } }
    }
  }

  return (
    <div className="w-full space-y-6 p-0">
      <h2 className="text-2xl font-bold mb-4">Monitor Attendance</h2>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Choose a semester</option>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Choose a department</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      {students.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">Students List</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={async () => {
                      setSelectedStudent(student)
                      const summary = await fetchAttendanceSummary(student)
                      setAttendanceSummary(summary)
                      setModalOpen(true)
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.enrollmentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Summary Modal */}
      {modalOpen && selectedStudent && attendanceSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              Attendance Summary for {selectedStudent.name}
            </h3>
            <div className="mb-4">
              <p className="font-medium">
                Overall Attendance: {attendanceSummary.overall.attended} / {attendanceSummary.overall.total} (
                {attendanceSummary.overall.percentage}%)
              </p>
            </div>
            <div className="space-y-2">
              {attendanceSummary.details.map((item) => (
                <div key={item.subjectId} className="flex justify-between">
                  <span className="font-medium">{item.subjectName}</span>
                  <span>
                    {item.attended} / {item.total} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setModalOpen(false)
                setSelectedStudent(null)
                setAttendanceSummary(null)
              }}
              className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
