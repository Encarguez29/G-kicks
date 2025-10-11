"use client"

import { useState, useEffect } from "react"

export const dynamic = 'force-dynamic'

import { Hero } from "@/components/hero"
import { ProductGrid } from "@/components/product-grid"
import { PromotionalCarousel } from "@/components/promotional-carousel"
import { useSearchParams } from "next/navigation"
import type { Product } from "@/lib/product-data"
import { fetchProductsFromAPI, saveProducts } from "@/lib/product-data"
import { useAuth } from "@/contexts/auth-context"

export default function HomePage() {
  const { user, loading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [productsLoading, setProductsLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    async function syncProducts() {
      console.log('🔍 HomePage: Starting to fetch products...')
      const syncedProducts = await fetchProductsFromAPI()
      console.log('📦 HomePage: Fetched products:', syncedProducts.length, 'items')
      console.log('📋 HomePage: First product:', syncedProducts[0])
      setProducts(syncedProducts)
      // Save products to localStorage for other parts of the application
      saveProducts(syncedProducts)
      setProductsLoading(false)
    }
    syncProducts()
  }, [])

  useEffect(() => {
    const search = searchParams?.get("search")
    if (search) {
      setSearchQuery(search)
    } else {
      setSearchQuery("")
    }
  }, [searchParams])

  const isLoggedIn = !loading && !!user

  return (
    <div className="min-h-screen bg-background transition-colors">
      <main>
        {!searchQuery && <Hero />}
        {!searchQuery && !isLoggedIn && !loading && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <PromotionalCarousel />
          </div>
        )}
        <ProductGrid 
          products={products} 
          searchQuery={searchQuery}
          isLoggedIn={isLoggedIn}
          loading={productsLoading || loading}
        />
      </main>
    </div>
  )
}
