// firestoreListeners.js

let unsubscribeFunctions = []
let isSigningOut = false

export function addFirestoreListener(unsubscribe) {
  unsubscribeFunctions.push(unsubscribe)
}

export function cleanupFirestoreListeners() {
  unsubscribeFunctions.forEach((unsubscribe) => {
    if (typeof unsubscribe === "function") {
      try {
        unsubscribe()
      } catch (error) {
        console.error("Error unsubscribing Firestore listener:", error)
      }
    }
  })
  unsubscribeFunctions = []
}

export function setSigningOut(value) {
  isSigningOut = value
}

export function getSigningOut() {
  return isSigningOut
}
