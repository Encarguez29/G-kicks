"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Upload } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface ReviewFormProps {
  productName: string
  productId: number
  onSubmitReview: (review: {
    rating: number;
    comment: string
    userName: string
    email?: string
    photos?: File[]
    
  }) => void
  onCancel: () => void
}

export function ReviewForm({ productName, productId, onSubmitReview, onCancel }: ReviewFormProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [userName, setUserName] = useState("")
  const [email, setEmail] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-populate name and email from authenticated user
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      if (fullName) {
        setUserName(fullName)
      }
      if (user.email) {
        setEmail(user.email)
      }
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (rating === 0) newErrors.rating = "Please select a rating"
    if (!comment.trim()) newErrors.comment = "Review comment is required"
    if (!userName.trim()) newErrors.userName = "Your name is required"
    if (email && !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Please enter a valid email"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      console.log('📝 Submitting review for product:', productId)
      
      // Submit review to API
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          comment: comment.trim(),
          userName: userName.trim(),
          email: email.trim() || undefined,
          photos: [], // TODO: Handle photo upload to cloud storage
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      console.log('✅ Review submitted successfully:', data)
      
      // Call the parent callback to refresh reviews
      onSubmitReview({
        rating,
        comment: comment.trim(),
        userName: userName.trim(),
        email: email.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      })

      // Reset form
      setRating(0)
      setComment("")
      if (!user) {
        setUserName("")
        setEmail("")
      }
      setPhotos([])
      
      alert("Thank you for your review! It has been submitted successfully.")
    } catch (error) {
      console.error('❌ Error submitting review:', error)
      setErrors({ submit: error instanceof Error ? error.message : "Failed to submit review. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  const handleStarHover = (starRating: number) => {
    setHoveredRating(starRating)
  }

  const handleStarLeave = () => {
    setHoveredRating(0)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith("image/")
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      return isValidType && isValidSize
    })

    if (validFiles.length + photos.length > 5) {
      alert("You can upload a maximum of 5 photos")
      return
    }

    setPhotos((prev) => [...prev, ...validFiles])
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1
      const isFilled = starNumber <= (hoveredRating || rating)

      return (
        <button
          key={index}
          type="button"
          className={`transition-all duration-200 hover:scale-110 ${isFilled ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
          onClick={() => handleStarClick(starNumber)}
          onMouseEnter={() => handleStarHover(starNumber)}
          onMouseLeave={handleStarLeave}
        >
          <Star className={`h-6 w-6 ${isFilled ? "fill-current" : ""}`} />
        </button>
      )
    })
  }

  const getRatingText = (rating: number): string => {
    switch (rating) {
      case 1:
        return "Poor"
      case 2:
        return "Fair"
      case 3:
        return "Average"
      case 4:
        return "Good"
      case 5:
        return "Excellent"
      default:
        return ""
    }
  }

  return (
    <Card className="shadow-lg bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-yellow-400">Write Your Review</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name and Email Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 h-5">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                readOnly={!!user}
                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400 read-only:bg-gray-100 dark:read-only:bg-gray-800 read-only:cursor-not-allowed"
              />
              {errors.userName && <p className="text-red-500 text-sm mt-1">{errors.userName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 h-5">
                Email (optional)
              </label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!user}
                className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400 read-only:bg-gray-100 dark:read-only:bg-gray-800 read-only:cursor-not-allowed"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Rating Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-1 mb-2">{renderStars()}</div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Click to rate</p>
              {(hoveredRating || rating) > 0 && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getRatingText(hoveredRating || rating)}
                </p>
              )}
            </div>
            {errors.rating && <p className="text-red-500 text-sm mt-1">{errors.rating}</p>}
          </div>

          {/* Review Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Review <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Share your experience with this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[120px] resize-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            {errors.comment && <p className="text-red-500 text-sm mt-1">{errors.comment}</p>}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Upload Photos (optional)
            </label>

            <div className="space-y-3">
              <div className="flex items-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={photos.length >= 5}
                  />
                  <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Upload className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Upload Photos</span>
                  </div>
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">Max 5 photos, 5MB each</span>
              </div>

              {/* Photo Preview */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(photo) || "/placeholder.svg"}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              className="bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Submitting Review...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-8 text-gray-900 dark:text-gray-300 bg-transparent"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
