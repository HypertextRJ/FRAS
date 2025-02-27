"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, where, getDocs, addDoc, updateDoc, Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "../firebase"
import LoadingSpinner from "./LoadingSpinner"
import { Camera, MapPin, Check } from "lucide-react"
import axios from "axios"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { subjectMapping } from "./subjectMapping"
import { useToast } from "@/components/ui/use-toast"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
const MAX_IMAGE_SIZE_MB = 5

export default function MarkAttendance({ user, subjects }) {
  const [classes, setClasses] = useState({ ongoing: [], upcoming: [], ended: [] })
  const [selectedClass, setSelectedClass] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [image, setImage] = useState(null)
  const [location, setLocation] = useState(null)
  const [locationName, setLocationName] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [studentDept, setStudentDept] = useState("")
  const [studentSemester, setStudentSemester] = useState("")
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  // Base64 to File converter
  const base64ToFile = useCallback((base64: string, filename: string): File | null => {
    try {
      const arr = base64.split(",")
      const mimeMatch = arr[0].match(/:(.*?);/)
      if (!mimeMatch) return null

      const mime = mimeMatch[1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }

      return new File([u8arr], filename, { type: mime })
    } catch (error) {
      console.error("Error converting base64 to file:", error)
      return null
    }
  }, [])

  useEffect(() => {
    const fetchStudentDeptAndSem = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setStudentDept(data.department || "")
          setStudentSemester(data.semester || "")
        }
      } catch (err) {
        console.error("Error fetching student department:", err)
      }
    }
    fetchStudentDeptAndSem()
  }, [user])

  useEffect(() => {
    if (!user.emailVerified) {
      setError("Please verify your email before marking attendance")
      setLoading(false)
      return
    }
    if (!studentDept || !studentSemester) return
    fetchClasses()
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [user.emailVerified, studentDept, studentSemester])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)

      let allClasses = []
      if (subjects && subjects.length > 0) {
        let filteredSubjects = subjects.filter((s) => {
          if (typeof s === "object" && s.department) {
            return s.department === studentDept
          }
          return false
        })

        if (filteredSubjects.length === 0 && studentDept && studentSemester) {
          console.warn("No subjects match student's department. Falling back to subjectMapping.")
          const subjectsForDept = (subjectMapping[studentDept] && subjectMapping[studentDept][studentSemester]) || []
          filteredSubjects = subjectsForDept.map((subj, index) => ({
            id: `${studentDept}-${studentSemester}-${index}`,
            name: subj,
            department: studentDept,
            semester: studentSemester,
          }))
        }

        const validSubjectIdentifiers = filteredSubjects
          .map((s) => {
            if (typeof s === "object" && s.id) {
              return { field: "subjectId", value: s.id }
            }
            return { field: "subjectName", value: s }
          })
          .filter((item) => item.value)

        if (validSubjectIdentifiers.length === 0) {
          console.error("No valid subject identifiers found")
          setClasses({ ongoing: [], upcoming: [], ended: [] })
          return
        }

        for (const { field, value } of validSubjectIdentifiers) {
          const q = query(collection(db, "classes"), where(field, "==", value))
          const snapshot = await getDocs(q)
          const classesForSubject = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          allClasses = allClasses.concat(classesForSubject)
        }
      }

      allClasses = allClasses
        .filter((c) => {
          if (!c.startTime) return false
          const st = c.startTime.toDate()
          return st >= todayStart && st <= todayEnd
        })
        .filter((c) => c.department === studentDept)

      const attendanceSnapshot = await getDocs(query(collection(db, "attendance"), where("userId", "==", user.uid)))
      const attendanceToday = attendanceSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((record) => {
          const ts = record.timestamp.toDate()
          return ts >= todayStart && ts <= todayEnd
        })

      allClasses = allClasses.map((c) => {
        const marked = attendanceToday.some((record) => record.classId === c.id)
        return { ...c, marked }
      })

      const updatedNow = new Date()
      const ongoing = allClasses.filter((c) => c.startTime.toDate() <= updatedNow && c.endTime.toDate() > updatedNow)
      const upcoming = allClasses.filter((c) => c.startTime.toDate() > updatedNow)
      const ended = allClasses.filter((c) => c.endTime.toDate() <= updatedNow)

      setClasses({ ongoing, upcoming, ended })
    } catch (error) {
      console.error("Error fetching classes:", error)
      setError("Failed to fetch classes. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCameraOn(true)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Failed to access camera. Please check permissions.")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsCameraOn(false)
    }
  }, [])

  const detectFace = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      context?.drawImage(videoRef.current, 0, 0, 640, 480)
      const imageDataUrl = canvasRef.current.toDataURL("image/jpeg")

      try {
        const response = await axios.post(`${BACKEND_URL}/detect-face`, { image: imageDataUrl })
        setIsFaceDetected(response.data.face_detected)
      } catch (err) {
        console.error("Error detecting face:", err)
        setError("Face detection failed. Please try again.")
      }
    }
  }, [])

  useEffect(() => {
    if (isModalOpen && isCameraOn) {
      const interval = setInterval(detectFace, 1000)
      return () => clearInterval(interval)
    }
  }, [isModalOpen, isCameraOn, detectFace])

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      context?.drawImage(videoRef.current, 0, 0, 640, 480)
      const imageDataUrl = canvasRef.current.toDataURL("image/jpeg")
      setImage(imageDataUrl)
      // Automatically turn off the camera after capturing the image
      stopCamera()
    }
  }  

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLocation(position)
          try {
            const response = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            )
            setLocationName(response.data.display_name)
          } catch (error) {
            console.error("Error fetching location name:", error)
            setLocationName("Location name unavailable")
          }
        },
        () => setError("Failed to get location")
      )
    } else {
      setError("Geolocation not supported")
    }
  }

  const markAttendance = async () => {
    if (!user.emailVerified) {
      setError("Please verify your email first")
      return
    }
    if (!selectedClass || !image || !location) {
      setError("Complete all requirements: class selection, photo, and location")
      return
    }
    if (selectedClass.marked) {
      setError("Attendance already marked")
      return
    }
  
    setLoading(true)
    try {
      const imageSizeMB = (image.length * 2) / (1024 * 1024)
      if (imageSizeMB > MAX_IMAGE_SIZE_MB) {
        throw new Error(`Image size exceeds ${MAX_IMAGE_SIZE_MB}MB limit`)
      }
  
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const profileImageUrl = userDoc.data()?.profileImage
      if (!profileImageUrl) {
        throw new Error("Profile image missing")
      }
  
      const profileFile = base64ToFile(profileImageUrl, "profile.jpg")
      const currentFile = base64ToFile(image, "current.jpg")
      if (!profileFile || !currentFile) {
        throw new Error("Image processing failed")
      }
  
      const formData = new FormData()
      formData.append("profile_image", profileFile, profileFile.name)
      formData.append("current_image", currentFile, currentFile.name)
      formData.append("user_id", user.uid)
      formData.append("class_id", selectedClass.id)
  
      const comparisonResult = await axios.post(`${BACKEND_URL}/compare-faces`, formData, {
        timeout: 30000,
        validateStatus: (status) => status < 500,
      })
  
      if (comparisonResult.status === 500) {
        throw new Error("Server error occurred during face comparison. Please try again.")
      }
  
      if (comparisonResult.data.error) {
        throw new Error(comparisonResult.data.error)
      }
  
      // Check if face match percentage is at least 70%
      if (comparisonResult.data.match_percentage >= 70) {
        const now = new Date()
        const classStartTime = selectedClass.startTime.toDate()
        const isLate = now.getTime() > classStartTime.getTime() + 15 * 60000
        const status = isLate ? "Late" : "Present"
  
        await addDoc(collection(db, "attendance"), {
          userId: user.uid,
          classId: selectedClass.id,
          subjectId: selectedClass.subjectId,
          subjectName: selectedClass.subjectName,
          teacherId: selectedClass.teacherId,
          timestamp: Timestamp.now(),
          image: image,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            name: locationName,
          },
          faceMatchPercentage: comparisonResult.data.match_percentage,
          status,
          verified: false,
        })
  
        await updateDoc(doc(db, "users", user.uid), {
          profileImage: image,
          lastAttendanceDate: Timestamp.now(),
        })
  
        const successMessage = `Face match successful: ${comparisonResult.data.match_percentage.toFixed(
          2
        )}% match. Attendance marked as ${status}.`
  
        toast({
          title: "Face match successful",
          description: successMessage,
        })
  
        if (!document.querySelector(".toast-container")) {
          window.alert(successMessage)
        }
  
        setSelectedClass(null)
        setImage(null)
        setLocation(null)
        setLocationName("")
        setIsModalOpen(false)
        await fetchClasses()
      } else {
        setError(
          `Face match failed: ${comparisonResult.data.match_percentage.toFixed(
            2
          )}% match. Your face does not match the user, please try again.`
        )
      }
    } catch (error: any) {
      console.error("Attendance error:", error)
      setError(error.response?.data?.error || error.message || "Attendance failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }  
  
  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="max-w-screen-lg w-full mx-auto p-2 sm:p-6 bg-white rounded-lg shadow-lg flex flex-col items-center gap-6">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Mark Attendance</h2>
      <p className="text-base sm:text-lg md:text-xl font-semibold">
        Current Date and Time: {currentDateTime.toLocaleString()}
      </p>
      {error && (
        <p className="w-full text-center p-3 bg-red-100 text-red-500 rounded-md">
          {error}
        </p>
      )}

      {/* Ongoing Classes Section */}
      <div className="w-full">
        <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Ongoing Classes</h3>
        {classes.ongoing.length === 0 ? (
          <p className="text-gray-600 italic">No ongoing classes</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.ongoing.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClass(c)
                  setIsModalOpen(true)
                }}
                disabled={c.marked}
                className={`p-4 rounded-lg transition-all ${
                  c.marked
                    ? "bg-green-500 text-white cursor-not-allowed"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <p className="font-semibold">{c.subjectName}</p>
                <p className="text-sm">
                  {c.startTime.toDate().toLocaleTimeString()} - {c.endTime.toDate().toLocaleTimeString()}
                </p>
                {c.marked && <p className="text-xs mt-1">Attendance Marked</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Classes */}
      <div className="w-full">
        <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Upcoming Classes</h3>
        {classes.upcoming.length === 0 ? (
          <p className="text-gray-600 italic">No upcoming classes</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.upcoming.map((c) => (
              <div key={c.id} className="p-4 rounded-lg bg-gray-100">
                <p className="font-semibold">{c.subjectName}</p>
                <p className="text-sm">
                  {c.startTime.toDate().toLocaleTimeString()} - {c.endTime.toDate().toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ended Classes */}
      <div className="w-full">
        <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-700">Ended Classes</h3>
        {classes.ended.length === 0 ? (
          <p className="text-gray-600 italic">No ended classes</p>
        ) : (
          <ul className="space-y-2">
            {classes.ended.map((c) => (
              <li key={c.id} className="bg-white p-4 rounded-lg shadow-sm">
                <p className="font-semibold text-gray-800">{c.subjectName}</p>
                <p className="text-sm text-gray-600">
                  {c.startTime.toDate().toLocaleString()} - {c.endTime.toDate().toLocaleTimeString()}
                </p>
                {c.marked && <p className="text-xs text-green-600">Attendance Marked</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Attendance Modal */}
      {isModalOpen && selectedClass && (
        <Dialog open={true} onOpenChange={(open) => !open && setIsModalOpen(false)}>
          <DialogContent className="w-full sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mark Attendance - {selectedClass.subjectName}</DialogTitle>
            </DialogHeader>

            <div className="mb-6 relative">
              <video
                ref={videoRef}
                className="w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-gray-200 rounded-lg object-cover"
                style={{ display: isCameraOn ? "block" : "none" }}
              />
              <canvas ref={canvasRef} className="hidden" width="640" height="480" />
              {!isCameraOn && (
                <div className="w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Camera is off</p>
                </div>
              )}
              {isCameraOn && !isFaceDetected && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTitle>No Face Detected</AlertTitle>
                  <AlertDescription>Position your face in the frame</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button
                onClick={isCameraOn ? stopCamera : startCamera}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center"
              >
                <Camera className="mr-2" size={20} />
                {isCameraOn ? "Stop Camera" : "Start Camera"}
              </Button>
              <Button
                onClick={captureImage}
                disabled={!isCameraOn || !isFaceDetected}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <Camera className="mr-2" size={20} />
                Capture Picture
              </Button>
            </div>
            {image && (
              <div className="mb-6">
                <img
                  src={image || "/placeholder.svg"}
                  alt="Captured"
                  className="w-full h-40 sm:h-48 md:h-56 lg:h-64 object-cover rounded-lg shadow-md"
                />
              </div>
            )}
            <button
              onClick={getLocation}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center mb-6"
            >
              <MapPin className="mr-2" size={20} />
              Get Location
            </button>
            {location && (
              <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <p className="font-semibold text-gray-700">Location:</p>
                <p className="text-gray-600">{locationName}</p>
              </div>
            )}
            <button
              onClick={markAttendance}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center"
              disabled={!image || !location}
            >
              <Check className="mr-2" size={20} />
              Mark Attendance
            </button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
