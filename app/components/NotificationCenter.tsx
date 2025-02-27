"use client"

import { useState, useEffect } from "react"
import { db } from "../firebase"
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDoc } from "firebase/firestore"
import { Bell, X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  title: string
  message: string
  type: "class_schedule" | "custom"
  targetAudience: "all" | "students" | "teachers" | "admins" | "students_and_teachers"
  createdAt: any
  read: boolean
  senderId: string
  senderName: string
  department?: string
  semester?: string
  url?: string
}

export default function NotificationCenter({ user, userRole }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  useEffect(() => {
    const fetchUserDetails = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      const userData = userDoc.data()
      return { department: userData.department, semester: userData.semester }
    }

    const setupNotificationsListener = async () => {
      const { department, semester } = await fetchUserDetails()

      let notificationsQuery
      if (userRole === "students") {
        notificationsQuery = query(
          collection(db, "notifications"),
          where("targetAudience", "in", ["all", "students", "students_and_teachers"]),
          where("department", "==", department),
          where("semester", "==", semester),
          orderBy("createdAt", "desc"),
        )
      } else if (userRole === "teachers") {
        notificationsQuery = query(
          collection(db, "notifications"),
          where("targetAudience", "in", ["all", "teachers", "students_and_teachers"]),
          orderBy("createdAt", "desc"),
        )
      } else {
        notificationsQuery = query(
          collection(db, "notifications"),
          where("targetAudience", "in", ["all", userRole]),
          orderBy("createdAt", "desc"),
        )
      }

      const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
        const notificationsList = []
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data()
          if (data.senderId) {
            const senderDoc = await getDoc(doc(db, "users", data.senderId))
            if (senderDoc.exists()) {
              data.senderName = senderDoc.data().name
            }
          }
          notificationsList.push({ id: docSnapshot.id, ...data })
        }
        setNotifications(notificationsList)
        setUnreadCount(notificationsList.filter((n) => !n.read).length)
      })

      return unsubscribe
    }

    const unsubscribe = setupNotificationsListener()
    return () => {
      if (unsubscribe) {
        unsubscribe.then((unsub) => unsub())
      }
    }
  }, [user, userRole])

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const openNotificationDetails = (notification: Notification) => {
    setSelectedNotification(notification)
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[50vh] w-full pr-4">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground">No notifications</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative p-4 rounded-lg border ${
                      notification.read ? "bg-background" : "bg-muted"
                    } cursor-pointer`}
                    onClick={() => openNotificationDetails(notification)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {notification.createdAt.toDate().toLocaleString()}
                          </span>
                          {notification.senderName && (
                            <span className="text-xs text-muted-foreground">by {notification.senderName}</span>
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedNotification && (
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{selectedNotification.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedNotification.message}</p>
              {selectedNotification.url && (
                <a
                  href={selectedNotification.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center text-blue-500 hover:underline"
                >
                  View More <ExternalLink className="ml-1 h-4 w-4" />
                </a>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{selectedNotification.createdAt.toDate().toLocaleString()}</span>
                {selectedNotification.senderName && <span>by {selectedNotification.senderName}</span>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

