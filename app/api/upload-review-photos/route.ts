import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Limit: up to 5 review photos per submission
    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 photos allowed" }, { status: 400 })
    }

    const uploadedUrls: string[] = []
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "image/avif",
    ]

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "reviews")
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory may already exist
    }

    for (const file of files) {
      // Validate file type
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({
          error: `Invalid file type for ${file.name}. Allowed types: JPG, PNG, GIF, WebP, BMP, TIFF, AVIF`,
        }, { status: 400 })
      }

      // Validate file size (10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({
          error: `File ${file.name} is too large. Maximum size is 10MB`,
        }, { status: 400 })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileExtension = file.name.split(".").pop()
      const fileName = `review-${timestamp}-${randomString}.${fileExtension}`

      // Convert to buffer and save
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = path.join(uploadsDir, fileName)
      await writeFile(filePath, buffer)

      const publicUrl = `/uploads/reviews/${fileName}`
      uploadedUrls.push(publicUrl)
      console.log("Review photo uploaded:", fileName, "Size:", file.size, "Type:", file.type)
    }

    return NextResponse.json({
      urls: uploadedUrls,
      message: `${uploadedUrls.length} photo(s) uploaded successfully!`,
    })
  } catch (error) {
    console.error("Upload review photos error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}