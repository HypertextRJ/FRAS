"use client";

import { useState, useEffect, useMemo } from "react";
import { db, auth } from "../firebase";
import { 
  collection, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc 
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";

export default function ManageStudents({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reAuthModalOpen, setReAuthModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student")
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
      setError(null);
    } catch (err) {
      setError("Failed to fetch students: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReAuthenticate = async (e) => {
    e.preventDefault();
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      // After re-auth, call removal
      await completeStudentRemoval(studentToDelete);
      setReAuthModalOpen(false);
      setPassword("");
      setStudentToDelete(null);
    } catch (error) {
      setError("Re-authentication failed: " + error.message);
    }
  };

  // Instead of only deleting from Firestore on the client,
  // we call our backend endpoint to remove the student from both Firestore and Auth.
  const completeStudentRemoval = async (studentId) => {
    try {
      const response = await fetch("/api/student/removeStudent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      if (!response.ok) {
        const resultText = await response.text();
        throw new Error(resultText || "Failed to remove student");
      }
      await fetchStudents();
      setError(null);
    } catch (error) {
      setError("Error removing student: " + error.message);
      console.error("Error removing student:", error);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    setLoading(true);
    try {
      await completeStudentRemoval(studentId);
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        setStudentToDelete(studentId);
        setReAuthModalOpen(true);
      } else {
        setError("Error removing student: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email) => {
    if (!email || !email.includes("@")) {
      alert("Invalid email address");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent. Please check the teacher's inbox.");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert("Failed to send password reset email. Please try again.");
    }
  };

  // Get unique semesters from students
  const uniqueSemesters = useMemo(() => {
    const semesters = students.map((student) => student.semester);
    return Array.from(new Set(semesters)).sort();
  }, [students]);

  // Get unique departments based on the selected semester
  const uniqueDepartments = useMemo(() => {
    if (!selectedSemester) return [];
    const departments = students
      .filter((student) => student.semester === selectedSemester)
      .map((student) => student.department);
    return Array.from(new Set(departments)).sort();
  }, [students, selectedSemester]);

  // Filter students based on semester, department, and search query
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedSemester && student.semester !== selectedSemester) return false;
      if (selectedDepartment && student.department !== selectedDepartment) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const nameMatch =
          student.name && student.name.toLowerCase().includes(searchLower);
        const enrollmentMatch =
          student.enrollmentNumber &&
          student.enrollmentNumber.toLowerCase().includes(searchLower);
        return nameMatch || enrollmentMatch;
      }
      return true;
    });
  }, [students, selectedSemester, selectedDepartment, searchQuery]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-0 py-6">
      {reAuthModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Please Re-authenticate</h3>
            <form onSubmit={handleReAuthenticate}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="border p-2 mb-4 w-full"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReAuthModalOpen(false);
                    setPassword("");
                    setStudentToDelete(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">Manage Students</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <select
            value={selectedSemester}
            onChange={(e) => {
              setSelectedSemester(e.target.value);
              setSelectedDepartment(""); // Reset department when semester changes
            }}
            className="border p-2 w-full rounded"
          >
            <option value="">Select Semester</option>
            {uniqueSemesters.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="border p-2 w-full rounded"
            disabled={!selectedSemester}
          >
            <option value="">Select Department</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by enrollment number or name"
          className="border p-2 w-full rounded"
        />
      </div>

      {/* Student Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Enrollment Number</th>
              <th className="border p-2 text-left">Email</th>
              <th className="border p-2 text-left">Semester</th>
              <th className="border p-2 text-left">Department</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="border p-2">{student.name}</td>
                  <td className="border p-2">{student.enrollmentNumber}</td>
                  <td className="border p-2">{student.email}</td>
                  <td className="border p-2">{student.semester}</td>
                  <td className="border p-2">{student.department}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border p-2 text-center" colSpan="6">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
