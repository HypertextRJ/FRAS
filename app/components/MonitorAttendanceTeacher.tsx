"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import ExportAttendance from "./ExportAttendance";
import { subjectMapping } from "./subjectMapping";

const DEPARTMENTS = ["CSE", "ME", "EE", "ECE", "CE", "MC"];

// Helper to convert a subject ID (e.g., "CSE-8-2") to subject details using subjectMapping
const getSubjectDetailsFromId = (subjectId) => {
  const parts = subjectId.split("-");
  if (parts.length !== 3) return null;
  const [dept, sem, index] = parts;
  if (subjectMapping[dept] && subjectMapping[dept][sem] && subjectMapping[dept][sem][index] !== undefined) {
    return {
      id: subjectId,
      name: subjectMapping[dept][sem][index],
      department: dept,
      semester: sem,
    };
  }
  return null;
};

export default function MonitorAttendanceTeacher({ user }) {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Fetch teacher's assigned subjects from Firestore
  useEffect(() => {
    const fetchAssignedSubjects = async () => {
      try {
        const teacherDoc = await getDoc(doc(db, "users", user.uid));
        const teacherData = teacherDoc.data();
        if (teacherData && teacherData.assignedSubjects) {
          const subjects = teacherData.assignedSubjects
            .map(getSubjectDetailsFromId)
            .filter(Boolean);
          setAssignedSubjects(subjects);
        }
      } catch (err) {
        console.error("Error fetching assigned subjects:", err);
        setError("Unable to fetch assigned subjects.");
      }
    };
    if (user && user.uid) {
      fetchAssignedSubjects();
    }
  }, [user]);

  // Fetch students based on selected department and semester (do not filter by subject)
  const fetchStudents = useCallback(async () => {
    if (!selectedDepartment || !selectedSemester) return;
    setLoading(true);
    setError("");
    try {
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("department", "==", selectedDepartment),
        where("semester", "==", selectedSemester)
      );
      const snapshot = await getDocs(studentsQuery);
      const studentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(studentsList);
      if (studentsList.length === 0) {
        setError("No students found for the selected criteria.");
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedSemester]);

  useEffect(() => {
    if (selectedDepartment && selectedSemester) {
      fetchStudents();
    }
  }, [selectedDepartment, selectedSemester, fetchStudents]);

  // Fetch attendance summary for a given student for the selected subject
  const fetchAttendanceSummary = async (student) => {
    try {
      if (!selectedSubject) {
        return {
          details: [],
          overall: { total: 0, attended: 0, percentage: "0.0" },
        };
      }
      // Query total classes for the subject using subjectId
      const classesQuery = query(
        collection(db, "classes"),
        where("subjectId", "==", selectedSubject)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const totalClasses = classesSnapshot.size;

      // Query attendance records for the student using subjectId
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("userId", "==", student.id),
        where("subjectId", "==", selectedSubject)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendedClasses = attendanceSnapshot.size;

      const percentage =
        totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(1) : "0.0";

      return {
        details: [
          {
            subjectId: selectedSubject,
            subjectName:
              (getSubjectDetailsFromId(selectedSubject) && getSubjectDetailsFromId(selectedSubject).name) ||
              selectedSubject,
            total: totalClasses,
            attended: attendedClasses,
            percentage,
          },
        ],
        overall: { total: totalClasses, attended: attendedClasses, percentage },
      };
    } catch (err) {
      console.error("Error fetching attendance summary:", err);
      setError("Failed to fetch attendance summary. Please try again.");
      return {
        details: [],
        overall: { total: 0, attended: 0, percentage: "0.0" },
      };
    }
  };

  return (
    <div className="w-full space-y-6">
      <h2 className="text-2xl font-bold mb-4">Monitor Attendance</h2>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setStudents([]);
                setError("");
              }}
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
          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setStudents([]);
                setError("");
              }}
              className="w-full p-2 border rounded-md"
              disabled={!selectedDepartment}
            >
              <option value="">Choose a semester</option>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={!selectedDepartment || !selectedSemester}
            >
              <option value="">Choose a subject</option>
              {assignedSubjects
                .filter(
                  (sub) =>
                    sub.department === selectedDepartment &&
                    sub.semester === selectedSemester
                )
                .map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Export Attendance */}
      {students.length > 0 && selectedSubject && (
        <div>
          <button
            onClick={() => setShowExport(!showExport)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            {showExport ? "Hide Export" : "Export Attendance"}
          </button>
          {showExport && (
            <ExportAttendance
              user={user}
              selectedSubject={selectedSubject}
              selectedDepartment={selectedDepartment}
              selectedSemester={selectedSemester}
              onClose={() => setShowExport(false)}
            />
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && <div className="text-center text-gray-600">Loading students...</div>}

      {/* Students List */}
      {students.length > 0 && !loading && (
        <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4">Students List</h3>
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
                    const summary = await fetchAttendanceSummary(student);
                    setSelectedStudent(student);
                    setAttendanceSummary(summary);
                    setModalOpen(true);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.enrollmentNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                Overall Attendance: {attendanceSummary.overall.attended} /{" "}
                {attendanceSummary.overall.total} ({attendanceSummary.overall.percentage}%)
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
                setModalOpen(false);
                setSelectedStudent(null);
                setAttendanceSummary(null);
              }}
              className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
