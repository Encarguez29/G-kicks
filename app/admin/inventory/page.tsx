"use client"

export const dynamic = 'force-dynamic'


import React, { Fragment } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAdmin } from "@/contexts/admin-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Edit,
  Plus,
  Search,
  Filter,
  Loader2,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  Eye,
  ImageIcon,
  PlusCircle,
  RefreshCw,
  AlertTriangle,
  Package,
  TrendingDown,
  Grid3X3,
  Archive
} from "lucide-react"

interface Product {
  id: number
  name: string
  subtitle?: string
  sku?: string
  category: string
  brand: string
  price: number
  originalPrice?: number
  image?: string
  image_url?: string
  gallery_images?: string[]
  description?: string
  is_new?: boolean
  is_sale?: boolean
  is_active: boolean
  stock_quantity?: number
  low_stock_threshold?: number
  colors?: string[]
  sizes?: string[]
  variants?: Record<string, Record<string, number>>
  model_3d_url?: string // 3D model file URL
  model_3d_filename?: string // 3D model filename
  status?: string
}

export default function InventoryPage() {
  const { toast } = useToast()
  const { state: adminState } = useAdmin()
  const router = useRouter()
  
  // State management
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [stockFilter, setStockFilter] = useState("all") // all, low_stock, out_of_stock, in_stock
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isVariantStockDialogOpen, setIsVariantStockDialogOpen] = useState(false)
  const [variantStockProduct, setVariantStockProduct] = useState<Product | null>(null)
  const [variantStockData, setVariantStockData] = useState<Record<string, Record<string, number>>>({})
  const [updatingVariantStock, setUpdatingVariantStock] = useState(false)
  const [collapsedColorways, setCollapsedColorways] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set())

  // Toggle colorway collapse state
  const toggleColorwayCollapse = (color: string) => {
    setCollapsedColorways(prev => {
      const newSet = new Set(prev)
      if (newSet.has(color)) {
        newSet.delete(color)
      } else {
        newSet.add(color)
      }
      return newSet
    })
  }
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploading3DModel, setUploading3DModel] = useState(false)

  // Form state for add/edit product
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    subtitle: "",
    sku: "",
    category: "",
    brand: "",
    price: 0,
    originalPrice: 0,
    description: "",
    is_new: false,
    is_sale: false,
    is_active: true,
    low_stock_threshold: 10,
    colors: [],
    sizes: [],
    variants: {},
    model_3d_url: "",
    model_3d_filename: "",
    image_url: "",
    gallery_images: [],
    status: "Active"
  })

  const [selectedImages, setSelectedImages] = useState<File[]>([])  
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([])
  const [selected3DModel, setSelected3DModel] = useState<File | File[] | null>(null)
  const [remove3DModel, setRemove3DModel] = useState(false)
  const [colorInput, setColorInput] = useState("")
  const [sizeInput, setSizeInput] = useState("")
  
  // Check admin authentication and redirect if not authenticated
  useEffect(() => {
    console.log('🔍 Admin State:', adminState)
    console.log('🔍 Is Authenticated:', adminState.isAuthenticated)
    console.log('🔍 Admin User:', adminState.user)
    const token = localStorage.getItem('auth_token')
    console.log('🔍 Token in localStorage:', token)
    
    // Only redirect if we're sure the user is not authenticated and not loading
    if (!adminState.isLoading && !adminState.isAuthenticated) {
      // Add a small delay to prevent rapid redirects and race conditions
      const redirectTimer = setTimeout(() => {
        toast({
          title: "Authentication Required",
          description: "Please log in as admin to access inventory management",
          variant: "destructive",
        })
        // Use replace instead of push to prevent back button issues
        router.replace('/admin/login')
      }, 100)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [adminState.isLoading, adminState.isAuthenticated, router, toast])

  const categories = ["Men", "Women", "Kids"]
  const brands = ["Nike", "Adidas", "Converse", "New Balance", "ASICS"]
  const commonSizes = ["6", "7", "8", "9", "10", "11", "12"]

  const loadProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        // API returns products array directly, not wrapped in { products: [] }
        setProducts(Array.isArray(data) ? data : [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading products:', error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load products on component mount only if authenticated
  useEffect(() => {
    if (adminState.isAuthenticated) {
      loadProducts()
    }
  }, [adminState.isAuthenticated])

  // Handle image upload
  const uploadImages = async (files: File[]): Promise<string[]> => {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files`, file)
    })

    const response = await fetch('/api/upload-product-images', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Image upload error:', errorData)
      throw new Error(errorData.error || 'Failed to upload images')
    }

    const data = await response.json()
    return data.urls
  }

  // Handle 3D model upload (single file or multiple files)
  const upload3DModel = async (files: File | File[]): Promise<string> => {
    const formData = new FormData()
    
    // Handle both single file and array of files
    if (Array.isArray(files)) {
      files.forEach(file => {
        formData.append('files', file)
      })
    } else {
      formData.append('files', files)
    }

    const response = await fetch('/api/upload-3d-models', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload 3D model')
    }

    const data = await response.json()
    return data.urls[0] // API returns array, get first URL
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setUploadingImages(true)
      setUploading3DModel(true)

      let imageUrl = currentProduct?.image_url || formData.image_url
      let galleryImages: string[] = currentProduct?.gallery_images || []
      let model3DUrl = formData.model_3d_url

      // Remove images marked for deletion
      if (imagesToRemove.length > 0) {
        galleryImages = galleryImages.filter(imageUrl => !imagesToRemove.includes(imageUrl))
      }

      // Upload images if selected
      if (selectedImages.length > 0) {
        const imageUrls = await uploadImages(selectedImages)
        // If no main image exists, use first uploaded image as main image
        if (!imageUrl) {
          imageUrl = imageUrls[0]
        }
        // Append new images to existing gallery images instead of replacing
        galleryImages = [...galleryImages, ...imageUrls]
      }

      // Handle 3D model removal or upload
      if (remove3DModel) {
        model3DUrl = undefined // Remove the 3D model
      } else if (selected3DModel) {
        model3DUrl = await upload3DModel(selected3DModel)
      }

      const productData = {
        ...formData,
        short_description: formData.subtitle, // Map subtitle to short_description for API
        image_url: imageUrl,
        gallery_images: galleryImages,
        model_3d_url: model3DUrl,
        model_3d_filename: selected3DModel ? 
          (Array.isArray(selected3DModel) ? selected3DModel.map(f => f.name).join(', ') : selected3DModel.name) : 
          (remove3DModel ? undefined : formData.model_3d_filename),
        price: Number(formData.price),
        original_price: Number(formData.originalPrice),
        stock_quantity: Number(formData.stock_quantity),
        low_stock_threshold: Number(formData.low_stock_threshold),
      }

      const url = currentProduct ? `/api/products/${currentProduct.id}` : '/api/products'
      const method = currentProduct ? 'PUT' : 'POST'

      // Wait a moment for token to be available if it's being generated
      let token = localStorage.getItem('auth_token')
      if (!token || token === 'null' || token === 'undefined') {
        console.log('Token not immediately available, waiting 1 second...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        token = localStorage.getItem('auth_token')
      }
      
      console.log('Token being sent:', token ? `Token exists (length: ${token.length})` : 'No token found')
      console.log('Token preview:', token ? token.substring(0, 50) + '...' : 'N/A')
      
      // Check if token exists before making the request
      if (!token || token === 'null' || token === 'undefined') {
        toast({
          title: "Authentication Error",
          description: "No valid authentication token found. Please log in again.",
          variant: "destructive",
        })
        router.push('/admin/login')
        return
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Product ${currentProduct ? 'updated' : 'created'} successfully`,
        })
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        resetForm()
        loadProducts()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error Response:', errorData)
        
        // Handle JWT token issues
        if (response.status === 401) {
          localStorage.removeItem('auth_token')
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          })
          router.push('/admin/login')
          return
        }
        
        throw new Error(errorData.error || `Failed to save product (${response.status})`)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save product'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploadingImages(false)
      setUploading3DModel(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      subtitle: "",
      sku: "",
      category: "",
      brand: "",
      price: 0,
      originalPrice: 0,
      description: "",
      is_new: false,
      is_sale: false,
      is_active: true,
      stock_quantity: 0,
      low_stock_threshold: 10,
      colors: [],
      sizes: [],
      variants: {},
      model_3d_url: "",
      model_3d_filename: "",
      image_url: "",
      gallery_images: [],
      status: "Active"
    })
    setSelectedImages([])
    setImagesToRemove([])
    setSelected3DModel(null)
    setRemove3DModel(false)
    setCurrentProduct(null)
    setColorInput("")
    setSizeInput("")
  }

  const handleEdit = (product: Product) => {
    setCurrentProduct(product)
    setFormData({
      name: product.name || "",
      subtitle: product.subtitle || "",
      sku: product.sku || "",
      category: product.category || "",
      brand: product.brand || "",
      price: product.price || 0,
      originalPrice: product.originalPrice || 0,
      description: product.description || "",
      is_new: product.is_new || false,
      is_sale: product.is_sale || false,
      is_active: product.is_active !== undefined ? product.is_active : true,
      low_stock_threshold: product.low_stock_threshold || 10,
      colors: product.colors || [],
      sizes: product.sizes || [],
      variants: product.variants || {},
      model_3d_url: product.model_3d_url || "",
      model_3d_filename: product.model_3d_filename || "",
      image_url: product.image_url || "",
      gallery_images: product.gallery_images || [],
      status: product.status || "Active"
    })
    setSelectedImages([]) // Clear selected images for edit mode
    setImagesToRemove([]) // Clear images to remove for edit mode
    setRemove3DModel(false) // Clear 3D model removal state for edit mode
    setIsEditDialogOpen(true)
  }



  const handleVariantStockUpdate = (product: Product) => {
    setVariantStockProduct(product)
    // Initialize variant stock data from product
    const variants = product.variants || {}
    setVariantStockData(variants)
    // Initialize all colorways as collapsed
    const allColors = product.colors || []
    setCollapsedColorways(new Set(allColors))
    setIsVariantStockDialogOpen(true)
  }

  const handleVariantStockSave = async () => {
    if (!variantStockProduct) return
    
    setUpdatingVariantStock(true)
    try {
      // Calculate total stock from variants
      let totalStock = 0
      Object.values(variantStockData).forEach((sizeStocks) => {
        totalStock += Object.values(sizeStocks).reduce((sum, qty) => sum + qty, 0)
      })

      console.log('Updating variant stock for product:', variantStockProduct.id)
      console.log('Variant stock data:', variantStockData)
      console.log('Total stock calculated:', totalStock)

      const response = await fetch(`/api/products/${variantStockProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          variants: JSON.stringify(variantStockData),
          stock_quantity: totalStock
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('API Error Response:', response.status, errorData)
        throw new Error(`Failed to update variant stock: ${response.status} - ${errorData}`)
      }

      toast({
        title: "Success",
        description: "Variant stock updated successfully",
      })

      // Refresh products
      await loadProducts()
      setIsVariantStockDialogOpen(false)
      
    } catch (error) {
      console.error('Error updating variant stock:', error)
      toast({
        title: "Error",
        description: "Failed to update variant stock",
        variant: "destructive",
      })
    } finally {
      setUpdatingVariantStock(false)
    }
  }



  const handleArchive = async () => {
    if (!productToDelete) return

    try {
      const token = localStorage.getItem('auth_token')
      console.log('🔍 Debug - Token from localStorage:', token)
      console.log('🔍 Debug - Token type:', typeof token)
      console.log('🔍 Debug - Token length:', token?.length)
      
      if (!token || token === 'null' || token === 'undefined') {
        toast({
          title: "Authentication Error",
          description: "Please log in again to archive products",
          variant: "destructive",
        })
        return
      }
      
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product archived successfully",
        })
        loadProducts()
        // Navigate to archive page
        window.location.href = '/admin/archive'
      } else {
        throw new Error('Failed to archive product')
      }
    } catch (error) {
      console.error('Error archiving product:', error)
      toast({
        title: "Error",
        description: "Failed to archive product",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const addColor = () => {
    if (colorInput.trim() && !formData.colors?.includes(colorInput.trim())) {
      setFormData(prev => ({
        ...prev,
        colors: [...(prev.colors || []), colorInput.trim()]
      }))
      setColorInput("")
    }
  }

  const removeColor = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors?.filter(c => c !== color) || []
    }))
  }

  const addSize = () => {
    if (sizeInput.trim() && !formData.sizes?.includes(sizeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        sizes: [...(prev.sizes || []), sizeInput.trim()]
      }))
      setSizeInput("")
    }
  }

  const removeSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes?.filter(s => s !== size) || []
    }))
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    
    // Stock filter logic
    const stock = product.stock_quantity ?? 0
    const threshold = product.low_stock_threshold ?? 10
    let matchesStock = true
    
    if (stockFilter === "out_of_stock") {
      matchesStock = stock === 0
    } else if (stockFilter === "low_stock") {
      matchesStock = stock > 0 && stock <= threshold
    } else if (stockFilter === "in_stock") {
      matchesStock = stock > threshold
    }
    
    return matchesSearch && matchesCategory && matchesStock
  })

  // Calculate stock statistics
  const stockStats = {
    outOfStock: products.filter(p => (p.stock_quantity ?? 0) === 0).length,
    lowStock: products.filter(p => {
      const stock = p.stock_quantity ?? 0
      const threshold = p.low_stock_threshold ?? 10
      return stock > 0 && stock <= threshold
    }).length,
    inStock: products.filter(p => {
      const stock = p.stock_quantity ?? 0
      const threshold = p.low_stock_threshold ?? 10
      return stock > threshold
    }).length
  }

  // Get products that need attention
  const lowStockProducts = products.filter(p => {
    const stock = p.stock_quantity ?? 0
    const threshold = p.low_stock_threshold ?? 10
    return stock > 0 && stock <= threshold
  })

  const outOfStockProducts = products.filter(p => (p.stock_quantity ?? 0) === 0)

  // Excel export function
  const exportToExcel = () => {
    try {
      // Prepare data for Excel export
      const exportData = products.map(product => ({
        'Product ID': product.id,
        'Name': product.name,
        'SKU': product.sku || 'N/A',
        'Category': product.category,
        'Brand': product.brand,
        'Price': `₱${product.price}`,
        'Original Price': product.originalPrice ? `₱${product.originalPrice}` : 'N/A',
        'Stock Quantity': product.stock_quantity ?? 0,
        'Low Stock Threshold': product.low_stock_threshold ?? 10,
        'Status': product.is_active ? 'Active' : 'Inactive',
        'New Product': product.is_new ? 'Yes' : 'No',
        'On Sale': product.is_sale ? 'Yes' : 'No',
        'Stock Status': (() => {
          const stock = product.stock_quantity ?? 0
          const threshold = product.low_stock_threshold ?? 10
          if (stock === 0) return 'Out of Stock'
          if (stock <= threshold) return 'Low Stock'
          return 'In Stock'
        })()
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      const colWidths = [
        { wch: 10 }, // Product ID
        { wch: 30 }, // Name
        { wch: 15 }, // SKU
        { wch: 15 }, // Category
        { wch: 15 }, // Brand
        { wch: 12 }, // Price
        { wch: 15 }, // Original Price
        { wch: 15 }, // Stock Quantity
        { wch: 18 }, // Low Stock Threshold
        { wch: 10 }, // Status
        { wch: 12 }, // New Product
        { wch: 10 }, // On Sale
        { wch: 15 }  // Stock Status
      ]
      ws['!cols'] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Data')

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      // Save file with current date
      const currentDate = new Date().toISOString().split('T')[0]
      saveAs(data, `stock-data-${currentDate}.xlsx`)
      
      toast({
        title: "✅ Export Successful",
        description: `Stock data exported successfully! File: stock-data-${currentDate}.xlsx`,
        variant: "default",
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "❌ Export Failed",
        description: "Failed to export stock data. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Show toast notifications for stock alerts
  useEffect(() => {
    if (products.length > 0) {
      const criticalProducts = outOfStockProducts.length
      const lowStockCount = lowStockProducts.length
      
      if (criticalProducts > 0) {
        toast({
          title: "🚨 Critical Stock Alert",
          description: `${criticalProducts} product${criticalProducts > 1 ? 's are' : ' is'} out of stock and need immediate attention.`,
          variant: "destructive",
        })
      } else if (lowStockCount > 0) {
        toast({
          title: "⚠️ Low Stock Warning",
          description: `${lowStockCount} product${lowStockCount > 1 ? 's have' : ' has'} low stock levels.`,
          variant: "default",
        })
      }
    }
  }, [products.length, outOfStockProducts.length, lowStockProducts.length, toast])

  // Show loading spinner while checking authentication
  if (adminState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Checking authentication...</span>
      </div>
    )
  }

  if (!adminState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in as an admin to access this page.</p>
          <a href="/admin/login" className="text-primary hover:underline">Go to Admin Login</a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Product Inventory</h1>
          <p className="text-muted-foreground">Manage your product stock levels and details</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setIsAddDialogOpen(true)
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stock Alerts Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stock Statistics Cards */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold text-green-500">{stockStats.inStock}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-500">{stockStats.lowStock}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-500">{stockStats.outOfStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="space-y-3">
          {outOfStockProducts.length > 0 && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                <strong>Critical:</strong> {outOfStockProducts.length} product{outOfStockProducts.length > 1 ? 's are' : ' is'} out of stock:
                <span className="ml-2 font-medium">
                  {outOfStockProducts.slice(0, 3).map(p => p.name).join(', ')}
                  {outOfStockProducts.length > 3 && ` and ${outOfStockProducts.length - 3} more`}
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {lowStockProducts.length > 0 && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <TrendingDown className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                <strong>Warning:</strong> {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's have' : ' has'} low stock:
                <span className="ml-2 font-medium">
                  {lowStockProducts.slice(0, 3).map(p => `${p.name} (${p.stock_quantity} left)`).join(', ')}
                  {lowStockProducts.length > 3 && ` and ${lowStockProducts.length - 3} more`}
                </span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border text-foreground"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 bg-card border-border text-foreground">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-48 bg-card border-border text-foreground">
            <Package className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Levels</SelectItem>
            <SelectItem value="in_stock" className="text-green-600 dark:text-green-400">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                In Stock
              </div>
            </SelectItem>
            <SelectItem value="low_stock" className="text-yellow-600 dark:text-yellow-400">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Low Stock
              </div>
            </SelectItem>
            <SelectItem value="out_of_stock" className="text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Out of Stock
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">Product</TableHead>
                <TableHead className="text-foreground">Category</TableHead>
                <TableHead className="text-foreground">Brand</TableHead>
                <TableHead className="text-foreground">Price</TableHead>
                <TableHead className="text-foreground">Stock</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">3D Model</TableHead>
                <TableHead className="text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {((product.gallery_images && product.gallery_images.length > 0) || product.image_url || product.image) && (
                        <img
                          src={
                            (product.gallery_images && product.gallery_images.length > 0 
                              ? product.gallery_images[0] 
                              : product.image_url) || 
                            product.image ||
                            `/images/${product.name?.toLowerCase().replace(/\s+/g, "-")}.png`
                          }
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=48&width=48"
                          }}
                        />
                      )}
                      <div>
                        <div className="font-medium text-foreground">{product.name}</div>
                        {product.subtitle && (
                          <div className="text-sm text-muted-foreground">{product.subtitle}</div>
                        )}
                        {product.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{product.category}</TableCell>
                  <TableCell className="text-foreground">{product.brand}</TableCell>
                  <TableCell className="text-foreground">
                    <div className="flex flex-col">
                      <span className="font-medium">₱{product.price}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₱{product.originalPrice}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-lg">
                          {product.stock_quantity ?? 0} units
                        </span>
                        {(product.stock_quantity ?? 0) === 0 && (
                          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                        )}
                        {(product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 10) && (
                          <TrendingDown className="h-4 w-4 text-primary" />
                        )}
                        {(product.stock_quantity ?? 0) > (product.low_stock_threshold ?? 10) && (
                          <Package className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex gap-1">
                        {(product.stock_quantity ?? 0) === 0 ? (
                          <Badge className="bg-destructive text-destructive-foreground border-destructive shadow-destructive/20 shadow-lg font-semibold animate-pulse">
                            🚨 Out of Stock
                          </Badge>
                        ) : (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 10) ? (
                          <Badge className="bg-primary text-primary-foreground border-primary shadow-primary/20 shadow-lg font-semibold">
                            ⚠️ Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white border-green-500 shadow-green-500/20 shadow-lg font-semibold">
                            ✅ In Stock
                          </Badge>
                        )}
                      </div>
                      {(product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 10) && (product.stock_quantity ?? 0) > 0 && (
                        <span className="text-xs text-primary">
                          Threshold: {product.low_stock_threshold ?? 10}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant={product.status === 'Active' ? "default" : "secondary"}>
                        {product.status || 'Active'}
                      </Badge>
                      {product.is_new && <Badge variant="outline">New</Badge>}
                      {product.is_sale && <Badge className="bg-destructive text-destructive-foreground">Sale</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.model_3d_url ? (
                      <Badge className="bg-primary text-primary-foreground">3D Available</Badge>
                    ) : (
                      <Badge variant="outline">No 3D Model</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(product)}
                        title="Edit Product"
                        className="bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVariantStockUpdate(product)}
                        title="Manage Size Stock"
                        className="bg-primary hover:bg-primary/90 border-primary text-primary-foreground"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setProductToDelete(product)
                          setIsDeleteDialogOpen(true)
                        }}
                        title="Archive Product"
                        className="bg-orange-500 hover:bg-orange-600 border-orange-500 text-white"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-primary">Add New Product</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new product with all necessary details including 3D model support.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-background border-border text-foreground"
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle" className="text-foreground">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="bg-background border-border text-foreground"
                  placeholder="Enter product subtitle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="text-foreground">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="bg-background border-border text-foreground"
                  placeholder="Enter SKU"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-foreground">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-foreground">Brand *</Label>
                  <Select
                    value={formData.brand}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-gray-900 dark:text-white">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice" className="text-gray-900 dark:text-white">Original Price</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
                    className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Stock Management Section */}
              <div className="space-y-2">
                  <Label htmlFor="low_stock_threshold" className="text-gray-900 dark:text-white">Low Stock Threshold</Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 10 }))}
                    className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    placeholder="10"
                  />
                </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-900 dark:text-white">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>

              {/* Colors Section */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Available Colors</h4>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="Enter color name"
                      className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (colorInput.trim() && !formData.colors?.includes(colorInput.trim())) {
                            setFormData(prev => ({
                              ...prev,
                              colors: [...(prev.colors || []), colorInput.trim()]
                            }))
                            setColorInput("")
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (colorInput.trim() && !formData.colors?.includes(colorInput.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            colors: [...(prev.colors || []), colorInput.trim()]
                          }))
                          setColorInput("")
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {formData.colors && formData.colors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                          <span className="text-gray-900 dark:text-white">{color}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                colors: prev.colors?.filter(c => c !== color) || []
                              }))
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sizes Section */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Available Sizes</h4>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      placeholder="Enter size (e.g., 8.5, 9, 10)"
                      className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (sizeInput.trim() && !formData.sizes?.includes(sizeInput.trim())) {
                            setFormData(prev => ({
                              ...prev,
                              sizes: [...(prev.sizes || []), sizeInput.trim()]
                            }))
                            setSizeInput("")
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (sizeInput.trim() && !formData.sizes?.includes(sizeInput.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            sizes: [...(prev.sizes || []), sizeInput.trim()]
                          }))
                          setSizeInput("")
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Quick Add Common Sizes */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Quick add common sizes:</p>
                    <div className="flex flex-wrap gap-1">
                      {commonSizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (!formData.sizes?.includes(size)) {
                              setFormData(prev => ({
                                ...prev,
                                sizes: [...(prev.sizes || []), size]
                              }))
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            formData.sizes?.includes(size)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          disabled={formData.sizes?.includes(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {formData.sizes && formData.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.sizes.map((size, index) => (
                        <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                          <span className="text-gray-900 dark:text-white">{size}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                sizes: prev.sizes?.filter(s => s !== size) || []
                              }))
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Media and Assets */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media & Assets</h3>
              
              {/* Product Images */}
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">Product Images</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Images
                        </>
                      )}
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        console.log('Files selected:', files.length, files.map(f => f.name))
                        if (files.length > 5) {
                          toast({
                            title: "Error",
                            description: "You can only upload up to 5 images",
                            variant: "destructive",
                          })
                          return
                        }
                        setSelectedImages(files)
                        console.log('Selected images state updated:', files.length)
                      }}
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Drag and drop your images here, or click to browse
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Images: JPG, PNG, WebP, GIF (Max. 5 images, 10MB each) • Recommended size: 800x800px
                    </p>
                  </div>
                  {selectedImages.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {selectedImages.length} image(s) selected
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedImages(prev => prev.filter((_, i) => i !== index))
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">{file.name}</p>
                          </div>
                        ))}
                        {selectedImages.length < 5 && (
                          <div 
                            className="aspect-square bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            <div className="text-center">
                              <Plus className="h-6 w-6 text-gray-500 dark:text-gray-400 mx-auto mb-1" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">Add More</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3D Model Upload */}
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">3D Model (OBJ File)</Label>
                <div className="border-2 border-dashed border-blue-600 dark:border-blue-700 rounded-lg p-6 text-center bg-blue-50 dark:bg-blue-900/10">
                  <div className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 mb-4 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => document.getElementById('model-upload')?.click()}
                      disabled={uploading3DModel}
                    >
                      {uploading3DModel ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload 3D Model
                        </>
                      )}
                    </Button>
                    <input
                      id="model-upload"
                      type="file"
                      accept=".obj,.mtl,.zip,.fbx,.gltf,.glb"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files
                        if (files && files.length > 0) {
                          // For multiple files, we'll handle them as an array
                          const fileArray = Array.from(files)
                          setSelected3DModel(fileArray.length === 1 ? fileArray[0] : fileArray)
                        }
                      }}
                    />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Upload OBJ files with optional MTL materials, or ZIP archives containing OBJ+MTL+textures
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      3D Models: OBJ, FBX, GLTF, GLB (Max. 200MB) • Recommended: OBJ with MTL
                    </p>
                  </div>
                  {selected3DModel && (
                    <div className="mt-4">
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Selected: {Array.isArray(selected3DModel) ? 
                          selected3DModel.map(f => f.name).join(', ') : 
                          selected3DModel.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Options */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Product Options</h4>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_new"
                      checked={formData.is_new}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: !!checked }))}
                    />
                    <Label htmlFor="is_new" className="text-gray-900 dark:text-white">New Product</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_sale"
                      checked={formData.is_sale}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_sale: !!checked }))}
                    />
                    <Label htmlFor="is_sale" className="text-gray-900 dark:text-white">On Sale</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))}
                    />
                    <Label htmlFor="is_active" className="text-gray-900 dark:text-white">Active</Label>
                  </div>
                </div>



                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-900 dark:text-white">Status</Label>
                  <Select
                    value={formData.status || 'Active'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
              }}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.category || !formData.brand || uploadingImages || uploading3DModel}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {uploadingImages || uploading3DModel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-blue-600 dark:text-blue-400">Edit Product</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Update product information and inventory details
            </DialogDescription>
          </DialogHeader>
          
          {/* Same form content as Add Dialog but with edit context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-900 dark:text-white">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-subtitle" className="text-gray-900 dark:text-white">Subtitle</Label>
                <Input
                  id="edit-subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter product subtitle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sku" className="text-gray-900 dark:text-white">SKU</Label>
                <Input
                  id="edit-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter SKU"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="text-gray-900 dark:text-white">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-brand" className="text-gray-900 dark:text-white">Brand *</Label>
                  <Select
                    value={formData.brand}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="text-gray-900 dark:text-white">Price *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-originalPrice" className="text-gray-900 dark:text-white">Original Price</Label>
                  <Input
                    id="edit-originalPrice"
                    type="number"
                    step="0.01"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
                    className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Stock Management Section */}
              <div className="space-y-2">
                  <Label htmlFor="edit-low_stock_threshold" className="text-gray-900 dark:text-white">Low Stock Threshold</Label>
                  <Input
                    id="edit-low_stock_threshold"
                    type="number"
                    min="0"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 10 }))}
                    className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                    placeholder="10"
                  />
                </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-gray-900 dark:text-white">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>

              {/* Colors Section */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Available Colors</h4>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="Enter color name"
                      className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (colorInput.trim() && !formData.colors?.includes(colorInput.trim())) {
                            setFormData(prev => ({
                              ...prev,
                              colors: [...(prev.colors || []), colorInput.trim()]
                            }))
                            setColorInput("")
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (colorInput.trim() && !formData.colors?.includes(colorInput.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            colors: [...(prev.colors || []), colorInput.trim()]
                          }))
                          setColorInput("")
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {formData.colors && formData.colors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                          <span className="text-foreground">{color}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                colors: prev.colors?.filter(c => c !== color) || []
                              }))
                            }}
                            className="text-destructive hover:text-destructive/80 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sizes Section */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-foreground">Available Sizes</h4>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      placeholder="Enter size (e.g., 8.5, 9, 10)"
                      className="bg-background border-border"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (sizeInput.trim() && !formData.sizes?.includes(sizeInput.trim())) {
                            setFormData(prev => ({
                              ...prev,
                              sizes: [...(prev.sizes || []), sizeInput.trim()]
                            }))
                            setSizeInput("")
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (sizeInput.trim() && !formData.sizes?.includes(sizeInput.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            sizes: [...(prev.sizes || []), sizeInput.trim()]
                          }))
                          setSizeInput("")
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Quick Add Common Sizes */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Quick add common sizes:</p>
                    <div className="flex flex-wrap gap-1">
                      {commonSizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (!formData.sizes?.includes(size)) {
                              setFormData(prev => ({
                                ...prev,
                                sizes: [...(prev.sizes || []), size]
                              }))
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            formData.sizes?.includes(size)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground hover:bg-muted/80'
                          }`}
                          disabled={formData.sizes?.includes(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {formData.sizes && formData.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.sizes.map((size, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                          <span className="text-foreground">{size}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                sizes: prev.sizes?.filter(s => s !== size) || []
                              }))
                            }}
                            className="text-destructive hover:text-destructive/80 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Media and Assets */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Media & Assets</h3>
              
              {/* Current Image */}
              {formData.image && (
                <div className="space-y-2">
                  <Label className="text-foreground">Current Image</Label>
                  <img
                    src={formData.image}
                    alt="Current product image"
                    className="w-32 h-32 object-cover rounded border border-border"
                  />
                </div>
              )}
              
              {/* Existing Gallery Images */}
              {currentProduct?.gallery_images && currentProduct.gallery_images.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-foreground">Current Gallery Images ({currentProduct.gallery_images.filter(imageUrl => !imagesToRemove.includes(imageUrl)).length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {currentProduct.gallery_images.filter(imageUrl => !imagesToRemove.includes(imageUrl)).map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
                          <img
                            src={imageUrl}
                            alt={`Gallery image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=100&width=100"
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setImagesToRemove(prev => [...prev, imageUrl])
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">These images will be preserved when you upload new ones</p>
                </div>
              )}
              
              {/* Product Images */}
              <div className="space-y-2">
                <Label className="text-foreground">Update Product Images</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('edit-image-upload')?.click()}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload New Images
                        </>
                      )}
                    </Button>
                    <input
                      id="edit-image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length > 5) {
                          toast({
                            title: "Error",
                            description: "You can only upload up to 5 images",
                            variant: "destructive",
                          })
                          return
                        }
                        setSelectedImages(files)
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload new images to add to existing gallery
                    </p>
                  </div>
                  {selectedImages.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {selectedImages.length} new image(s) selected to add
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedImages(prev => prev.filter((_, i) => i !== index))
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Current 3D Model */}
              {formData.model_3d_url && !remove3DModel && (
                <div className="space-y-2">
                  <Label className="text-foreground">Current 3D Model</Label>
                  <div className="relative group p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                    <p className="text-sm text-blue-700 dark:text-blue-300">3D Model: {formData.model_3d_url.split('/').pop()}</p>
                    <button
                      type="button"
                      onClick={() => setRemove3DModel(true)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      title="Remove 3D model"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              {/* Removed 3D Model Notice */}
              {remove3DModel && formData.model_3d_url && (
                <div className="space-y-2">
                  <Label className="text-foreground">Current 3D Model</Label>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
                    <p className="text-sm text-red-700 dark:text-red-300">3D Model marked for removal: {formData.model_3d_url.split('/').pop()}</p>
                    <button
                      type="button"
                      onClick={() => setRemove3DModel(false)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline"
                    >
                      Undo removal
                    </button>
                  </div>
                </div>
              )}

              {/* 3D Model Upload */}
              <div className="space-y-2">
                <Label className="text-foreground">Update 3D Model (All Formats Supported)</Label>
                <div className="border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-lg p-6 text-center bg-blue-50 dark:bg-blue-900/10">
                  <div className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 mb-4 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-200 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => document.getElementById('edit-model-upload')?.click()}
                      disabled={uploading3DModel}
                    >
                      {uploading3DModel ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload New 3D Model
                        </>
                      )}
                    </Button>
                    <input
                      id="edit-model-upload"
                      type="file"
                      accept=".obj,.mtl,.zip,.gltf,.glb,.jpg,.jpeg,.png,.bmp,.tga"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files
                        if (files && files.length > 0) {
                          // For multiple files, we'll handle them as an array
                          const fileArray = Array.from(files)
                          setSelected3DModel(fileArray.length === 1 ? fileArray[0] : fileArray)
                        }
                      }}
                    />
                    <div className="text-sm space-y-2">
                      <p className="text-blue-700 dark:text-blue-300 font-medium">
                        {formData.model_3d_url && !remove3DModel 
                          ? "Upload new 3D model to replace current one" 
                          : "Upload 3D model for this product"}
                      </p>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-left">
                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Supported Formats:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="font-medium text-green-600 dark:text-green-400">✓ Web Viewer Ready:</p>
                            <p className="text-gray-600 dark:text-gray-400">GLB, GLTF</p>
                          </div>
                          <div>
                            <p className="font-medium text-blue-600 dark:text-blue-400">✓ Upload Supported:</p>
                            <p className="text-gray-600 dark:text-gray-400">OBJ, MTL, ZIP</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <strong>Tip:</strong> GLB/GLTF files provide the best web viewing experience with interactive 3D controls.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selected3DModel && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        ✓ New model selected:
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {Array.isArray(selected3DModel) ? 
                          selected3DModel.map(f => f.name).join(', ') : 
                          selected3DModel.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Options */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-foreground">Product Options</h4>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_is_new"
                      checked={formData.is_new}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: !!checked }))}
                    />
                    <Label htmlFor="edit_is_new" className="text-foreground">New Product</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_is_sale"
                      checked={formData.is_sale}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_sale: !!checked }))}
                    />
                    <Label htmlFor="edit_is_sale" className="text-foreground">On Sale</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit_is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))}
                    />
                    <Label htmlFor="edit_is_active" className="text-foreground">Active</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_low_stock_threshold" className="text-foreground">Low Stock Threshold</Label>
                  <Input
                    id="edit_low_stock_threshold"
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) || 0 }))}
                    className="bg-background border-border"
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_status" className="text-foreground">Status</Label>
                  <Select
                    value={formData.status || 'Active'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
              }}
              className="bg-secondary hover:bg-secondary/80 border-border text-secondary-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.category || !formData.brand || uploadingImages || uploading3DModel}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {uploadingImages || uploading3DModel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">Archive Product</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to archive "{productToDelete?.name}"? This will move the product to the archive where it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary hover:bg-secondary/80 border-border text-secondary-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {/* Variant Stock Management Dialog */}
      <Dialog open={isVariantStockDialogOpen} onOpenChange={setIsVariantStockDialogOpen}>
        <DialogContent className="bg-background border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Manage Size Stock</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update stock quantities for each size of {variantStockProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {variantStockProduct?.colors && variantStockProduct.colors.length > 0 ? (
              variantStockProduct.colors.map((color) => (
                <Collapsible key={color} open={!collapsedColorways.has(color)} onOpenChange={() => toggleColorwayCollapse(color)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
                    >
                      <h4 className="text-lg font-semibold text-foreground capitalize">{color}</h4>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          collapsedColorways.has(color) ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {variantStockProduct.sizes?.map((size) => {
                      const currentStock = variantStockData[color]?.[size] || 0
                      return (
                        <div key={`${color}-${size}`} className="space-y-2">
                          <Label className="text-foreground">Size {size}</Label>
                          <Input
                            type="number"
                            min="0"
                            value={currentStock}
                            onChange={(e) => {
                              const newStock = parseInt(e.target.value) || 0
                              setVariantStockData(prev => ({
                                ...prev,
                                [color]: {
                                  ...prev[color],
                                  [size]: newStock
                                }
                              }))
                            }}
                            className="bg-background border-border"
                            placeholder="0"
                          />
                          <div className="text-xs text-muted-foreground">
                            Current: {variantStockProduct.variants?.[color]?.[size] || 0}
                          </div>
                        </div>
                      )
                    })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  No colors or sizes defined for this product.
                </div>
                <div className="text-sm text-muted-foreground/70">
                  Please edit the product to add colors and sizes first.
                </div>
              </div>
            )}
            
            {variantStockProduct?.colors && variantStockProduct.colors.length > 0 && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="text-foreground font-semibold mb-2">Total Stock Summary</h4>
                <div className="text-muted-foreground">
                  Total Units: {Object.values(variantStockData).reduce((total, colorStocks) => 
                    total + Object.values(colorStocks).reduce((sum, qty) => sum + qty, 0), 0
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVariantStockDialogOpen(false)}
              className="bg-secondary hover:bg-secondary/80 border-border text-secondary-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVariantStockSave}
              disabled={updatingVariantStock}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {updatingVariantStock ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Stock Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
