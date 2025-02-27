// /app/api/student/removeStudent/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS as string)
    ),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId } = body;
    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }
    // Delete student from Firebase Auth
    await admin.auth().deleteUser(studentId);
    // Delete student document from Firestore
    await admin.firestore().doc(`users/${studentId}`).delete();

    return NextResponse.json({ message: "Student removed successfully" });
  } catch (error: any) {
    console.error("Error removing student:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
