"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "../firebase"
import { doc, updateDoc } from "firebase/firestore"
import { sendEmailVerification } from "firebase/auth"
import axios from "axios"

// Use environment variable for backend URL; fallback to localhost if not set.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export default function FaceRegistration() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const router = useRouter()

  // Start the camera on mount.
  useEffect(() => {
    startCamera()
    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        await videoRef.current.play().catch((err: any) => {
          if (err.name !== "AbortError") {
            throw err
          }
        })
        setIsCameraOn(true)
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("Failed to access camera. Please ensure you have granted camera permissions.")
    }
  }

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsCameraOn(false)
    }
  }, [])

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      context?.drawImage(videoRef.current, 0, 0, 640, 480)
      const imageDataUrl = canvasRef.current.toDataURL("image/jpeg")
      setCapturedImage(imageDataUrl)
      // Stop the camera automatically after capturing the image.
      stopCamera()
    }
  }

  // When user clicks "Retake", clear the captured image and restart the camera.
  const retakePicture = async () => {
    setCapturedImage(null)
    await startCamera()
  }

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
        setError("Failed to detect face. Please try again.")
      }
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    // Run face detection only if the camera is on and no image has been captured.
    if (isCameraOn && !capturedImage) {
      interval = setInterval(detectFace, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [detectFace, isCameraOn, capturedImage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
  
    if (!capturedImage) {
      setError("Please capture your face image")
      setLoading(false)
      return
    }
  
    try {
      const user = auth.currentUser
      if (!user) throw new Error("No authenticated user found")
  
      await updateDoc(doc(db, "users", user.uid), {
        profileImage: capturedImage,
        registrationDate: new Date().toISOString(),
      })
  
      // Only send the verification email if not already sent and if the user is not verified.
      if (!emailVerificationSent && !user.emailVerified) {
        try {
          await sendEmailVerification(user, {
            url: `${window.location.origin}/dashboard`,
            handleCodeInApp: true,
          })
          setEmailVerificationSent(true)
        } catch (verificationError: any) {
          console.error("Verification error:", verificationError)
          if (verificationError.code === "auth/too-many-requests") {
            setError("Too many verification requests. Please try again later.")
            return
          } else {
            setError("Failed to send verification email")
            return
          }
        }
      }      
  
      setRegistrationComplete(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  

  const handleContinueToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Face Registration</h2>
        </div>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!registrationComplete ? (
            <>
              <div className="mb-4 relative">
                {capturedImage ? (
                  <div className="relative">
                    <img
                      src={capturedImage || "/placeholder.svg"}
                      alt="Captured face"
                      className="w-full h-auto rounded-lg shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={retakePicture}
                      className="absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full h-auto rounded-lg shadow-lg"
                      autoPlay
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" width="640" height="480" />
                  </div>
                )}
              </div>
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium">Error:</p>
                    <p>{error}</p>
                  </div>
                )}
                {!capturedImage && (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={captureImage}
                      disabled={!isFaceDetected}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                      Capture Picture
                    </button>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !capturedImage}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Complete Registration"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-4">Registration Complete!</h3>
              <p className="text-gray-600 mb-6">
                A verification link has been sent to your email. Please check your inbox and verify your account.
              </p>
              <p className="text-gray-600 mb-6">
                You can start using the system now, but some features may be limited until you verify your email.
              </p>
              <button
                onClick={handleContinueToDashboard}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
