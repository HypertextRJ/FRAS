"use client"

import type React from "react"
import { useState } from "react"
import { db } from "../firebase"
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import axios from "axios"
import { useToast } from "@/components/ui/use-toast"

export default function SendNotification({ user, userRole }) {
  const [open, setOpen] = useState(false)
  const [notification, setNotification] = useState({
    title: "",
    message: "",
    targetAudience: "all",
    url: "",
  })
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    
    try {
      // Validate notification data
      if (!notification.title.trim() || !notification.message.trim()) {
        throw new Error("Title and message are required")
      }

      // Save notification to Firestore
      const notificationData = {
        ...notification,
        type: "custom",
        createdAt: Timestamp.now(),
        senderId: user.uid,
        read: false,
      }
      await addDoc(collection(db, "notifications"), notificationData)

      // Determine recipient query based on target audience
      let recipientQuery
      switch (notification.targetAudience) {
        case "all":
          recipientQuery = query(collection(db, "users"))
          break
        case "students_and_teachers":
          recipientQuery = query(collection(db, "users"), 
            where("role", "in", ["student", "teacher"]))
          break
        default:
          // Remove trailing 's' for role matching (students -> student)
          const role = notification.targetAudience.replace(/s$/, "")
          recipientQuery = query(collection(db, "users"), 
            where("role", "==", role))
      }

      // Get valid recipient emails
      const recipientsSnapshot = await getDocs(recipientQuery)
      const recipientEmails = recipientsSnapshot.docs
        .map(doc => doc.data().email)
        .filter(email => 
          typeof email === "string" && 
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        )

      if (recipientEmails.length === 0) {
        throw new Error("No valid recipients found for the selected audience")
      }

      // Send email notification
      await axios.post("/api/send-email", {
        to: recipientEmails,
        subject: notification.title,
        text: `${notification.message}\n\n${notification.url ? `More info: ${notification.url}` : ""}`,
      })

      // Reset form and show success
      setNotification({ title: "", message: "", targetAudience: "all", url: "" })
      setOpen(false)
      toast({
        title: "Notification Sent",
        description: "The notification has been sent successfully.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error sending notification:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const targetAudienceOptions = () => {
    const baseOptions = ["all", "students", "teachers"]
    if (userRole === "admin") {
      return [...baseOptions, "admins", "students_and_teachers"]
    }
    if (userRole === "teacher") {
      return [...baseOptions, "students_and_teachers"]
    }
    return baseOptions
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Send Notification</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Audience</label>
            <Select
              value={notification.targetAudience}
              onValueChange={value => setNotification({ ...notification, targetAudience: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                {targetAudienceOptions().map(option => (
                  <SelectItem key={option} value={option}>
                    {option
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={notification.title}
              onChange={e => setNotification({ ...notification, title: e.target.value })}
              placeholder="Notification title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={notification.message}
              onChange={e => setNotification({ ...notification, message: e.target.value })}
              placeholder="Enter your message"
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">URL (optional)</label>
            <Input
              value={notification.url}
              onChange={e => setNotification({ ...notification, url: e.target.value })}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={sending}
          >
            {sending ? "Sending..." : "Send Notification"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}