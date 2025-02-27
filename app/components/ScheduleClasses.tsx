"use client"

import { useState, useEffect } from "react"
import { db } from "../firebase"
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
  doc,
  getDoc,
  deleteDoc
} from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import LoadingSpinner from "./LoadingSpinner"
import { subjectMapping } from "./subjectMapping"
import axios from "axios"
import { useToast } from "@/components/ui/use-toast"

// Function to get subject details from ID
const getSubjectDetailsFromId = (subjectId) => {
  const [department, semester, index] = subjectId.split("-")
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
    }
  }
  return null
}

export default function ScheduleClasses({ user }) {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [scheduledClasses, setScheduledClasses] = useState([])
  const [newClass, setNewClass] = useState({
    date: "",
    startTime: "",
    endTime: "",
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [modalError, setModalError] = useState("")
  // New state to prevent multi-click submissions
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubjectsAndClasses()
  }, [])

  const fetchSubjectsAndClasses = async () => {
    try {
      // Fetch teacher's profile to get assigned subjects
      const teacherDoc = await getDoc(doc(db, "users", user.uid))
      if (!teacherDoc.exists()) {
        setError("Teacher profile not found")
        return
      }

      const teacherData = teacherDoc.data()
      const assignedSubjects = teacherData.assignedSubjects || []

      // Convert subject IDs to full subject details
      const subjectsList = assignedSubjects.map(getSubjectDetailsFromId).filter((subject) => subject !== null)
      setSubjects(subjectsList)

      // Fetch scheduled classes for this teacher
      const classesQuery = query(collection(db, "classes"), where("teacherId", "==", user.uid))
      const classesSnapshot = await getDocs(classesQuery)
      const classesList = classesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setScheduledClasses(classesList)
    } catch (error) {
      console.error("Error fetching subjects and classes:", error)
      setError("Failed to load subjects and classes")
    } finally {
      setLoading(false)
    }
  }

  // Returns only upcoming or ongoing classes for a subject
  const getSubjectClasses = (subjectId) => {
    const now = new Date()
    return scheduledClasses.filter((cls) => cls.subjectId === subjectId && cls.endTime.toDate() > now)
  }

  const openModalForSubject = (subject) => {
    setSelectedSubject(subject)
    setEditingClass(null)
    setNewClass({
      date: "",
      startTime: "",
      endTime: "",
    })
    setModalError("")
    setIsModalOpen(true)
  }

  const handleEditClass = (classObj) => {
    const subjectDetails = getSubjectDetailsFromId(classObj.subjectId)
    setSelectedSubject(subjectDetails)
    setEditingClass(classObj)
    const startDT = classObj.startTime.toDate()
    const endDT = classObj.endTime.toDate()
    setNewClass({
      date: startDT.toISOString().split("T")[0],
      startTime: startDT.toTimeString().slice(0, 5),
      endTime: endDT.toTimeString().slice(0, 5),
    })
    setModalError("")
    setIsModalOpen(true)
  }

  const handleDeleteClass = async (cls) => {
    try {
      await deleteDoc(doc(db, "classes", cls.id));
      await createDeleteNotification(cls);
  
      const startTimeStr = cls.startTime.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const endTimeStr = cls.endTime.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const message = `${cls.subjectName} class scheduled from ${startTimeStr} to ${endTimeStr} has been deleted.`;
      const now = new Date().toLocaleString();
  
      toast({
        title: `Class Deleted at ${now}`,
        description: message,
        duration: 5000,
      });
  
      if (!document.querySelector(".toast-container")) {
        window.alert(`Class Deleted at ${now}\n${message}`);
      }
  
      console.log("Class deleted:", message);
      await fetchSubjectsAndClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      setModalError("Failed to delete class. Please try again.");
    }
  };
  
  // Notification functions remain unchanged...
  const createNotification = async (classData, classRef) => {
    try {
      const teacherDoc = await getDoc(doc(db, "users", user.uid))
      const teacherName = teacherDoc.data()?.name || "Teacher"
      const startDateTime = classData.startTime.toDate()

      await addDoc(collection(db, "notifications"), {
        title: `${classData.subjectName} Class Scheduled`,
        message: `${teacherName} has scheduled a new ${classData.subjectName} class for ${startDateTime.toLocaleString()}`,
        type: "class_schedule",
        targetAudience: "students",
        createdAt: Timestamp.now(),
        senderId: user.uid,
        senderName: teacherName,
        department: classData.department,
        semester: classData.semester,
        classId: classRef.id,
        read: false,
      })

      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("department", "==", classData.department),
        where("semester", "==", classData.semester)
      )
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentEmails = studentsSnapshot.docs.map((doc) => doc.data().email)
      await axios.post("/api/send-email", {
        to: studentEmails,
        subject: `New Class Scheduled: ${classData.subjectName}`,
        text: `${teacherDoc.data()?.name || "Teacher"} has scheduled a new ${classData.subjectName} class for ${startDateTime.toLocaleString()}. Please check your dashboard for details.`,
      })
    } catch (error) {
      console.error("Error creating notification:", error)
    }
  }

  const createUpdateNotification = async (classData, classId) => {
    try {
      const teacherDoc = await getDoc(doc(db, "users", user.uid))
      const teacherName = teacherDoc.data()?.name || "Teacher"
      const startDateTime = classData.startTime.toDate()

      await addDoc(collection(db, "notifications"), {
        title: `${classData.subjectName} Class Updated`,
        message: `${teacherName} has updated the schedule for ${classData.subjectName} class to ${startDateTime.toLocaleString()}`,
        type: "class_update",
        targetAudience: "students",
        createdAt: Timestamp.now(),
        senderId: user.uid,
        senderName: teacherName,
        department: classData.department,
        semester: classData.semester,
        classId: classId,
        read: false,
      })

      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("department", "==", classData.department),
        where("semester", "==", classData.semester)
      )
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentEmails = studentsSnapshot.docs.map((doc) => doc.data().email)
      await axios.post("/api/send-email", {
        to: studentEmails,
        subject: `Class Updated: ${classData.subjectName}`,
        text: `${teacherDoc.data()?.name || "Teacher"} has updated the schedule for ${classData.subjectName} class to ${startDateTime.toLocaleString()}. Please check your dashboard for details.`,
      })
    } catch (error) {
      console.error("Error creating update notification:", error)
    }
  }

  const createDeleteNotification = async (classData) => {
    try {
      const teacherDoc = await getDoc(doc(db, "users", user.uid))
      const teacherName = teacherDoc.data()?.name || "Teacher"
      const startDateTime = classData.startTime.toDate()

      await addDoc(collection(db, "notifications"), {
        title: `${classData.subjectName} Class Cancelled`,
        message: `${teacherName} has cancelled the ${classData.subjectName} class that was scheduled for ${startDateTime.toLocaleString()}`,
        type: "class_delete",
        targetAudience: "students",
        createdAt: Timestamp.now(),
        senderId: user.uid,
        senderName: teacherName,
        department: classData.department,
        semester: classData.semester,
        classId: classData.id,
        read: false,
      })

      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("department", "==", classData.department),
        where("semester", "==", classData.semester)
      )
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentEmails = studentsSnapshot.docs.map((doc) => doc.data().email)
      await axios.post("/api/send-email", {
        to: studentEmails,
        subject: `Class Cancelled: ${classData.subjectName}`,
        text: `${teacherDoc.data()?.name || "Teacher"} has cancelled the ${classData.subjectName} class that was scheduled for ${startDateTime.toLocaleString()}. Please check your dashboard for details.`,
      })
    } catch (error) {
      console.error("Error creating delete notification:", error)
    }
  }

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    setModalError("");
    // Prevent multi-click submissions
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { date, startTime, endTime } = newClass;
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Validation: End time must be after start time and cannot schedule in the past
      if (startDateTime >= endDateTime) {
        setModalError("End time must be after start time");
        setIsSubmitting(false);
        return;
      }
      if (startDateTime < new Date()) {
        setModalError("Cannot schedule classes in the past");
        setIsSubmitting(false);
        return;
      }

      // If creating a new class, ensure there's no active/upcoming class for this subject
      if (!editingClass && getSubjectClasses(selectedSubject.id).length > 0) {
        setModalError("There is already an active/upcoming class for this subject. Please update the existing class instead.");
        setIsSubmitting(false);
        return;
      }

      const classData = {
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        department: selectedSubject.department,
        semester: selectedSubject.semester,
        teacherId: user.uid,
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        createdAt: Timestamp.now(),
      };

      if (editingClass) {
        // Update existing class
        await updateDoc(doc(db, "classes", editingClass.id), {
          startTime: Timestamp.fromDate(startDateTime),
          endTime: Timestamp.fromDate(endDateTime),
        });
        await createUpdateNotification(classData, editingClass.id);
      } else {
        // Create new class
        const classRef = await addDoc(collection(db, "classes"), classData);
        await createNotification(classData, classRef);
      }

      // Format time strings for display (full date & time)
      const startStr = startDateTime.toLocaleString();
      const endStr = endDateTime.toLocaleString();
      const message = `${selectedSubject.name} class scheduled from ${startStr} to ${endStr}.`;

      // Immediately show a toast notification with 5 sec duration
      toast({
        title: "Class Scheduled",
        description: message,
        duration: 5000,
      });
      // Fallback alert if toast is not visible
      if (!document.querySelector(".toast-container")) {
        window.alert(message);
      }
      console.log("Class scheduled:", message);
      setNewClass({ date: "", startTime: "", endTime: "" });
      setIsModalOpen(false);
      setEditingClass(null);
      await fetchSubjectsAndClasses();
    } catch (error) {
      console.error("Error scheduling class:", error);
      setModalError(
        error.code === "permission-denied"
          ? "You don't have permission to schedule classes. Please ensure you're logged in as a teacher."
          : "Failed to schedule class. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="w-full p-6">
      <h2 className="text-2xl font-bold mb-6">My Subjects</h2>
      {subjects.length === 0 ? (
        <div className="text-gray-500 text-center p-4">
          No subjects assigned yet. Please contact your administrator.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const subjectClasses = getSubjectClasses(subject.id);
            return (
              <div key={subject.id} className="space-y-2">
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openModalForSubject(subject)}
                >
                  <CardHeader>
                    <CardTitle>{subject.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Department: {subject.department}</p>
                    <p className="text-gray-600">Semester: {subject.semester}</p>
                    <p className="text-gray-600 mt-2">
                      Scheduled Classes: {subjectClasses.length}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Classes for {selectedSubject?.name}</DialogTitle>
          </DialogHeader>
          {selectedSubject && (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">Scheduled Classes:</h4>
              {getSubjectClasses(selectedSubject.id).length === 0 ? (
                <p className="text-gray-500 text-sm">No classes scheduled yet.</p>
              ) : (
                getSubjectClasses(selectedSubject.id).map((cls) => (
                  <div key={cls.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border p-2 rounded my-1">
                    <span className="text-sm">
                      {cls.startTime.toDate().toLocaleString()} - {cls.endTime.toDate().toLocaleString()}
                    </span>
                    <div className="flex space-x-1 mt-1 sm:mt-0">
                      <button
                        onClick={() => handleEditClass(cls)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <form onSubmit={handleScheduleClass} className="space-y-4 border-t pt-4">
            {modalError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md">
                {modalError}
              </div>
            )}
            <h4 className="text-md font-semibold">Schedule New Class</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={newClass.date}
                  onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
                  className="pl-10 w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="time"
                  value={newClass.startTime}
                  onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                  className="pl-10 w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <input
                  type="time"
                  value={newClass.endTime}
                  onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                  className="pl-10 w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClass(null);
                }}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {editingClass ? "Update Class" : "Schedule Class"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
