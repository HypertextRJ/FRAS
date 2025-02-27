// /app/api/teacher/createTeacher/route.ts
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
    const { name, email, department, designation, password } = body;
    if (!name || !email || !department || !designation || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create teacher in Firebase Auth.
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Prepare teacher data to be stored in Firestore.
    const teacherData = {
      uid: userRecord.uid,
      name,
      email,
      department,
      designation,
      role: "teacher",
      assignedSubjects: [],
      createdAt: new Date().toISOString(),
    };

    // Create the Firestore document with the teacher's UID as the document ID.
    await admin.firestore().doc(`users/${userRecord.uid}`).set(teacherData);

    return NextResponse.json({ message: "Teacher created successfully" });
  } catch (error: any) {
    console.error("Error creating teacher:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
