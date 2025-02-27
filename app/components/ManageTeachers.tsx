"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import LoadingSpinner from "./LoadingSpinner";

const DEPARTMENTS = ["CSE", "ME", "EE", "ECE", "CE", "MC"];
const DESIGNATIONS = [
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Head of Department",
];

export default function ManageTeachers({ user }) {
  const [teachers, setTeachers] = useState([]);
  const [newTeacher, setNewTeacher] = useState({
    name: "",
    email: "",
    department: DEPARTMENTS[0],
    designation: DESIGNATIONS[0],
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("All");

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const teachersQuery = query(
        collection(db, "users"),
        where("role", "==", "teacher")
      );
      const teachersSnapshot = await getDocs(teachersQuery);
      const teachersList = teachersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeachers(teachersList);
    } catch (err) {
      console.error("Error fetching teachers:", err);
      setError("Failed to fetch teachers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!newTeacher.password.trim()) {
      setError("Password is required for new teacher.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/teacher/createTeacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTeacher),
      });

      if (!response.ok) {
        const resultText = await response.text();
        throw new Error(resultText || "Failed to create teacher (endpoint not implemented)");
      }

      const result = await response.json();
      alert("Teacher created successfully");
      setNewTeacher({
        name: "",
        email: "",
        department: DEPARTMENTS[0],
        designation: DESIGNATIONS[0],
        password: "",
      });
      fetchTeachers();
      setShowAddTeacherModal(false);
    } catch (err) {
      console.error("Error adding teacher:", err);
      setError("Failed to add teacher: " + err.message);
    }
    setLoading(false);
  };

  const handleRemoveTeacher = async (teacherId) => {
    if (!window.confirm("Are you sure you want to remove this teacher?")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/removeTeacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId }),
      });
      if (!response.ok) {
        const resultText = await response.text();
        throw new Error(resultText || "Failed to remove teacher (endpoint not implemented)");
      }
      alert("Teacher removed successfully");
      fetchTeachers();
    } catch (err) {
      console.error("Error removing teacher:", err);
      alert("Error removing teacher: " + err.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async (email) => {
    if (!email || !email.includes("@")) {
      alert("Invalid email address");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent. Please check the teacher's inbox.");
    } catch (err) {
      console.error("Error sending password reset email:", err);
      alert("Failed to send password reset email. Please try again.");
    }
  };

  const filteredTeachers = selectedDepartmentFilter === "All"
    ? teachers
    : teachers.filter((teacher) => teacher.department === selectedDepartmentFilter);

  const groupedTeachers = filteredTeachers.reduce((groups, teacher) => {
    const dept = teacher.department || "Unknown";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(teacher);
    return groups;
  }, {});

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-0 py-6">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">Manage Teachers</h2>

      {error && (
        <div className="mb-4 p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Add New Teacher Button */}
      <button
        onClick={() => setShowAddTeacherModal(true)}
        className="mb-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Add New Teacher
      </button>

      {/* Department Filter Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Filter by Department:</label>
        <select
          value={selectedDepartmentFilter}
          onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="All">All Departments</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Modal Popup for Adding Teacher */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Teacher</h3>
            <form onSubmit={handleAddTeacher}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  className="p-2 border rounded"
                  required
                />
                <select
                  value={newTeacher.department}
                  onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
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
                  value={newTeacher.designation}
                  onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                  className="p-2 border rounded"
                  required
                >
                  {DESIGNATIONS.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
                <input
                  type="password"
                  placeholder="Password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  className="p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="bg-gray-300 text-black px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Add Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teachers List, grouped by department */}
      {Object.keys(groupedTeachers)
        .sort()
        .map((dept) => (
          <div key={dept} className="mb-8">
            <h3 className="text-xl font-semibold mb-4">{dept} Department</h3>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Department</th>
                    <th className="px-4 py-2 text-left">Designation</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTeachers[dept].map((teacher) => (
                    <tr key={teacher.id} className="border-t">
                      <td className="px-4 py-2">{teacher.name}</td>
                      <td className="px-4 py-2">{teacher.email}</td>
                      <td className="px-4 py-2">{teacher.department}</td>
                      <td className="px-4 py-2">{teacher.designation}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleRemoveTeacher(teacher.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 mr-2 text-sm"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => handleResetPassword(teacher.email)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
