"use client";

import { useState } from "react";
import { collection, query, where, getDocs, getDoc, doc as fbDoc } from "firebase/firestore";
import { db } from "../firebase";
import dynamic from "next/dynamic";
import { subjectMapping } from "./subjectMapping";

const jsPDF = dynamic(() => import("jspdf"), { ssr: false });
const autoTable = dynamic(() => import("jspdf-autotable"), { ssr: false });
const XLSX = dynamic(() => import("xlsx"), { ssr: false });

/*
  Props expected:
    user
    selectedDepartment (e.g. "CSE")
    selectedSemester (e.g. "8")
    selectedSubject (e.g. "CSE-8-1")
    onClose (function to close the popup)
*/
export default function ExportAttendance({
  user,
  selectedDepartment,
  selectedSemester,
  selectedSubject,
  onClose = () => {
    console.log("Close clicked");
  },
}) {
  // Convert selected subject ID to its display name using subjectMapping.
  let subjectDisplayName = "";
  if (selectedDepartment && selectedSemester && selectedSubject) {
    const parts = selectedSubject.split("-");
    if (parts.length === 3) {
      const [dept, sem, index] = parts;
      if (
        subjectMapping[dept] &&
        subjectMapping[dept][sem] &&
        subjectMapping[dept][sem][index] !== undefined
      ) {
        subjectDisplayName = subjectMapping[dept][sem][index];
      }
    }
  }

  // Local state for date range and export format.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportType, setExportType] = useState("pdf");
  const [loading, setLoading] = useState(false);

  // Build a summary table: one row per student with:
  // 1) Enrollment No.
  // 2) Name of Student
  // 3) Classes Present (attendance records with status not "absent")
  // 4) Classes Taken (from the classes collection)
  // 5) Attendance Percentage
  const fetchSummaryData = async () => {
    // 1) Fetch students in the same department & semester.
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("department", "==", selectedDepartment),
      where("semester", "==", selectedSemester)
    );
    const studentsSnap = await getDocs(studentsQuery);
    const studentsList = studentsSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // 2) Determine date range.
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    // 3) Fetch total classes from "classes" collection for this subject in the date range.
    const classesRef = collection(db, "classes");
    const classesQ = query(
      classesRef,
      where("subjectId", "==", selectedSubject),
      where("startTime", ">=", start),
      where("startTime", "<=", end)
    );
    const classesSnap = await getDocs(classesQ);
    const totalClasses = classesSnap.size;

    // 4) Fetch attendance docs for the subject in the date range.
    const attendanceRef = collection(db, "attendance");
    const attendanceQ = query(
      attendanceRef,
      where("subjectId", "==", selectedSubject),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );
    const attendanceSnap = await getDocs(attendanceQ);
    const attendanceList = attendanceSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // 5) Group attendance by userId to count present records.
    const attendanceCountMap = {};
    attendanceList.forEach((rec) => {
      if (!rec.userId) return;
      // Count as "present" if status is not "absent" (case-insensitive)
      const wasPresent = rec.status?.toLowerCase() !== "absent";
      if (wasPresent) {
        attendanceCountMap[rec.userId] = (attendanceCountMap[rec.userId] || 0) + 1;
      }
    });

    // 6) Build a summary row for each student.
    const rows = studentsList.map((student) => {
      const enrollmentNumber = student.enrollmentNumber || "";
      const studentName = student.name || "";
      const presentCount = attendanceCountMap[student.id] || 0;
      const percentage =
        totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : "0.0";
      return {
        enrollmentNumber,
        studentName,
        presentCount,
        totalClasses,
        percentage,
      };
    });

    // Sort ascending by Enrollment No.
    rows.sort((a, b) => a.enrollmentNumber.localeCompare(b.enrollmentNumber));

    return rows;
  };

  // Export to PDF with header information (Start Date & End Date) above the table.
  const exportToPDF = async (summaryRows) => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title (centered)
    const headerText = `Attendance Report - ${subjectDisplayName}`;
    const textWidth = doc.getTextWidth(headerText);
    const headerX = (pageWidth - textWidth) / 2;
    doc.text(headerText, headerX, 20);

    // Write Start Date and End Date below the title
    const dateInfo = `Start Date: ${startDate}    End Date: ${endDate}`;
    const dateInfoWidth = doc.getTextWidth(dateInfo);
    const dateInfoX = (pageWidth - dateInfoWidth) / 2;
    doc.text(dateInfo, dateInfoX, 30);

    // Build table data
    const head = [
      ["Enrollment No.", "Student Name", "Classes Present", "Classes Taken", "Attendance %"],
    ];
    const body = summaryRows.map((row) => [
      row.enrollmentNumber,
      row.studentName,
      row.presentCount.toString(),
      row.totalClasses.toString(),
      row.percentage + "%",
    ]);

    // Start table after the date info
    autoTable(doc, {
      startY: 40,
      head,
      body,
      styles: { fontSize: 10 },
    });

    doc.save(`attendance_report_${selectedSubject}.pdf`);
  };

  // Export to Excel with Start Date and End Date at the top.
  const exportToExcel = async (summaryRows) => {
    const XLSX = (await import("xlsx")).default;
    const sheetData = [];

    // Add Start Date and End Date rows
    sheetData.push(["Start Date", startDate]);
    sheetData.push(["End Date", endDate]);
    sheetData.push([]); // blank row

    // Header row
    sheetData.push(["Enrollment No.", "Student Name", "Classes Present", "Classes Taken", "Attendance %"]);

    // Data rows
    summaryRows.forEach((row) => {
      sheetData.push([
        row.enrollmentNumber,
        row.studentName,
        row.presentCount.toString(),
        row.totalClasses.toString(),
        row.percentage + "%",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Summary");
    XLSX.writeFile(wb, `attendance_report_${selectedSubject}.xlsx`);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const summaryRows = await fetchSummaryData();
      if (summaryRows.length === 0) {
        console.warn("No records found or no students. Check your filters/data.");
      }
      if (exportType === "pdf") {
        await exportToPDF(summaryRows);
      } else {
        await exportToExcel(summaryRows);
      }
    } catch (error) {
      console.error("Error exporting attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Attendance Report - {subjectDisplayName}
        </h2>
        {/* Start Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        {/* End Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
        {/* Export Format */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </select>
        </div>
        {/* Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => {
              console.log("Cancel clicked");
              onClose();
            }}
            className="bg-gray-300 text-black py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || !startDate || !endDate}
            className={`bg-blue-500 text-white py-2 px-4 rounded ${
              loading || !startDate || !endDate
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-600"
            }`}
          >
            {loading ? "Exporting..." : "Export Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
