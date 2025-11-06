"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import Image from "next/image"

interface WishlistItem {
  id: number
  name: string
  brand: string
  price: number
  originalPrice?: number
  image: string
  colors: string[]
  sizes?: string[]
  category: string
  addedDate: string
  rating?: number
}

interface WishlistItemModalProps {
  item: WishlistItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: WishlistItem, selectedColor: string, selectedSize: string) => void
}

interface StockData {
  [color: string]: {
    [size: string]: number
  }
}

export function WishlistItemModal({ item, isOpen, onClose, onAddToCart }: WishlistItemModalProps) {
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [stockData, setStockData] = useState<StockData>({})
  const [loading, setLoading] = useState(false)

  // Normalize sizes to a string array regardless of source type
  const normalizeSizes = (sizes: any): string[] => {
    if (Array.isArray(sizes)) return sizes as string[]
    if (typeof sizes === 'string') {
      try {
        const parsed = JSON.parse(sizes)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // Fallback: comma-separated string
        return sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
      }
    }
    return []
  }

  // Fetch stock data for the product
  const fetchStockData = async (productId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}`)
      if (!response.ok) {
        console.error('Failed to fetch product stock data')
        return
      }
      
      const product = await response.json()
      if (product && product.variants) {
        setStockData(product.variants)
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get available colors (colors that have at least one size in stock)
  const getAvailableColors = (): string[] => {
    if (!item?.colors || item.colors.length === 0) return []
    
    return item.colors.filter(color => {
      const colorStock = stockData[color]
      if (!colorStock) return false
      return Object.values(colorStock).some(stock => stock > 0)
    })
  }

  // Get available sizes for a specific color (sizes that are in stock)
  const getAvailableSizes = (color: string): string[] => {
    const sizesArray = normalizeSizes(item?.sizes)
    if (sizesArray.length === 0) return []

    const colorStock = stockData[color]
    if (!colorStock) return []

    return sizesArray
      .filter((size) => {
        const stock = colorStock[size]
        return typeof stock === 'number' && stock > 0
      })
      .sort((a, b) => Number(a) - Number(b))
  }

  // Get stock count for a specific color/size combination
  const getStockCount = (color: string, size: string): number => {
    return stockData[color]?.[size] || 0
  }

  // Handle color selection and update available sizes
  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    
    // Reset size selection and set to first available size for this color
    if (color !== "Default") {
      const availableSizes = getAvailableSizes(color)
      if (availableSizes.length > 0) {
        setSelectedSize(availableSizes[0])
      } else {
        setSelectedSize("")
      }
    } else {
      setSelectedSize("One Size")
    }
  }

  // Reset selections when modal opens with new item
  useEffect(() => {
    if (item && isOpen) {
      // Fetch stock data first
      fetchStockData(item.id)
    }
  }, [item, isOpen])

  // Update selections when stock data is loaded
  useEffect(() => {
    if (item && isOpen && Object.keys(stockData).length > 0) {
      const availableColors = getAvailableColors()
      
      // Set default color - prioritize available colors
      let defaultColor = ""
      if (availableColors.length > 0) {
        defaultColor = availableColors[0]
      } else if (item.colors && item.colors.length > 0) {
        defaultColor = "Default"
      } else {
        defaultColor = "Default"
      }
      setSelectedColor(defaultColor)
      
      // Set default size based on available sizes for the selected color
      if (defaultColor !== "Default") {
        const availableSizes = getAvailableSizes(defaultColor)
        if (availableSizes.length > 0) {
          setSelectedSize(availableSizes[0])
        } else {
          setSelectedSize("One Size")
        }
      } else {
        setSelectedSize("One Size")
      }
    }
  }, [stockData, item, isOpen])

  if (!item) return null

  const handleAddToCart = () => {
    // Validate selections and stock
    const finalColor = selectedColor || "Default"
    const finalSize = selectedSize || "One Size"
    
    // Check stock availability for non-default selections
    if (finalColor !== "Default" && finalSize !== "One Size") {
      const stock = getStockCount(finalColor, finalSize)
      if (stock <= 0) {
        alert("This item is currently out of stock.")
        return
      }
    }
    
    onAddToCart(item, finalColor, finalSize)
    onClose()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(price)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="flex gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <Image
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.brand}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-lg">{formatPrice(item.price)}</span>
                {item.originalPrice && item.originalPrice > item.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Color</label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading stock information...</div>
            ) : item.colors && item.colors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {item.colors.map((color) => {
                  const colorStock = stockData[color]
                  const hasStock = colorStock && Object.values(colorStock).some(stock => stock > 0)
                  
                  return (
                    <Button
                        key={color}
                        variant={selectedColor === color ? "default" : "outline"}
                        size="sm"
                        onClick={() => hasStock && handleColorSelect(color)}
                        disabled={!hasStock}
                        className={`h-9 px-4 text-sm font-medium transition-all duration-200 ${
                          selectedColor === color 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-muted"
                        } ${
                          !hasStock ? "opacity-50 cursor-not-allowed bg-muted/30" : ""
                        }`}
                        title={!hasStock ? "Out of stock" : ""}
                      >
                       {color}
                       {!hasStock && (
                         <span className="ml-2 text-xs opacity-70">(Out of stock)</span>
                       )}
                     </Button>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Default color will be applied
              </div>
            )}
          </div>

          {/* Size Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Size</label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading stock information...</div>
            ) : selectedColor && selectedColor !== "Default" && normalizeSizes(item.sizes).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {normalizeSizes(item.sizes).map((size) => {
                  const stock = getStockCount(selectedColor, size)
                  const hasStock = stock > 0
                  
                  return (
                    <Button
                       key={size}
                       variant={selectedSize === size ? "default" : "outline"}
                       size="sm"
                       onClick={() => hasStock && setSelectedSize(size)}
                       disabled={!hasStock}
                       className={`h-12 px-3 text-sm min-w-[50px] flex flex-col items-center justify-center gap-0.5 font-medium transition-all duration-200 ${
                         selectedSize === size 
                           ? "bg-primary text-primary-foreground shadow-md" 
                           : "hover:bg-muted"
                       } ${
                         !hasStock ? "opacity-50 cursor-not-allowed bg-muted/30" : ""
                       }`}
                       title={!hasStock ? "Out of stock" : `${stock} in stock`}
                     >
                       <span className="text-sm font-semibold">{size}</span>
                       <span className="text-xs opacity-80">({stock})</span>
                     </Button>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {selectedColor === "Default" ? "One size fits all" : "Select a color first"}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 font-medium border-2 hover:bg-muted/50 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddToCart}
            className="flex-1 h-11 bg-primary hover:bg-primary/90 font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}