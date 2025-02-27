"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { MapPin, Check, X } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { subjectMapping } from "./subjectMapping";

const getSubjectDetailsFromId = (subjectId) => {
  const [department, semesterStr, indexStr] = subjectId.split("-");
  const semester = Number(semesterStr);
  const index = Number(indexStr);
  if (
    subjectMapping[department] &&
    subjectMapping[department][semester] &&
    subjectMapping[department][semester][index] !== undefined
  ) {
    return {
      id: subjectId,
      name: subjectMapping[department][semester][index],
      department,
      semester,
    };
  }
  return null;
};

// Updated helper function to fetch both student names and enrollment numbers
const fetchStudentDetails = async (attendanceList) => {
  // Get unique userIds for records missing studentName or enrollmentNumber
  const missingIds = [
    ...new Set(
      attendanceList
        .filter((r) => (!r.studentName || !r.enrollmentNumber) && r.userId)
        .map((r) => r.userId)
    ),
  ];
  const detailsMap = {};
  await Promise.all(
    missingIds.map(async (uid) => {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        detailsMap[uid] = { name: data.name, enrollmentNumber: data.enrollmentNumber };
      }
    })
  );
  return attendanceList.map((record) => {
    let updatedRecord = { ...record };
    if (record.userId && detailsMap[record.userId]) {
      if (!record.studentName) {
        updatedRecord.studentName = detailsMap[record.userId].name;
      }
      if (!record.enrollmentNumber) {
        updatedRecord.enrollmentNumber = detailsMap[record.userId].enrollmentNumber;
      }
    }
    return updatedRecord;
  });
};

export default function ManageAttendance({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubjects();
  }, [user]);

  const fetchSubjects = async () => {
    try {
      const teacherDoc = await getDoc(doc(db, "users", user.uid));
      const teacherData = teacherDoc.data();
      console.log("Teacher Data:", teacherData);
      const subjectIDs = teacherData.assignedSubjects || teacherData.subjects || [];
      if (subjectIDs.length > 0) {
        const subjectsList = subjectIDs
          .map(getSubjectDetailsFromId)
          .filter((subject) => subject !== null);
        console.log("Fetched subjects list:", subjectsList);
        setSubjects(subjectsList);
      } else {
        console.log("No assigned subjects found in teacher data.");
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Query by subjectId only (to avoid composite index issues) then filter by date client-side.
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("subjectId", "==", selectedSubject)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      let attendanceList = attendanceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Filter records by selected date
      attendanceList = attendanceList.filter((record) => {
        const recordTime = record.timestamp.toDate();
        return recordTime >= startOfDay && recordTime <= endOfDay;
      });

      // Enrich records: fill in missing studentName and enrollmentNumber.
      attendanceList = await fetchStudentDetails(attendanceList);
      setAttendanceRecords(attendanceList);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
  };

  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value);
    setSelectedSubject("");
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleAttendanceUpdate = async (attendanceId, newStatus) => {
    try {
      await updateDoc(doc(db, "attendance", attendanceId), {
        status: newStatus,
        verified: true,
      });
      fetchAttendanceRecords();
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance. Please try again.");
    }
  };

  // Sort records by enrollment number (ascending)
  const sortedRecords = [...attendanceRecords].sort((a, b) => {
    const aEnroll = (a.enrollmentNumber || "").toString();
    const bEnroll = (b.enrollmentNumber || "").toString();
    return aEnroll.localeCompare(bEnroll);
  });

  // Filter records by search term (by name or enrollment number)
  const filteredRecords = sortedRecords.filter((record) => {
    const search = searchTerm.toLowerCase();
    const name = record.studentName ? record.studentName.toLowerCase() : "";
    const enroll = record.enrollmentNumber ? record.enrollmentNumber.toString().toLowerCase() : "";
    return name.includes(search) || enroll.includes(search);
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full bg-white p-4 md:p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">Manage Attendance</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Semester:</label>
          <select
            value={selectedSemester}
            onChange={handleSemesterChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Subject:</label>
          <select
            value={selectedSubject}
            onChange={handleSubjectChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">Select Subject</option>
            {subjects
              .filter((subject) => subject.semester === Number.parseInt(selectedSemester))
              .map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by Name or Enrollment No."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>
      <div className="mb-6">
        <button
          onClick={fetchAttendanceRecords}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          disabled={!selectedSubject || !selectedDate}
        >
          Fetch Attendance Records
        </button>
      </div>
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      {filteredRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left text-sm md:text-base">Enrollment No.</th>
                <th className="border p-2 text-left text-sm md:text-base">Student</th>
                <th className="border p-2 text-left text-sm md:text-base">Time</th>
                <th className="border p-2 text-left text-sm md:text-base">Status</th>
                <th className="border p-2 text-left text-sm md:text-base">Location</th>
                <th className="border p-2 text-left text-sm md:text-base">Face Match %</th>
                <th className="border p-2 text-left text-sm md:text-base">Verified</th>
                <th className="border p-2 text-left text-sm md:text-base">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-sm md:text-base">
                    {record.enrollmentNumber || "N/A"}
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    {record.studentName || record.userId || "N/A"}
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    {record.timestamp.toDate().toLocaleTimeString()}
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    <span
                      className={`px-2 py-1 rounded-full text-xs md:text-sm ${
                        record.status === "Present"
                          ? "bg-green-200 text-green-800"
                          : record.status === "Late"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    <div className="flex items-center">
                      <MapPin size={16} className="mr-1 text-gray-500" />
                      <span>{record.location?.name}</span>
                    </div>
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    <span
                      className={`font-semibold ${
                        record.faceMatchPercentage >= 85 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {record.faceMatchPercentage?.toFixed(2)}%
                    </span>
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    {record.verified ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-yellow-600">No</span>
                    )}
                  </td>
                  <td className="border p-2 text-sm md:text-base">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAttendanceUpdate(record.id, "Present")}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors text-xs md:text-sm"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleAttendanceUpdate(record.id, "Absent")}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors text-xs md:text-sm"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500 text-center py-4">
          No attendance records found.
        </div>
      )}
    </div>
  );
}
