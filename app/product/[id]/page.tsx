"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Minus, Plus, Eye, Star, MessageSquare, Move3D, Image as ImageIcon } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useWishlist } from "@/contexts/wishlist-context"
import { useAuth } from "@/contexts/auth-context"
import { getProductById, fetchProductByIdFromAPI, updateViewCount, hasUserViewedProduct } from "@/lib/product-data"
import { checkStock } from "@/lib/admin-data"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ReviewForm } from "@/components/review-form-modal"
import { ThreeDProductViewer } from "@/components/3d-product-viewer-simple"
import { CustomerReviews } from "@/components/customer-reviews"

import type { Product } from "@/lib/product-data"



export default function ProductPage() {
  const params = useParams()
  const productId = Number(params.id)
  const [mounted, setMounted] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const { addItem } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const auth = useAuth()
  const user = auth?.user
  const authLoading = auth?.loading || false
  const { toast } = useToast()
  
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [stockLevels, setStockLevels] = useState<{ [color: string]: { [size: string]: number } }>({})
  const [currentViews, setCurrentViews] = useState(0)
  const [hasViewed, setHasViewed] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [viewMode, setViewMode] = useState<'images' | '3d'>('images')
  const fetchedProductIdRef = useRef<number | null>(null)
  

  
  interface Review {
    rating: number
    content: string
  }
  const [reviews] = useState<Review[]>([]) // Placeholder for future reviews

  // Memoize product to prevent unnecessary re-renders
  const memoizedProduct = useMemo(() => product, [product?.id])

  const isAuthenticated = !authLoading && !!user

  useEffect(() => {
    setMounted(true)
  }, [])
  

  // Load product data and initial views when mounted and productId changes
  useEffect(() => {
    console.log('🔄 Product loading useEffect triggered - mounted:', mounted, 'productId:', productId)
    if (!mounted) return
    if (fetchedProductIdRef.current === productId) {
      console.log('🚀 Product already loaded, skipping fetch')
      return
    }

    async function loadProduct() {
      console.log('📡 Fetching product data for ID:', productId)
      // Always fetch from API to ensure we have the latest data including 3D model URLs
      const fetchedProduct = await fetchProductByIdFromAPI(productId)
      const prod = fetchedProduct || undefined
      
      console.log('✅ Product data loaded:', prod?.name)
      console.log('🎯 3D Model URL:', prod?.model_3d_url)
      console.log('📁 3D Model Filename:', prod?.model_3d_filename)
      
      // Only update state if we actually got a different product
      if (prod && prod.id !== fetchedProductIdRef.current) {
        setProduct(prod)
        setCurrentViews(prod.views || 0)
        fetchedProductIdRef.current = prod.id
      } else if (!prod) {
        setProduct(null)
        fetchedProductIdRef.current = null
      }
    }
    
    loadProduct()
  }, [mounted, productId])

  // Reset view mode to 'images' if product doesn't have 3D model
  useEffect(() => {
    if (product && (!product.model_3d_url || product.model_3d_url.trim() === '')) {
      setViewMode('images')
    }
  }, [product?.id, product?.model_3d_url])

  useEffect(() => {
  console.log('👁️ View tracking useEffect triggered - mounted:', mounted, 'productId:', productId, 'isAuthenticated:', isAuthenticated, 'user?.id:', user?.id)
  if (!mounted || !product) return
  if (!isAuthenticated || !user?.id) return  // Guard clause: exit if no user or no id
  if (hasViewed) return // Don't track view if already viewed

  const userId = String(user.id) // Now TypeScript knows user.id exists

  async function checkAndUpdateView() {
    console.log("Checking and updating view for user:", userId, "product:", productId);
    
    const viewed = await hasUserViewedProduct(userId, productId);

    if (!viewed) {
      console.log("User hasn't viewed this product, updating view count");
      const newCount = await updateViewCount(productId, userId);
      if (newCount > 0) {
        setCurrentViews(newCount);
      }
      setHasViewed(true); // Mark as viewed to prevent future calls
    } else {
      console.log("User has already viewed this product");
      setHasViewed(true);
    }
  }

  checkAndUpdateView()
}, [mounted, productId, isAuthenticated, user?.id, hasViewed])


  useEffect(() => {
    if (!memoizedProduct) return

    function fetchStocks() {
      const stocks: { [color: string]: { [size: string]: number } } = {}
      const colors = memoizedProduct?.colors && memoizedProduct?.colors.length > 0 ? memoizedProduct.colors : ["default"]
      const sizes = memoizedProduct?.sizes || ["5", "6", "7", "8", "9", "10", "11", "12"]
      
      for (const color of colors) {
        stocks[color] = {}
        for (const size of sizes) {
          // Use product data directly instead of making API calls
          if (memoizedProduct?.variants && memoizedProduct.variants[color] && memoizedProduct.variants[color][size] !== undefined) {
            stocks[color][size] = memoizedProduct.variants[color][size] || 0
          } else if (memoizedProduct?.variants && Object.keys(memoizedProduct.variants).length > 0) {
            // If general stock is available, assume reasonable stock for missing variants
            stocks[color][size] = (memoizedProduct as any).stock_quantity > 0 ? Math.min((memoizedProduct as any).stock_quantity, 10) : 0
          } else {
            // Fall back to general stock_quantity if no variants structure exists
            stocks[color][size] = (memoizedProduct as any)?.stock_quantity || 10
          }
        }
      }
      
      setStockLevels(stocks)
      setSelectedColor(colors[0])
    }

    fetchStocks()

    // Listen for inventory updates
    const handleInventoryUpdate = (event: CustomEvent) => {
      const { productId: updatedProductId } = event.detail
      if (updatedProductId === productId) {
        // Refresh stock levels when this product's inventory is updated
        fetchStocks()
      }
    }

    window.addEventListener('inventoryUpdate', handleInventoryUpdate as EventListener)

    return () => {
      window.removeEventListener('inventoryUpdate', handleInventoryUpdate as EventListener)
    }
  }, [productId, product?.id])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-gray-900 dark:text-yellow-400">Loading...</p>
      </div>
    )
  }

  if (!memoizedProduct) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-yellow-400 mb-2">Product Not Found</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          The product you're looking for doesn't exist.
        </p>
      </div>
    )
  }

  // From here on, memoizedProduct is guaranteed to be not null

  const isWishlisted = isInWishlist(memoizedProduct.id)
  const currentStock = selectedColor && selectedSize ? stockLevels[selectedColor]?.[selectedSize] ?? 0 : 0
  const maxQuantity = Math.min(currentStock, 10)

  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0
  const ratingCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  }

  const renderStars = (rating: number, filled = true) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 sm:h-4 sm:w-4 ${
          filled && i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"
        }`}
      />
    ))

  const renderRatingBar = (stars: number, count: number) => {
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
    return (
      <div className="flex items-center space-x-2 sm:space-x-3">
        <span className="text-xs sm:text-sm font-medium w-2 text-gray-900 dark:text-gray-300">{stars}</span>
        <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
        <div className="flex-1 bg-muted rounded-full h-1.5 sm:h-2">
          <div
            className="bg-yellow-400 h-1.5 sm:h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 w-6 sm:w-8 text-right">{count}</span>
      </div>
    )
  }

  const colorMap: Record<string, string> = {
    black: "bg-black",
    white: "bg-white border-2 border-gray-300 dark:border-gray-600",
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    gray: "bg-gray-500",
    navy: "bg-blue-900",
  }

  // Early return if product is not loaded yet
  if (!mounted || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    )
  }

  const savingsAmount = product.originalPrice ? product.originalPrice - product.price : 0

  // Use gallery_images if available, otherwise show single main image
  const productImages = product.gallery_images && product.gallery_images.length > 0
    ? product.gallery_images.map((imageUrl, index) => ({
        src: imageUrl,
        alt: `${product.name} - Image ${index + 1}`
      }))
    : product.image_url || product.image
      ? [{ src: product.image_url || product.image, alt: product.name }]
      : []

  const handleAddToCart = () => {
    if (authLoading) return
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    if (!selectedColor || !selectedSize) {
      toast({
        title: "Selection Required",
        description: "Please select both color and size before adding to cart.",
        variant: "destructive",
      })
      return
    }
    if (currentStock === 0) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }
    if (quantity > currentStock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${currentStock} items available.`,
        variant: "destructive",
      })
      return
    }
    // Add items based on selected quantity
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id.toString(),
        name: product.name,
        price: product.price,
        image: productImages[selectedImageIndex]?.src || product.image || "/placeholder.svg",
        size: selectedSize,
        color: selectedColor,
        brand: product.brand,
      })
    }
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    })
  }

  const handleWishlistToggle = () => {
    if (authLoading) return
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    if (isWishlisted) {
      removeFromWishlist(product.id)
      toast({
        title: "Removed from Wishlist",
        description: `${product.name} has been removed from your wishlist.`,
      })
    } else {
      // Use the currently selected image, just like the cart does
      const productWithCurrentImage = {
        ...product,
        image: productImages[selectedImageIndex]?.src || product.image_url || product.image || "/placeholder.svg"
      }
      addToWishlist(productWithCurrentImage)
      toast({
        title: "Added to Wishlist",
        description: `${product.name} has been added to your wishlist.`,
      })
    }
  }

  const handleWriteReview = () => {
    if (authLoading) return
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    setShowReviewForm(true)
  }

  const handleSubmitReview = (reviewData: {
    rating: number
    comment: string
    userName: string
    email?: string
    photos?: File[]
  }) => {
    setShowReviewForm(false)
    toast({
      title: "Review Submitted",
      description: "Thank you for your review! It has been submitted successfully.",
    })
  }

  const handleCancelReview = () => {
    setShowReviewForm(false)
  }

  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index)
    const thumbnails = document.querySelectorAll(".thumbnail-image")
    thumbnails[index]?.classList.add("animate-pulse")
    setTimeout(() => {
      thumbnails[index]?.classList.remove("animate-pulse")
    }, 200)
  }

  const handleLoginRedirect = () => {
    window.location.href = "/auth"
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Product Images & 3D Viewer */}
            <div className="space-y-3 sm:space-y-4">
              {/* View Mode Toggle */}
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Button
                  variant={viewMode === 'images' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('images')}
                  className={`flex items-center space-x-2 ${
                    viewMode === 'images'
                      ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-yellow-400'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Images</span>
                </Button>
                {/* Only show 3D View button if 3D model is available */}
                {product.model_3d_url && product.model_3d_url.trim() !== '' && (
                  <Button
                    variant={viewMode === '3d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('3d')}
                    className={`flex items-center space-x-2 ${
                      viewMode === '3d'
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-yellow-400'
                    }`}
                  >
                    <Move3D className="w-4 h-4" />
                    <span>3D View</span>
                  </Button>
                )}
              </div>

              {/* Conditional Content Based on View Mode */}
              {viewMode === 'images' ? (
                <>
                  {/* Main Image */}
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 sm:border-4 border-yellow-400 group">
                    <Image
                      src={productImages[selectedImageIndex]?.src || product.image_url || product.image}
                      alt={productImages[selectedImageIndex]?.alt || product.name}
                      width={600}
                      height={600}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                      priority
                    />
                  </div>

                  {/* Thumbnail Images - Only show if there are multiple images */}
                  {productImages.length > 1 && (
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {productImages.map((image, index) => (
                        <div
                          key={index}
                          className={`thumbnail-image relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer border-2 sm:border-3 transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                            selectedImageIndex === index
                              ? "border-yellow-400 ring-2 sm:ring-3 ring-yellow-400 ring-offset-1 sm:ring-offset-2 shadow-lg"
                              : "border-gray-200 dark:border-gray-700 hover:border-yellow-300"
                          }`}
                          onClick={() => handleImageSelect(index)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleImageSelect(index)
                            }
                          }}
                        >
                          <Image
                            src={image.src}
                            alt={image.alt}
                            width={150}
                            height={150}
                            className="w-full h-full object-cover transition-all duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* 3D Viewer */
                <ThreeDProductViewer
                  modelUrl={product.model_3d_url}
                  productName={product.name}
                  fallbackImage={productImages[0]?.src || product.image_url || product.image}
                  className="w-full"
                />
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-4 sm:space-y-6">
              {/* Brand and Title */}
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 sm:mb-2">
                  {product.brand}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight">
                  {product.name}
                </h1>

                {/* Views */}
                <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {currentViews} {currentViews === 1 ? "view" : "views"}
                  {isAuthenticated && user && hasViewed && (
                    <Badge
                      variant="secondary"
                      className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    >
                      You viewed this
                    </Badge>
                  )}
                  {!isAuthenticated && !authLoading && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                      (Login to track your views)
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-2">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-yellow-400">
                    ₱{product.price.toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    {product.originalPrice && (
                      <span className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 line-through">
                        ₱{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                    {savingsAmount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs sm:text-sm">
                        Save ₱{savingsAmount.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <div className="flex items-center mb-2 sm:mb-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Color: </span>
                    <span className="text-sm font-bold ml-1 capitalize text-gray-900 dark:text-yellow-400">
                      {selectedColor}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-colors capitalize ${
                          selectedColor === color
                            ? "border-yellow-400 bg-yellow-400 text-black"
                            : "border-border hover:border-gray-300 dark:hover:border-gray-500 bg-card text-foreground"
                        }`}
                        title={`Select ${color} colorway`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Click to select different colorways
                  </p>
                </div>
              )}

               {/* Size Selection */}
              <div>
                <div className="flex items-center mb-2 sm:mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Size: </span>
                  <span className="text-sm font-bold ml-1 text-gray-900 dark:text-yellow-400">
                    {selectedSize || "Select size"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(Array.isArray(product?.sizes) ? product.sizes : ["5", "6", "7", "8", "9", "10", "11", "12"]).map((size) => {
                    const colorToCheck = selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0] : "default")
                    const sizeStock = stockLevels[colorToCheck]?.[size] ?? 0
                    const isAvailable = sizeStock > 0

                    return (
                      <button
                        key={size}
                        onClick={() => isAvailable && setSelectedSize(size)}
                        disabled={!isAvailable}
                        className={`p-2 sm:p-3 text-sm font-medium rounded-lg border-2 transition-colors min-h-[44px] ${
                          selectedSize === size
                            ? "border-yellow-400 bg-yellow-400 text-black"
                            : isAvailable
                            ? "border-border hover:border-gray-300 dark:hover:border-gray-500 bg-card text-foreground"
                  : "border-muted bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </div>


              {/* Quantity Selection */}
              <div>
                <span className="text-sm font-medium mb-2 sm:mb-3 block text-gray-900 dark:text-gray-300">
                  Quantity
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center border-2 border-yellow-400 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="px-2 sm:px-3 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 min-h-[44px]"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="px-3 sm:px-4 py-2 font-medium min-w-[3rem] text-center text-gray-900 dark:text-gray-300">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      disabled={quantity >= maxQuantity}
                      className="px-2 sm:px-3 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 min-h-[44px]"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={authLoading}
                  className="w-full bg-black dark:bg-yellow-400 text-white dark:text-black hover:bg-gray-800 dark:hover:bg-yellow-500 py-3 sm:py-4 text-sm sm:text-base font-medium min-h-[48px]"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  {authLoading ? "Loading..." : `Add ${selectedColor} to Cart`}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleWishlistToggle}
                  disabled={authLoading}
                  className="w-full border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 py-3 sm:py-4 text-sm sm:text-base font-medium bg-transparent dark:bg-gray-800 text-gray-900 dark:text-gray-300 min-h-[48px]"
                >
                  <Heart className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${isWishlisted ? "fill-current text-red-500" : ""}`} />
                  {authLoading ? "Loading..." : "Add to Wishlist"}
                </Button>
              </div>

              {/* Description */}
              <div className="pt-4 sm:pt-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-yellow-400">Description</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  {product.description}
                </p>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="mt-8 sm:mt-12">
        <CustomerReviews 
          productName={memoizedProduct.name}
          productId={productId}
        />
      </div>

      {/* Login Required Modal */}
      {showLoginModal && !authLoading && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all duration-300 scale-100">
            <div className="p-6 sm:p-8 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600 dark:text-yellow-400" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-yellow-400 mb-3 sm:mb-4">
                Login Required
              </h2>

              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 leading-relaxed">
                Please log in to add items to your cart or wishlist and enjoy a personalized shopping experience.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleLoginRedirect}
                  className="w-full bg-black dark:bg-yellow-400 text-white dark:text-black hover:bg-gray-800 dark:hover:bg-yellow-500 py-3 text-sm sm:text-base font-medium rounded-lg min-h-[48px]"
                >
                  Login / Register
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLoginModal(false)}
                  className="w-full border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 py-3 text-sm sm:text-base font-medium rounded-lg min-h-[48px] text-gray-900 dark:text-gray-300"
                >
                  Continue Browsing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
