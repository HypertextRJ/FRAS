// /app/api/teacher/removeTeacher/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";

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
    const { teacherId } = body;
    if (!teacherId) {
      return NextResponse.json(
        { error: "Missing teacherId" },
        { status: 400 }
      );
    }

    // Delete teacher from Firebase Auth.
    await admin.auth().deleteUser(teacherId);
    // Delete teacher document from Firestore.
    await admin.firestore().doc(`users/${teacherId}`).delete();

    return NextResponse.json({ message: "Teacher removed successfully" });
  } catch (error: any) {
    console.error("Error removing teacher:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
