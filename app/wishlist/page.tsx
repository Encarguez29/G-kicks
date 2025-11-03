"use client"

export const dynamic = 'force-dynamic'


import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWishlist } from "@/contexts/wishlist-context"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Heart, ShoppingCart, Trash2, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WishlistItemModal } from "@/components/wishlist-item-modal"
import Image from "next/image"

export default function WishlistPage() {
  const { state: wishlistState, removeFromWishlist, clearWishlist } = useWishlist()
  const { addItem } = useCart()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [modalItem, setModalItem] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleAddToCart = (item: any) => {
    setModalItem(item)
    setIsModalOpen(true)
  }

  const handleModalAddToCart = (item: any, selectedColor: string, selectedSize: string) => {
    addItem({
      id: item.id.toString(),
      name: item.name,
      price: item.price,
      image: item.image,
      color: selectedColor,
      size: selectedSize,
      brand: item.brand || "Unknown",
    })

    // Remove item from wishlist after adding to cart
    removeFromWishlist(item.id)

    toast({
      title: "Added to Cart",
      description: `${item.name} (${selectedColor}, ${selectedSize}) has been added to your cart and removed from wishlist.`,
    })
  }

  const handleRemoveItem = (itemId: string) => {
    removeFromWishlist(parseInt(itemId))
    toast({
      title: "Removed from Wishlist",
      description: "Item has been removed from your wishlist.",
    })
  }

  const handleClearWishlist = () => {
    clearWishlist()
    toast({
      title: "Wishlist Cleared",
      description: "All items have been removed from your wishlist.",
    })
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const handleAddSelectedToCart = () => {
    if (selectedItems.size === 0) return
    
    // For multiple items, we'll process them one by one through the modal
    const selectedWishlistItems = wishlistState.items.filter((item) =>
      selectedItems.has(item.id.toString())
    )
    
    if (selectedWishlistItems.length > 0) {
      // Start with the first item
      setModalItem(selectedWishlistItems[0])
      setIsModalOpen(true)
      
      // Store remaining items for sequential processing
      const remainingItems = selectedWishlistItems.slice(1)
      if (remainingItems.length > 0) {
        // We'll handle this by updating the modal to show next item after current one is processed
        setModalItem({...selectedWishlistItems[0], _remainingItems: remainingItems})
      }
    }
  }

  if (wishlistState.items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col transition-colors">
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="bg-card border-border">
            <CardContent className="text-center py-8 sm:py-12">
              <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-yellow-400 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
                Save items you love to your wishlist and shop them later.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
              >
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors">
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 -ml-4 text-muted-foreground hover:text-yellow-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-yellow-400">
                My Wishlist
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                {wishlistState.items.length} {wishlistState.items.length === 1 ? "item" : "items"} saved
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {selectedItems.size > 0 && (
                <Button
                  onClick={handleAddSelectedToCart}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add Selected to Cart ({selectedItems.size})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleClearWishlist}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 bg-transparent"
              >
                Clear Wishlist
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {wishlistState.items.map((item) => {
            console.log('🖼️ Wishlist item image debug:', {
              id: item.id,
              name: item.name,
              image: item.image,
              hasImage: !!item.image,
              isPlaceholder: item.image === '/placeholder.svg' || item.image === '/placeholder-product.jpg'
            })
            return (
              <Card
                key={item.id}
                className="group relative bg-card border-border hover:shadow-lg transition-all duration-200"
              >
                <CardContent className="p-4">
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id.toString())}
                      onChange={() => toggleItemSelection(item.id.toString())}
                      className="w-4 h-4 text-yellow-400 bg-background border-border rounded focus:ring-yellow-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id.toString())}
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
                        {item.name}
                      </h3>
                      {item.addedDate && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-muted text-muted-foreground flex-shrink-0"
                        >
                          {new Date(item.addedDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>

                    {item.brand && (
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    )}

                    {item.colors && item.colors.length > 0 && (
                      <div className="flex items-center gap-1">
                        {item.colors.slice(0, 4).map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full border-2 border-background shadow-sm ring-1 ring-border"
                            style={{ backgroundColor: color.toLowerCase() }}
                            title={color}
                          />
                        ))}
                        {item.colors.length > 4 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            +{item.colors.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {item.rating && (
                      <div className="flex items-center gap-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 transition-colors ${
                                i < Math.floor(item.rating ?? 0)
                                  ? "text-yellow-400 fill-current"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({item.rating})</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">
                          ₱{item.price.toLocaleString()}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₱{item.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ₱{(item.price * 1.12).toLocaleString()} (incl. 12% VAT)
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-2"
                      >
                        Add to Cart
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          try {
                            router.push(`/product/${item.id}`)
                          } catch (error) {
                            console.warn('Navigation error:', error)
                            window.location.href = `/product/${item.id}`
                          }
                        }}
                        className="flex-1 text-xs py-2 border-border hover:bg-muted text-foreground hover:text-foreground"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {wishlistState.items.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-border">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex-1 border-border hover:bg-muted text-foreground hover:text-foreground"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => router.push("/cart")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              View Cart
            </Button>
          </div>
        )}
      </main>

      {/* Size and Color Selection Modal */}
      <WishlistItemModal
        item={modalItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setModalItem(null)
        }}
        onAddToCart={handleModalAddToCart}
      />
    </div>
  )
}
