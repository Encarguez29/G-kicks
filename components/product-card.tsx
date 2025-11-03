"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
// Removed client-side pricing import since API already applies pricing




interface Product {
  id: number | string 
  name: string
  brand: string
  price: number
  originalPrice?: number
  image?: string
  image_url?: string
  gallery_images?: string[]
  rating?: number
  reviews?: number
  colors?: string[]
  colorImages?: Record<string, {
  front?: string
  side?: string
  back?: string
  sole?: string
  three_d?: string
}>
  isNew?: boolean
  isSale?: boolean
  views?: number
  category: string
  variants?: Record<string, any>
  is_new?: boolean;
  is_sale?: boolean;
}

interface ProductCardProps {    
  product: Product 
  onCartUpdate?: (count: number) => void
  onWishlistUpdate?: (count: number) => void
  onViewUpdate?: () => void
} 

export function ProductCard({ product, onViewUpdate }: ProductCardProps) {
  const router = useRouter()
  // Use prices directly from API since they're already calculated
  const finalPrice = product.price || 0
  const finalOriginalPrice = product.originalPrice || null

  const safeProduct = {
    id: product?.id || 0,
    name: product?.name || "Unknown Product",
    brand: product?.brand || "Unknown Brand",
    price: product?.price || 0,
    originalPrice: product?.originalPrice,
    image_url: product?.image_url,
    gallery_images: product?.gallery_images || [],
    image:
      product?.image ||
      `/images/${product?.name?.toLowerCase().replace(/\s+/g, "-")}.png` ||
      "/placeholder.svg?height=300&width=300",
    rating: product?.rating || 4.0,
    reviews: product?.reviews || 0,
    isNew: product?.isNew || false,
    isSale: product?.isSale || false,
    views: product?.views || 0,
    category: product?.category || "uncategorized",
  }

  // State declarations first
  const [currentViews, setCurrentViews] = useState(safeProduct.views)
  const [isHovered, setIsHovered] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Get all available images (gallery_images first, then fallback to image_url or image)
  const allImages = safeProduct.gallery_images.length > 0 
    ? safeProduct.gallery_images 
    : [safeProduct.image_url || safeProduct.image].filter(Boolean)
  
  const currentImage = allImages[currentImageIndex] || safeProduct.image || "/placeholder.svg?height=300&width=300"
  
  const nextImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
    }
  }
  
  const prevImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
    }
  }

  const handleProductClick = () => {
    try {
      router.push(`/product/${safeProduct.id}`)
    } catch (error) {
      console.warn('Navigation error:', error)
      // Fallback navigation
      window.location.href = `/product/${safeProduct.id}`
    }
  }

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      router.push(`/product/${safeProduct.id}`)
    } catch (error) {
      console.warn('Navigation error:', error)
      // Fallback navigation
      window.location.href = `/product/${safeProduct.id}`
    }
  }

  useEffect(() => {
    setCurrentViews(safeProduct.views)
  }, [safeProduct.views])

  useEffect(() => {
    const handleViewUpdate = (event: CustomEvent) => {
      if (event.detail.productId === safeProduct.id) {
        setCurrentViews(event.detail.newCount)
      }
    }

    window.addEventListener("viewCountUpdate", handleViewUpdate as EventListener)
    return () => window.removeEventListener("viewCountUpdate", handleViewUpdate as EventListener)
  }, [safeProduct.id])

  useEffect(() => {
    const handleProductUpdate = (event: CustomEvent) => {
      if (event.detail.productId === safeProduct.id) {
        setCurrentViews((prev) => prev)
      }
    }

    const handleProductDeleted = (event: CustomEvent) => {
      if (event.detail.productId === safeProduct.id) {
        console.log("Product deleted:", safeProduct.id)
      }
    }

    window.addEventListener("productUpdated", handleProductUpdate as EventListener)
    window.addEventListener("productDeleted", handleProductDeleted as EventListener)
    window.addEventListener("adminProductUpdated", handleProductUpdate as EventListener)

    return () => {
      window.removeEventListener("productUpdated", handleProductUpdate as EventListener)
      window.removeEventListener("productDeleted", handleProductDeleted as EventListener)
      window.removeEventListener("adminProductUpdated", handleProductUpdate as EventListener)
    }
  }, [safeProduct.id])

  if (!product) {
    return (
      <Card className="group hover:shadow-2xl transition-all duration-500 bg-card border-border">
        <CardContent className="p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">Product not available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer bg-card border-border"
      onClick={handleProductClick}
    >
      <CardContent className="p-0">
        <div className="relative overflow-hidden">
          <div className="relative p-1 sm:p-2">
            <div
              className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 border-2 sm:border-4 border-yellow-400"
              style={{
                boxShadow: isHovered
                  ? "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(250, 204, 21, 0.3)"
                  : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(250, 204, 21, 0.2)",
                transition: "all 0.3s ease",
              }}
            >
              <img
                src={currentImage}
                alt={safeProduct.name}
                className="w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80 object-cover transition-all duration-700"
                style={{
                  filter: isHovered ? "brightness(1.1) contrast(1.1)" : "brightness(1) contrast(1)",
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                }}
              />
              
              {/* Image Navigation - only show if multiple images */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      prevImage()
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextImage()
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    ›
                  </button>
                  
                  {/* Image indicators */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {allImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(index)
                        }}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-yellow-400' : 'bg-white bg-opacity-50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            {safeProduct.isNew && (
              <Badge
                className="bg-green-500 hover:bg-green-600 text-xs shadow-lg transition-all duration-300 text-white"
                style={{
                  boxShadow: isHovered ? "0 8px 25px rgba(34, 197, 94, 0.4)" : "0 4px 15px rgba(34, 197, 94, 0.2)",
                }}
              >
                New
              </Badge>
            )}
            {safeProduct.isSale && (
              <Badge
                className="bg-red-500 hover:bg-red-600 text-xs shadow-lg transition-all duration-300 text-white"
                style={{
                  boxShadow: isHovered ? "0 8px 25px rgba(239, 68, 68, 0.4)" : "0 4px 15px rgba(239, 68, 68, 0.2)",
                }}
              >
                Sale
              </Badge>
            )}
          </div>
        </div>

        <div
          className="p-1 sm:p-2 md:p-3 lg:p-3 xl:p-4 space-y-1 sm:space-y-1 md:space-y-2 lg:space-y-2 transition-all duration-500"
          style={{
            transform: isHovered ? "translateY(-5px)" : "translateY(0px)",
          }}
        >
          <div>
            <p className="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {safeProduct.brand}
            </p>
            <h3
              className="font-semibold text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-900 dark:text-white group-hover:text-yellow-400 transition-colors line-clamp-2 cursor-pointer hover:underline"
              onClick={handleNameClick}
            >
              {safeProduct.name}
            </h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 dark:text-yellow-400">
                  ₱{finalPrice.toLocaleString()}
                </span>
                {finalOriginalPrice && (
                  <span className="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg text-gray-500 dark:text-gray-400 line-through">
                    ₱{finalOriginalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
