"use client"

import { useState, useEffect } from "react"
import { db } from "../firebase"
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore"
import LoadingSpinner from "./LoadingSpinner"
import { subjectMapping } from "./subjectMapping";

export default function AssignSubjects({ user }) {
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"))
      const snapshot = await getDocs(teachersQuery)
      const teachersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setTeachers(teachersList)
    } catch (error) {
      console.error("Error fetching teachers:", error)
      setError("Failed to fetch teachers")
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async () => {
    if (!selectedTeacher || !selectedSemester) return

    setLoading(true)
    try {
      const selectedTeacherRef = doc(db, "users", selectedTeacher)
      const selectedTeacherDoc = await getDoc(selectedTeacherRef)
      const teacherData = selectedTeacherDoc.data()

      const department = teacherData.department
      const semester = Number.parseInt(selectedSemester)

      if (subjectMapping[department] && subjectMapping[department][semester]) {
        const subjectsList = subjectMapping[department][semester].map((subjectName, index) => ({
          id: `${department}-${semester}-${index}`, // Generate unique ID
          name: subjectName,
          department: department,
          semester: semester,
          isAssigned: teacherData.assignedSubjects?.includes(`${department}-${semester}-${index}`) || false,
        }))
        setSubjects(subjectsList)
      } else {
        setSubjects([])
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      setError("Failed to fetch subjects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTeacher && selectedSemester) {
      fetchSubjects()
    }
  }, [selectedTeacher, selectedSemester])

  const handleTeacherChange = (e) => {
    setSelectedTeacher(e.target.value)
    setSubjects([])
  }

  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value)
    setSubjects([])
  }

  const handleSubjectAssignment = async (subjectId, isAssigning) => {
    setLoading(true)
    try {
      const teacherRef = doc(db, "users", selectedTeacher)

      await updateDoc(teacherRef, {
        assignedSubjects: isAssigning ? arrayUnion(subjectId) : arrayRemove(subjectId),
      })

      // Refresh the subjects list
      await fetchSubjects()
    } catch (error) {
      console.error("Error updating subject assignment:", error)
      setError("Failed to update subject assignment")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="w-full space-y-6">
      <h2 className="text-2xl font-bold mb-4">Assign Subjects to Teachers</h2>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>}

      <div className="grid gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Teacher</label>
              <select value={selectedTeacher} onChange={handleTeacherChange} className="w-full p-2 border rounded-md">
                <option value="">Choose a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Semester</label>
              <select value={selectedSemester} onChange={handleSemesterChange} className="w-full p-2 border rounded-md">
                <option value="">Choose a semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedTeacher && selectedSemester && subjects.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Available Subjects</h3>
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-sm text-gray-500">
                      {subject.department} - Semester {subject.semester}
                    </p>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={subject.isAssigned}
                      onChange={() => handleSubjectAssignment(subject.id, !subject.isAssigned)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {subject.isAssigned ? "Assigned" : "Assign"}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTeacher && selectedSemester && subjects.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded">
            No subjects available for the selected semester and department.
          </div>
        )}
      </div>
    </div>
  )
}

