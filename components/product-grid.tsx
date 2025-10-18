"use client"

import { useState, useEffect, useCallback } from "react"
import { ProductCard } from "./product-card"
import { ProductCardBrochure } from "./product-card-brochure"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, Package, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/product-data"




interface ProductGridProps {
  products: Product[]
  searchQuery?: string
  category?: string
  onWishlistUpdate?: (change: number) => void
  isLoggedIn?: boolean
  loading?: boolean
}

export function ProductGrid({
  products,
  searchQuery = "",
  category,
  onWishlistUpdate,
  isLoggedIn = false,
  loading: externalLoading = false,
}: ProductGridProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [sortBy, setSortBy] = useState("featured")
  const [filterBy, setFilterBy] = useState("all")
  const [loading, setLoading] = useState(true)
  const isActuallyLoading = loading || externalLoading
  const [productsPerPage] = useState(8)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())

  // Filter and sort products based on props and state
  const loadAndFilterProducts = useCallback(() => {
    console.log('🔍 ProductGrid: loadAndFilterProducts called with', products.length, 'products')
    let filtered = products

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query),
      )
    }

    // Category filter
    if (category && category !== "all") {
      filtered = filtered.filter(
        (product) => product.category.toLowerCase() === category.toLowerCase(),
      )
    }

    // Additional filters
    if (filterBy === "new") {
      filtered = filtered.filter((product) => product.isNew)
    } else if (filterBy === "sale") {
      filtered = filtered.filter((product) => product.isSale)
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "rating":
          return (b.rating || 0) - (a.rating || 0)
        case "newest":
          return b.id - a.id
        case "featured":
          if (a.isNew && !b.isNew) return -1
          if (!a.isNew && b.isNew) return 1
          if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0)
          return a.name.localeCompare(b.name)
        default:
          return a.name.localeCompare(b.name)
      }
    })

    setFilteredProducts(filtered)
    setLastSyncTime(new Date())

    return filtered
  }, [products, searchQuery, category, sortBy, filterBy])

  // Initial load and reset pagination when inputs change
  useEffect(() => {
    setLoading(true)
    const filtered = loadAndFilterProducts()
    setCurrentPage(1)
    setDisplayedProducts(filtered.slice(0, productsPerPage))
    setLoading(false)
  }, [loadAndFilterProducts, productsPerPage])

  // Pagination - load more products
  const loadMoreProducts = () => {
    const nextPage = currentPage + 1
    const endIndex = nextPage * productsPerPage
    setDisplayedProducts(filteredProducts.slice(0, endIndex))
    setCurrentPage(nextPage)
  }

  const remainingProducts = filteredProducts.length - displayedProducts.length

  // Force sync button handler placeholder - just reloads filtered products here
  const handleForceSync = () => {
    setLoading(true)
    const filtered = loadAndFilterProducts()
    setDisplayedProducts(filtered.slice(0, productsPerPage * currentPage))
    setLoading(false)
  }

  if (isActuallyLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="max-w-[98vw] xl:max-w-[96vw] 2xl:max-w-[94vw] mx-auto px-1 sm:px-2 lg:px-3 xl:px-2">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="h-8 w-64 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
                <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-10 w-40 bg-muted animate-pulse rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Product Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-2">
                  <div className="aspect-square bg-muted animate-pulse rounded-lg border-4 border-yellow-400"></div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-background">
      <div className="max-w-[98vw] xl:max-w-[96vw] 2xl:max-w-[94vw] mx-auto px-1 sm:px-2 lg:px-3 xl:px-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-[4vw] sm:text-3xl font-bold text-foreground mb-2">
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : category
                    ? `${category.charAt(0).toUpperCase() + category.slice(1)} Shoes`
                    : "All Shoes"}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">

              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-20 sm:w-32 border-2 border-primary bg-primary/10 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="featured">
                    Featured
                  </SelectItem>
                  <SelectItem value="name">
                    Name A-Z
                  </SelectItem>
                  <SelectItem value="price-low">
                    Price: Low to High
                  </SelectItem>
                  <SelectItem value="price-high">
                    Price: High to Low
                  </SelectItem>
                  <SelectItem value="rating">
                    Highest Rated
                  </SelectItem>
                  <SelectItem value="newest">
                    Newest First
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Sync Info */}
        <div className="mb-4 text-sm text-muted-foreground">
          Last synced: {lastSyncTime.toLocaleTimeString()}
          {currentPage > 1 && ` • Page ${currentPage}`}
        </div>

        {/* Additional Filters */}
        {(searchQuery || category) && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-32 border-border bg-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">
                    All
                  </SelectItem>
                  <SelectItem value="new">
                    New
                  </SelectItem>
                  <SelectItem value="sale">
                    On Sale
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card className="p-12 bg-card border-border">
            <CardContent className="text-center">
              <RefreshCw className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Loading products...</h3>
              <p className="text-muted-foreground mb-4">
                Please wait while we fetch the latest products
              </p>
            </CardContent>
          </Card>
        ) : displayedProducts.length === 0 ? (
          <Card className="p-12 bg-card border-border">
            <CardContent className="text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? `No products match your search for "${searchQuery}"`
                  : "No products are currently available in this category"}
              </p>
              {searchQuery && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Try:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      Checking your spelling
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      Using different keywords
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      Browsing categories
                    </Badge>
                  </div>  
                </div>
              )}
              <Button
                onClick={handleForceSync}
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedProducts.map((product) => (
                isLoggedIn ? (
                  <ProductCard key={product.id} product={product} />
                ) : (
                  <ProductCardBrochure key={product.id} product={product} isLoggedIn={isLoggedIn} />
                )
              ))}
            </div>

            {/* Load More Button */}
            {remainingProducts > 0 && (
              <div className="text-center mt-12">
                <Button
                  onClick={loadMoreProducts}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-lg"
                >
                  Load More Products ({remainingProducts} remaining)
                </Button>
              </div>
            )}
          </>
        )}


      </div>
    </section>
  )
}
