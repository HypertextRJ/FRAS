import { NextResponse } from "next/server"
import * as faceapi from "face-api.js"
import { Canvas, Image, createCanvas, loadImage } from "canvas"
import path from "path"

// Ensure TextEncoder/TextDecoder are available
if (!globalThis.TextEncoder) globalThis.TextEncoder = require("util").TextEncoder
if (!globalThis.TextDecoder) globalThis.TextDecoder = require("util").TextDecoder
globalThis.util = { TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder }

// Monkey-patch canvas for face-api
faceapi.env.monkeyPatch({ Canvas, Image })

let modelsLoaded = false
async function loadModels() {
  if (!modelsLoaded) {
    try {
      // Build an absolute path to your models folder (make sure this folder exists and contains the model files)
      const modelPath = path.join(process.cwd(), "public", "models")
      console.log("Loading models from:", modelPath)
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
      modelsLoaded = true
      console.log("Models loaded successfully")
    } catch (err) {
      console.error("Error loading models:", err)
      throw err
    }
  }
}

export async function POST(req: Request) {
  try {
    await loadModels()

    // Parse the incoming FormData
    const formData = await req.formData()
    const image = formData.get("image") as Blob
    if (!image) {
      console.error("No image found in request")
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
    }

    // Convert the Blob into a Buffer
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log("Received image buffer of length:", buffer.length)

    // Try loading the image from the buffer
    let img
    try {
      img = await loadImage(buffer)
    } catch (imgErr) {
      console.error("Error loading image:", imgErr)
      throw new Error("Failed to load image. Make sure the uploaded file is a valid image.")
    }

    if (!img.width || !img.height) {
      console.error("Invalid image dimensions:", img.width, img.height)
      throw new Error("Invalid image dimensions")
    }
    console.log("Image loaded with dimensions:", img.width, img.height)

    // Create a canvas with the image dimensions and draw the image
    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext("2d")
    ctx.drawImage(img, 0, 0, img.width, img.height)

    // Run face detection on the canvas
    const detection = await faceapi.detectSingleFace(canvas)
    console.log("Detection result:", detection)

    const faceDetected = !!detection
    return NextResponse.json({ faceDetected })
  } catch (error: any) {
    console.error("Face detection error:", error)
    return NextResponse.json(
      { error: "Face detection failed", details: error.message },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
