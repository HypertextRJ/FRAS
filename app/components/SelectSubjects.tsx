import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { MapPin, Check, X } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { subjectMapping } from "./subjectMapping";

// Helper: Convert a subject ID to subject details using subjectMapping.
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

// Helper: Fetch missing student details (name & enrollmentNumber) for attendance records.
const fetchStudentDetails = async (attendanceList) => {
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

// Determine color class based on percentage.
const getPercentageColorClass = (percentage) => {
  if (percentage < 50) return "text-red-600";
  if (percentage < 75) return "text-yellow-600";
  return "text-green-600";
};

export default function SelectSubjects({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // keyed by subject id
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Fetch subjects from the teacher's document.
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        console.log("User Data:", userData);
        if (!userData?.subjects || userData.subjects.length === 0) {
          setSubjects([]);
          setLoading(false);
          return;
        }
        // Convert array of subject names into objects with an auto-generated id.
        const subjectsData = userData.subjects.map((subjectName, index) => ({
          id: `subject-${index}`,
          name: subjectName,
        }));
        console.log("Processed Subjects Data:", subjectsData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setError("Failed to fetch subjects");
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [user]);

  // Fetch attendance records and calculate summary for a given subject (by subject name).
  const fetchAttendanceRecords = async (subjectName) => {
    try {
      // 1. Fetch attendance records for this subject.
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("subjectName", "==", subjectName)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      let records = attendanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp.toDate(),
      }));

      // 2. Fetch scheduled classes for this subject.
      const classesQuery = query(
        collection(db, "classes"),
        where("subjectName", "==", subjectName)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const now = new Date();
      const scheduledClasses = classesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      }));

      // 3. Get classes that have ended.
      const endedClasses = scheduledClasses.filter((cls) => cls.endTime < now);

      // 4. For each ended class with no attendance record, add an "Absent" record.
      endedClasses.forEach((cls) => {
        if (!records.some((record) => record.classId === cls.id)) {
          records.push({
            id: `absent-${cls.id}`,
            classId: cls.id,
            subjectName,
            status: "Absent",
            date: cls.endTime,
          });
        }
      });

      // 5. (Optional) Filter records by selected date.
      // Commented out for overall summary.
      /*
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selected);
      endOfDay.setHours(23, 59, 59, 999);
      records = records.filter((record) => {
        const recordTime = record.timestamp.toDate();
        return recordTime >= selected && recordTime <= endOfDay;
      });
      */

      // 6. Sort records by date descending.
      records.sort((a, b) => b.date - a.date);

      // 7. Calculate summary.
      const totalClasses = records.length;
      const presentClasses = records.filter(
        (record) => record.status === "Present" || record.status === "Late"
      ).length;
      const percentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

      // 8. Enrich records with student details.
      records = await fetchStudentDetails(records);
      return { attendanceRecords: records, percentage, totalClasses, presentClasses };
    } catch (error) {
      console.error("Error fetching attendance for subject:", subjectName, error);
      return { attendanceRecords: [], percentage: 0, totalClasses: 0, presentClasses: 0 };
    }
  };

  // Once subjects are loaded, fetch attendance for each subject.
  useEffect(() => {
    const fetchAllAttendance = async () => {
      const data = {};
      for (const subject of subjects) {
        data[subject.id] = await fetchAttendanceRecords(subject.name);
      }
      setAttendanceData(data);
    };
    if (subjects.length > 0) {
      fetchAllAttendance();
    }
  }, [subjects, user]);

  const handleSubjectChange = (e) => {
    setSelectedSubject(e.target.value);
  };

  const handleSemesterChange = (e) => {
    setSelectedSemester(e.target.value);
    setSelectedSubject("");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl w-full mx-auto p-0 space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">My Subjects & Attendance</h2>
      {subjects.length === 0 ? (
        <p className="text-gray-500">No subjects assigned.</p>
      ) : (
        subjects.map((subject) => {
          const attendance = attendanceData[subject.id] || { attendanceRecords: [], percentage: 0, totalClasses: 0, presentClasses: 0 };
          const percentageColor = getPercentageColorClass(attendance.percentage);
          return (
            <div
              key={subject.id}
              className="mb-8 p-4 sm:p-6 bg-white rounded-lg shadow cursor-pointer transition-colors hover:bg-gray-50"
              onClick={() =>
                setSelectedSubject(subject.id === selectedSubject ? null : subject.id)
              }
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h3 className="text-xl sm:text-2xl font-semibold">{subject.name}</h3>
                <p className="mt-2 sm:mt-0 text-sm sm:text-base font-medium text-gray-800">
                   {attendance.presentClasses} /  {attendance.totalClasses} ({" "}
                  <span className={percentageColor}>
                    {attendance.percentage.toFixed(1)}%
                  </span>)
                </p>
              </div>
              {selectedSubject === subject.id && (
                <div className="mt-4">
                  <h4 className="text-lg font-medium mb-2">Attendance Records for {subject.name}</h4>
                  {attendance.attendanceRecords.length === 0 ? (
                    <p className="text-gray-500">No attendance records found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-2 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-4 sm:px-6 py-2 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-4 sm:px-6 py-2 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {attendance.attendanceRecords.map((record, index) => (
                            <tr key={record.id || index} className="hover:bg-gray-50">
                              <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {record.date.toLocaleDateString()}
                              </td>
                              <td className="px-4 sm:px-6 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {record.date.toLocaleTimeString()}
                              </td>
                              <td className="px-4 sm:px-6 py-2 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs sm:text-sm leading-5 font-semibold rounded-full ${
                                    record.status === "Present"
                                      ? "bg-green-100 text-green-800"
                                      : record.status === "Late"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
