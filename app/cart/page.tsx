"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Smartphone, User, CheckCircle, Receipt, Upload, X, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LocationSelector } from "@/components/ui/location-selector"
import { getRecommendedBagSize, getAllBagSpecifications, getBagSpecificationBySize } from "@/lib/bag-specifications"
import Image from "next/image"
import Link from "next/link"
import { fetchProductByIdFromAPI } from "@/lib/product-data"

export default function CartPage() {
  const { state: { items = [] } = {}, updateQuantity, removeItem: removeFromCart, clearCart } = useCart()
  const { user, tokenReady } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  

  const [isProcessing, setIsProcessing] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [qrPaymentMethod, setQrPaymentMethod] = useState("")
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<any>(null)

  const [shippingInfo, setShippingInfo] = useState<{
    fullName: string
    phone: string
    street: string
    city: string
    province: string
    zipCode: string
    country: string
  }>({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    zipCode: "",
    country: "",
  })

  const [customerEmail, setCustomerEmail] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  // Add payment reference state
  const [paymentReference, setPaymentReference] = useState<string>("")
  const [paymentReferenceError, setPaymentReferenceError] = useState<string>("")
  const [selectedBagSize, setSelectedBagSize] = useState<'Small' | 'Medium' | 'Large'>('Small')
  const [shippingLocation, setShippingLocation] = useState<'Luzon' | 'Visayas/Mindanao'>('Luzon')
  const [calculatedShipping, setCalculatedShipping] = useState(0)

  // Selection state for cart items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const getItemKey = (item: any) => `${item.id}-${item.size ?? ''}`
  const allSelected = items.length > 0 && items.every((it) => selectedItems.has(getItemKey(it)))
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(getItemKey)))
    }
  }
  const toggleItemSelection = (item: any, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      const key = getItemKey(item)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const removeSelectedItems = () => {
    const toRemove = items.filter((it) => selectedItems.has(getItemKey(it)))
    if (toRemove.length === 0) return
    for (const it of toRemove) {
      removeFromCart(it.id, it.size)
    }
    setSelectedItems(new Set())
    toast({
      title: allSelected ? "All items deleted" : "Selected items deleted",
      description: `${toRemove.length} item${toRemove.length > 1 ? 's' : ''} removed from cart.`,
    })
  }

  // Keep selection in sync when cart items change
  useEffect(() => {
    setSelectedItems((prev) => {
      const next = new Set<string>()
      for (const it of items) {
        const key = getItemKey(it)
        if (prev.has(key)) next.add(key)
      }
      return next
    })
  }, [items])

  // Helper function to determine shipping region based on province
  const getShippingRegionByProvince = (province: string): 'Luzon' | 'Visayas/Mindanao' => {
    // Luzon provinces
    const luzonProvinces = [
      'Metro Manila', 'Abra', 'Apayao', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province',
      'Ilocos Norte', 'Ilocos Sur', 'La Union', 'Pangasinan', 'Batanes', 'Cagayan', 'Isabela',
      'Nueva Vizcaya', 'Quirino', 'Aurora', 'Bataan', 'Bulacan', 'Nueva Ecija', 'Pampanga',
      'Tarlac', 'Zambales', 'Batangas', 'Cavite', 'Laguna', 'Quezon', 'Rizal', 'Marinduque',
      'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Romblon', 'Albay', 'Camarines Norte',
      'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'
    ]
    
    return luzonProvinces.includes(province) ? 'Luzon' : 'Visayas/Mindanao'
  }

  // Auto-adjust bag size based on total quantity
  useEffect(() => {
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    
    // Auto-select appropriate bag size based on quantity
    if (totalQuantity <= 3) {
      setSelectedBagSize('Small')
    } else if (totalQuantity <= 6) {
      setSelectedBagSize('Medium')
    } else if (totalQuantity <= 10) {
      setSelectedBagSize('Large')
    }
    // For quantities > 10, keep current selection but disable checkout
  }, [items])

  // Calculate shipping whenever bag size or location changes
  useEffect(() => {
    let shipping = 0
    if (selectedBagSize === 'Small') {
      shipping = 70
    } else if (selectedBagSize === 'Medium') {
      shipping = 160
    } else if (selectedBagSize === 'Large') {
      shipping = 190
    }
    
    // Add ₱25 surcharge for Visayas/Mindanao
    if (shippingLocation === 'Visayas/Mindanao') {
      shipping += 25
    }
    
    setCalculatedShipping(shipping)
  }, [selectedBagSize, shippingLocation])

  useEffect(() => {
    async function loadUserProfileAndAddress() {
      if (!user || !tokenReady) return

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        // Set customer email from user data
        if (user.email) {
          setCustomerEmail(user.email)
        }

        // Load profile data
        const profileResponse = await fetch('/api/profiles', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        let profileData = null
        if (profileResponse.ok) {
          profileData = await profileResponse.json()
        } else {
          console.error("Error loading user profile:", await profileResponse.text())
        }

        // Load address data
        const addressResponse = await fetch('/api/addresses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        let addressData = null
        if (addressResponse.ok) {
          const addresses = await addressResponse.json()
          console.log('🏠 CART: Received addresses:', addresses)
          addressData = addresses.find((addr: any) => addr.is_default)
          console.log('🏠 CART: Default address found:', addressData)
        } else {
          console.error("Error loading address:", await addressResponse.text())
        }

        console.log('👤 CART: Profile data:', profileData)
        console.log('🏠 CART: Address data:', addressData)

        const newShippingInfo = {
          fullName: profileData ? `${profileData.first_name} ${profileData.last_name}`.trim() : "",
          phone: profileData?.phone || "",
          street: addressData?.address_line_1 || "",
          city: addressData?.city || "",
          province: addressData?.state || "",
          zipCode: addressData?.postal_code || "",
          country: addressData?.country || "",
        }
        
        console.log('📋 CART: Setting shipping info:', newShippingInfo)
        setShippingInfo(newShippingInfo)
        
        // Set shipping region from saved address if available
        if (addressData?.shipping_region) {
          console.log('🌍 CART: Setting shipping region from address:', addressData.shipping_region)
          setShippingLocation(addressData.shipping_region as 'Luzon' | 'Visayas/Mindanao')
        } else if (addressData?.state) {
          // Fallback: auto-detect from province if shipping_region not available
          const region = getShippingRegionByProvince(addressData.state)
          console.log('🌍 CART: Auto-detecting shipping region from province:', addressData.state, '->', region)
          setShippingLocation(region)
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }
    loadUserProfileAndAddress()
  }, [user, tokenReady])

  const handleQuantityChange = async (id: string, size: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id, size)
    } else {
      // Find the item in the cart to get color context
      const item = items.find((i) => i.id === id && i.size === size)
  
      let availableStock = Number.MAX_SAFE_INTEGER
      try {
        const product = await fetchProductByIdFromAPI(Number(id))
        const colorKey = item?.color || ""
        if (product && product.variants && colorKey && product.variants[colorKey] !== undefined && product.variants[colorKey][size] !== undefined) {
          availableStock = Number(product.variants[colorKey][size]) || 0
        } else if (product && (product as any).stock_quantity !== undefined) {
          availableStock = Number((product as any).stock_quantity) || 0
        } else {
          // Fallback to current item quantity if stock unknown
          availableStock = item?.quantity || 0
        }
      } catch (e) {
        // If stock lookup fails, be conservative and keep current quantity
        availableStock = item?.quantity || 0
      }
  
      if (newQuantity > availableStock) {
        // Clamp to available stock and notify user
        updateQuantity(id, size, availableStock)
        toast({
          title: "Insufficient Stock",
          description: `Only ${availableStock} items available for this selection.`,
          variant: "destructive",
        })
        return
      }
  
      updateQuantity(id, size, newQuantity)
    }
  }

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method)
    if (method === "GCash" || method === "Maya") {
      setQrPaymentMethod(method.toLowerCase())
      setShowQRDialog(true)
    }
    // Reset screenshot when changing payment method
    setPaymentScreenshot(null)
    setScreenshotPreview(null)
    // Reset payment reference when changing method
    setPaymentReference("")
    setPaymentReferenceError("")
  }

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file.",
          variant: "destructive"
        })
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 10MB.",
          variant: "destructive"
        })
        return
      }
      
      try {
        // Upload file to server
        const formData = new FormData()
        formData.append('file', file)
        
        const uploadResponse = await fetch('/api/upload-payment-screenshot', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Failed to upload screenshot')
        }
        
        const { url } = await uploadResponse.json()
        
        // Store the uploaded file URL instead of the file object
        setPaymentScreenshot(url)
        setScreenshotPreview(url)
        
        toast({
          title: "Screenshot Uploaded",
          description: "Payment screenshot uploaded successfully.",
        })
        
      } catch (error) {
        console.error('Screenshot upload error:', error)
        toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to upload screenshot.",
          variant: "destructive"
        })
      }
    }
  }

  // Handle payment reference input change
  const handlePaymentReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value || ""
    if (paymentMethod === "GCash") {
      value = value.replace(/\D/g, "").slice(0, 13)
      setPaymentReference(value)
      setPaymentReferenceError(value.length === 13 ? "" : "GCash reference must be 13 digits")
    } else if (paymentMethod === "Maya") {
      value = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)
      setPaymentReference(value)
      setPaymentReferenceError(value.length === 12 ? "" : "Maya reference must be 12 alphanumeric characters")
    } else {
      setPaymentReference(value)
      setPaymentReferenceError("")
    }
  }

  const handleCheckout = async () => {
    if (!customerEmail || !customerEmail.includes("@")) {
      toast({
        title: "Email Required",
        description: "Please provide a valid email address for order confirmation.",
        variant: "destructive",
      })
      return
    }
    if (
      !shippingInfo.fullName ||
      !shippingInfo.street ||
      !shippingInfo.city ||
      !shippingInfo.province ||
      !shippingInfo.zipCode ||
      !shippingInfo.phone
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all shipping information.",
        variant: "destructive",
      })
      return
    }
    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method.",
        variant: "destructive",
      })
      return
    }

    // Validate screenshot and reference for digital payment methods
    if (paymentMethod === "GCash" || paymentMethod === "Maya") {
      if (!paymentScreenshot) {
        toast({
          title: "Screenshot Required",
          description: `Please upload a ${paymentMethod} payment screenshot.`,
          variant: "destructive",
        })
        return
      }
      if (!paymentReference) {
        toast({
          title: "Reference Required",
          description: paymentMethod === "GCash" ? "Enter the 13-digit GCash reference number." : "Enter the 12-character Maya reference ID.",
          variant: "destructive",
        })
        return
      }
      const isValid = paymentMethod === "GCash"
        ? /^\d{13}$/.test(paymentReference)
        : /^[A-Za-z0-9]{12}$/.test(paymentReference)

      if (!isValid) {
        toast({
          title: "Invalid Reference",
          description: paymentMethod === "GCash" ? "Reference must be 13 digits." : "Reference must be 12 alphanumeric characters.",
          variant: "destructive",
        })
        return
      }
    }

    // Validate terms and conditions acceptance
    if (!termsAccepted) {
      toast({
        title: "Terms and Conditions Required",
        description: "Please accept the terms and conditions to proceed with your order.",
        variant: "destructive"
      })
      return
    }

    // Check authentication before proceeding
    const token = localStorage.getItem('auth_token')
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete your order. Redirecting to login...",
        variant: "destructive",
      })
      router.push('/auth/signin')
      return
    }

    // Verify token is still valid before checkout
    if (!user || !tokenReady) {
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive",
      })
      router.push('/auth/signin')
      return
    }

    setIsProcessing(true)

    try {
      
      if (user && token) {
        const [firstName, ...lastNameParts] = shippingInfo.fullName.split(" ")
        const lastName = lastNameParts.join(" ")

        // Update profile
        const profileResponse = await fetch('/api/profiles', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            first_name: firstName || null,
            last_name: lastName || null,
            phone: shippingInfo.phone,
          })
        })

        if (!profileResponse.ok) {
          throw new Error('Failed to update profile')
        }

        // Get existing addresses
        const addressesResponse = await fetch('/api/addresses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        let existingAddress = null
        if (addressesResponse.ok) {
          const addresses = await addressesResponse.json()
          existingAddress = addresses.find((addr: any) => addr.is_default)
        }

        if (existingAddress) {
           // Update existing address
           const updateAddressResponse = await fetch('/api/addresses', {
             method: 'PUT',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify({
               id: existingAddress.id,
               address_line_1: shippingInfo.street,
               city: shippingInfo.city,
               state: shippingInfo.province,
               postal_code: shippingInfo.zipCode,
               country: shippingInfo.country,
               first_name: firstName || 'Customer',
               last_name: lastName || 'Name',
               phone: shippingInfo.phone,
               shipping_region: shippingLocation,
             })
           })

           if (!updateAddressResponse.ok) {
             throw new Error('Failed to update address')
           }
        } else {
          // Create new address
          const createAddressResponse = await fetch('/api/addresses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              address_line_1: shippingInfo.street,
              city: shippingInfo.city,
              state: shippingInfo.province,
              postal_code: shippingInfo.zipCode,
              country: shippingInfo.country,
              first_name: firstName || 'Customer',
              last_name: lastName || 'Name',
              phone: shippingInfo.phone,
              is_default: true,
              shipping_region: shippingLocation,
            })
          })

          if (!createAddressResponse.ok) {
            throw new Error('Failed to create address')
          }
        }
      }

      // Calculate totals using selected items if any
      const effectiveItems = selectedItems.size > 0 ? items.filter(it => selectedItems.has(getItemKey(it))) : items
      const subtotal = effectiveItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
      const vat = subtotal * 0.12 // 12% VAT in Philippines
      
      // Use calculated shipping from state
      const shipping = calculatedShipping
      
      const total = subtotal + vat + shipping

      // Calculate total quantity of effective items
      const totalQuantity = effectiveItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

      // Calculate recommended bag size
      const recommendedBag = getRecommendedBagSize(effectiveItems.length)

      // Use payment screenshot URL directly
      const paymentScreenshotData = paymentScreenshot || null

      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          items: effectiveItems.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            color: item.color,
            size: item.size,
            image_url: item.image,
          })),
          total: total,
          customer_email: customerEmail,
          shipping_address: shippingInfo,
          payment_method: paymentMethod,
          payment_screenshot: paymentScreenshotData,
          payment_reference: paymentReference || null,
          status: "pending",
        })
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ error: 'Unknown error' }))
        
        // Handle specific error cases
        if (orderResponse.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please sign in again.",
            variant: "destructive",
          })
          router.push('/auth/signin')
          return
        }
        
        if (errorData.error === 'Insufficient stock') {
          throw new Error(errorData.message || 'Some items are out of stock')
        }
        
        // Log detailed error for debugging
        console.error('Order creation failed:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          error: errorData
        })
        
        throw new Error(errorData.message || `Failed to create order (${orderResponse.status})`)
      }

      const orderData = await orderResponse.json()

      setCompletedOrder(orderData)
      setShowOrderSuccess(true)
      setShowCheckout(false)

      await clearCart()

      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been confirmed and will be processed shortly.",
      })
    } catch (error: any) {
      console.error("Checkout error:", error.message || error)
      toast({
        title: "Order Failed",
        description: error.message || "There was an error processing your order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOrderSuccessClose = () => {
    setShowOrderSuccess(false)
    if (user) {
      try {
        router.push("/orders")
      } catch (error) {
        console.warn('Navigation error:', error)
        window.location.href = "/orders"
      }
    } else {
      try {
        router.push("/")
      } catch (error) {
        console.warn('Navigation error:', error)
        window.location.href = "/"
      }
    }
  }

  // Calculate totals for display using selected items if any
  const displayItems = selectedItems.size > 0 ? items.filter(it => selectedItems.has(getItemKey(it))) : items
  const subtotal = displayItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
  const vat = subtotal * 0.12 // 12% VAT in Philippines
  
  // Use calculated shipping from state
  const shipping = calculatedShipping
  
  const total = subtotal + vat + shipping

  // Calculate total quantity of items for display
  const totalQuantity = displayItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

  // Calculate recommended bag size for display
  const recommendedBag = getRecommendedBagSize(displayItems.length)

  if (items.length === 0 && !showOrderSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col transition-colors">
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="bg-card border-border">
            <CardContent className="text-center py-8 sm:py-12">
              <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-yellow-400 mb-2">
                Your cart is empty
              </h3>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
                Add some products to get started.
              </p>
              <Button
                onClick={() => {
                  try {
                    router.push("/")
                  } catch (error) {
                    console.warn('Navigation error:', error)
                    window.location.href = "/"
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
              >
                Continue Shopping
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
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 -ml-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-yellow-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-yellow-400">Shopping Cart</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            {items.length} {items.length === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {allSelected ? "Unselect All" : "Select All"}
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Array.from(selectedItems).length} selected
                </span>
                {selectedItems.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={removeSelectedItems}
                    className="bg-red-600 text-white rounded-full px-3 h-8 shadow-sm hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {allSelected ? "Delete All" : "Delete Selected"}
                  </Button>
                )}
              </div>
            </div>
            {items.map((item, index) => (
              <Card key={`${item.id}-${item.size}-${index}`} className="bg-card border-border">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedItems.has(getItemKey(item))}
                        onCheckedChange={(checked) => toggleItemSelection(item, !!checked)}
                        aria-label="Select item"
                      />
                      <Link href={`/product/${item.id}`} className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="object-cover rounded-lg"
                        />
                      </Link>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        <Link href={`/product/${item.id}`} className="hover:underline">
                          {item.name}
                        </Link>
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{item.brand}</p>
                      {(item.color || item.size) && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.color && `${item.color}`}
                          {item.color && item.size && " • "}
                          {item.size && `Size ${item.size}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-yellow-400">
                          ₱{(item.price || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.size, item.quantity - 1)}
                          className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-yellow-400"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.size, item.quantity + 1)}
                          className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-yellow-400"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id, item.size)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary & Checkout */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-yellow-400">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">VAT (12%):</span>
                  <span className="text-gray-900 dark:text-white">₱{vat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600 dark:text-gray-400">Shipping (J&T):</span>
                  <span className="text-gray-900 dark:text-white">
                    ₱{shipping.toLocaleString()}
                  </span>
                </div>
                
                {/* Bag Specifications */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bag Specifications</span>
                  </div>
                  
                  <div className="mb-3">
                    <Select value={selectedBagSize} onValueChange={(value: 'Small' | 'Medium' | 'Large') => setSelectedBagSize(value)}>
                      <SelectTrigger className="w-full h-10 bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500">
                        <SelectValue placeholder="Select bag size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Small" disabled={totalQuantity > 3}>
                          Small (1-3 items) {totalQuantity > 3 && "(Unavailable)"}
                        </SelectItem>
                        <SelectItem value="Medium" disabled={totalQuantity > 6}>
                          Medium (4-6 items) {totalQuantity > 6 && "(Unavailable)"}
                        </SelectItem>
                        <SelectItem value="Large" disabled={totalQuantity > 10}>
                          Large (7-10 items) {totalQuantity > 10 && "(Unavailable)"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(() => {
                    const selectedBag = getBagSpecificationBySize(selectedBagSize);
                    return (
                      <>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {selectedBag?.description || "No description available."}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          Max weight: {selectedBag?.maxWeight}kg |
                          Dimensions: {selectedBag?.dimensions?.length}×{selectedBag?.dimensions?.width}×{selectedBag?.dimensions?.height}cm
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Customer Service Message for quantities over 10 */}
                {totalQuantity > 10 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">Contact Customer Service</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Your order has {totalQuantity} items. Please contact customer service for orders with more than 10 items.
                    </p>
                  </div>
                )}
                
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                <div className="flex justify-between font-semibold text-base sm:text-lg">
                  <span className="text-gray-900 dark:text-yellow-400">Total:</span>
                  <span className="text-gray-900 dark:text-yellow-400">₱{total.toLocaleString()}</span>
                </div>
                <Button
                  onClick={() => setShowCheckout(!showCheckout)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                  disabled={totalQuantity > 10}
                >
                  {showCheckout ? "Hide Checkout" : "Proceed to Checkout"}
                </Button>
              </CardContent>
            </Card>

            {/* Auth Status */}
            {!user && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">Guest Checkout</span>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-1">
                    You can checkout as a guest or{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-700 dark:text-blue-400 underline text-xs sm:text-sm"
                      onClick={() => {
                        try {
                          router.push("/auth")
                        } catch (error) {
                          console.warn('Navigation error:', error)
                          window.location.href = "/auth"
                        }
                      }}
                    >
                      sign in
                    </Button>{" "}
                    to track your orders.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Checkout Form */}
            {showCheckout && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-yellow-400">
                    Checkout Information
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Please fill in your contact and shipping details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm text-gray-700 dark:text-gray-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Order confirmation will be sent to this email
                    </p>
                  </div>

                  <Separator className="bg-gray-200 dark:bg-gray-700" />

                  {/* Terms and Conditions */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <Label
                          htmlFor="terms"
                          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-relaxed"
                        >
                          I agree to the{" "}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            Privacy Policy
                          </a>
                        </Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          By checking this box, you acknowledge that you have read and agree to our terms and conditions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-200 dark:bg-gray-700" />

                  <div className="space-y-4">
                    <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-yellow-400">
                      Shipping Address
                    </h3>
                    <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                      <Info className="h-4 w-4" />
                      <AlertTitle className="text-yellow-800 dark:text-yellow-300">Heads up</AlertTitle>
                      <AlertDescription className="text-yellow-700 dark:text-yellow-200">
                        These fields are read-only during place order. To edit your information, go to your <a href="/profile" className="underline text-blue-600 dark:text-blue-400">Profile</a> page.
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName" className="text-sm text-gray-700 dark:text-gray-300">
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          value={shippingInfo.fullName}
                          readOnly
                          className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-sm text-gray-700 dark:text-gray-300">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          value={shippingInfo.phone}
                          readOnly
                          className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="street" className="text-sm text-gray-700 dark:text-gray-300">
                        Street Address
                      </Label>
                      <Input
                        id="street"
                        value={shippingInfo.street}
                        readOnly
                        className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                    <LocationSelector
                      selectedProvince={shippingInfo.province}
                      selectedCity={shippingInfo.city}
                      onProvinceChange={(province) => {
                        setShippingInfo({ ...shippingInfo, province })
                        // Automatically update shipping region based on province
                        const region = getShippingRegionByProvince(province)
                        setShippingLocation(region)
                      }}
                      onCityChange={(city) => setShippingInfo({ ...shippingInfo, city })}
                      disabled={true}
                    />
                    <div>
                      <Label htmlFor="shippingRegion" className="text-sm text-gray-700 dark:text-gray-300">
                        Shipping Region
                      </Label>
                      <Input
                        id="shippingRegion"
                        value={shippingLocation}
                        readOnly
                        className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-sm text-gray-700 dark:text-gray-300">
                        ZIP Code
                      </Label>
                      <Input
                        id="zipCode"
                        value={shippingInfo.zipCode}
                        readOnly
                        className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-sm text-gray-700 dark:text-gray-300">
                        Country
                      </Label>
                      <Input
                        id="country"
                        value="Philippines"
                        readOnly
                        className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <Separator className="bg-gray-200 dark:bg-gray-700" />

                  <div className="space-y-4">
                    <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-yellow-400">
                      Payment Method
                    </h3>
                    <Select value={paymentMethod} onValueChange={handlePaymentMethodSelect}>
                      <SelectTrigger className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectItem
                          value="GCash"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            GCash
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="Maya"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Maya (PayMaya)
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="Cash on Delivery"
                          className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cash on Delivery
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Payment Screenshot Upload for Digital Payments */}
                    {(paymentMethod === "GCash" || paymentMethod === "Maya") && (
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-700 dark:text-gray-300">
                          Payment Screenshot *
                        </Label>
                        <div className="relative">
                          <input
                            id="paymentScreenshot"
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="paymentScreenshot"
                            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center pt-3 pb-4 lg:pt-5 lg:pb-6">
                              <Upload className="w-6 h-6 lg:w-8 lg:h-8 mb-1 lg:mb-2 text-gray-300" />
                              <p className="mb-1 lg:mb-2 text-xs lg:text-sm text-gray-300">
                                <span className="font-semibold">Click to upload</span> screenshot
                              </p>
                            </div>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Please upload a screenshot of your {paymentMethod} payment confirmation
                        </p>
                        {screenshotPreview && (
                          <div className="mt-2">
                            <img
                              src={screenshotPreview}
                              alt="Payment screenshot preview"
                              className="max-w-full h-32 object-contain border border-gray-200 dark:border-gray-600 rounded"
                            />
                          </div>
                        )}
                        {/* Payment Reference Input */}
                        <div className="space-y-2 mt-3">
                          <Label className="text-sm text-gray-700 dark:text-gray-300">
                            {paymentMethod === "GCash" ? "Reference No. (13 digits) *" : "Reference ID (12 alphanumeric) *"}
                          </Label>
                          <Input
                            id="paymentReference"
                            value={paymentReference}
                            onChange={handlePaymentReferenceChange}
                            placeholder={paymentMethod === "GCash" ? "Enter 13-digit reference number" : "Enter 12-character reference ID"}
                            className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                          />
                          {paymentReferenceError && (
                            <p className="text-xs text-red-600 dark:text-red-400">{paymentReferenceError}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white"
                    size="lg"
                  >
                    {isProcessing ? "Processing..." : `Place Order - ₱${(total || 0).toLocaleString()}`}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="sm:max-w-4xl bg-gradient-to-br from-blue-900 to-blue-800 border-0 text-white p-0 [&>button]:hidden max-h-[90vh] overflow-y-auto">
            {/* Visually hidden title for accessibility */}
            <DialogTitle className="sr-only">
              {qrPaymentMethod === "gcash" ? "GCash Payment" : "PayMaya Payment"} Dialog
            </DialogTitle>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-blue-700">
              <div className="text-center flex-1">
                <h2 className="text-xl font-bold text-yellow-400 mb-2">
                  {qrPaymentMethod === "gcash" ? "GCash Payment" : "PayMaya Payment"}
                </h2>
                <p className="text-lg font-semibold">Total Amount: ₱{(total || 0).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setShowQRDialog(false)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex flex-col lg:flex-row">
              {/* Left Column - QR Code */}
              <div className="flex-1 p-3 lg:p-6 flex flex-col items-center justify-center bg-transparent text-white">
                <div className="mb-4 w-full max-w-[280px] sm:max-w-[350px] lg:max-w-[600px] aspect-square flex items-center justify-center">
                  {qrPaymentMethod === "gcash" ? (
                    <Image
                      src="/images/cashg.png"
                      alt="GCash QR Code"
                      width={600}
                      height={600}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <Image
                      src="/images/ayam.png"
                      alt="PayMaya QR Code"
                      width={600}
                      height={600}
                      className="object-contain w-full h-full"
                    />
                  )}
                </div>
              </div>

              {/* Right Column - Instructions and Upload */}
              <div className="flex-1 p-3 lg:p-6 space-y-4 lg:space-y-6">
                {/* Payment Instructions */}
                <div className="bg-blue-800 rounded-lg p-4 lg:p-8 border-2 border-blue-600 min-h-[150px] lg:min-h-[200px]">
                  <div className="flex items-center mb-3 lg:mb-4">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 rounded mr-3 lg:mr-4 flex items-center justify-center">
                      <span className="text-xs lg:text-sm font-bold">📋</span>
                    </div>
                    <h3 className="font-semibold text-white text-base lg:text-lg">Payment Instructions</h3>
                  </div>
                  <ol className="space-y-2 lg:space-y-3 text-sm lg:text-base text-gray-200">
                    <li>1. Open your {qrPaymentMethod === "gcash" ? "GCash" : "PayMaya"} app</li>
                    <li>2. Scan the QR code or enter ₱{(total || 0).toLocaleString()} manually</li>
                    <li>3. Complete the payment transaction</li>
                    <li>4. Take a screenshot of the successful payment confirmation</li>
                    <li>5. Upload the screenshot in the section below</li>
                  </ol>
                </div>

                {/* Upload Section */}
                <div className="bg-gray-800 rounded-lg p-3 lg:p-4">
                  <div className="flex items-center mb-2 lg:mb-3">
                    <Upload className="w-4 h-4 lg:w-5 lg:h-5 mr-2 text-white" />
                    <h3 className="font-semibold text-white text-sm lg:text-base">Upload Payment Screenshot *</h3>
                  </div>
                  <div className="relative">
                    <input
                      id="qrPaymentScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="qrPaymentScreenshot"
                      className="flex flex-col items-center justify-center w-full h-24 lg:h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-3 pb-4 lg:pt-5 lg:pb-6">
                        <Upload className="w-6 h-6 lg:w-8 lg:h-8 mb-1 lg:mb-2 text-gray-300" />
                        <p className="mb-1 lg:mb-2 text-xs lg:text-sm text-gray-300">
                          <span className="font-semibold">Click to upload</span> your payment screenshot
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG or JPEG (MAX. 10MB)</p>
                      </div>
                    </label>
                  </div>
                  {screenshotPreview && (
                    <div className="mt-3">
                      <img
                        src={screenshotPreview}
                        alt="Payment screenshot preview"
                        className="max-w-full h-32 object-contain border border-gray-600 rounded mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* Payment Reference Input */}
                {(qrPaymentMethod === "gcash" || qrPaymentMethod === "maya") && (
                  <div className="bg-gray-800 rounded-lg p-3 lg:p-4">
                    <div className="flex items-center mb-2 lg:mb-3">
                      <span className="w-5 h-5 mr-2 text-white">#</span>
                      <h3 className="font-semibold text-white text-sm lg:text-base">
                        {qrPaymentMethod === "gcash" ? "Reference No. (13 digits) *" : "Reference ID (12 alphanumeric) *"}
                      </h3>
                    </div>
                    <Input
                      id="qrPaymentReference"
                      value={paymentReference}
                      onChange={handlePaymentReferenceChange}
                      placeholder={qrPaymentMethod === "gcash" ? "Enter 13-digit reference number" : "Enter 12-character reference ID"}
                      className="h-10 bg-white/90 text-black"
                    />
                    {paymentReferenceError && (
                      <p className="text-xs text-red-400 mt-1">{paymentReferenceError}</p>
                    )}
                  </div>
                )}

                {/* Confirm Button */}
                <Button 
                  onClick={() => {
                    if (!paymentScreenshot) {
                      toast({
                        title: "Screenshot Required",
                        description: "Please upload a payment screenshot before continuing.",
                        variant: "destructive"
                      })
                      return
                    }
                    setShowQRDialog(false)
                  }} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg" 
                  disabled={!paymentScreenshot}
                >
                  <span className="mr-2">✓</span>
                  Confirm Payment Completed
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Order Success Dialog */}
        <Dialog open={showOrderSuccess} onOpenChange={setShowOrderSuccess}>
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2 text-base sm:text-lg text-gray-900 dark:text-yellow-400">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                Order Placed Successfully!
              </DialogTitle>
            </DialogHeader>
            {completedOrder && (
              <div className="space-y-4 p-4 sm:p-6">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-yellow-400">
                    Thank you for your order!
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 px-2">
                    Your order has been confirmed and will be processed shortly.
                  </p>
                </div>

                <Card className="bg-muted border-border">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Order ID:</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {completedOrder.id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
                        <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                          ₱{(completedOrder?.total_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Payment Method:</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {completedOrder.payment_method}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Email:</span>
                        <span className="text-xs sm:text-sm font-medium truncate ml-2 text-gray-900 dark:text-white">
                          {completedOrder.customer_email}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-yellow-400">Order Items:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {completedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs sm:text-sm">
                        <span className="truncate mr-2 text-gray-600 dark:text-gray-400">
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="flex-shrink-0 text-gray-900 dark:text-white">
                          ₱{((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <p>Order confirmation has been sent to {completedOrder.customer_email}</p>
                  {user && <p className="mt-1">You can track your order in your account.</p>}
                </div>

                <Button
                  onClick={handleOrderSuccessClose}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {user ? "View My Orders" : "Continue Shopping"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
