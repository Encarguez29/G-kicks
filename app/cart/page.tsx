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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Smartphone, User, CheckCircle, Receipt, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

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

  const [customerEmail, setCustomerEmail] = useState(user?.email || "")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    async function loadUserProfileAndAddress() {
      if (!user || !tokenReady) return

      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

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
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }
    loadUserProfileAndAddress()
  }, [user, tokenReady])

  const handleQuantityChange = (id: string, size: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id, size)
    } else {
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

    // Validate screenshot for digital payment methods
    if ((paymentMethod === "GCash" || paymentMethod === "Maya") && !paymentScreenshot) {
      toast({
        title: "Payment Screenshot Required",
        description: `Please upload a screenshot of your ${paymentMethod} payment.`,
        variant: "destructive"
      })
      return
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

    setIsProcessing(true)

    try {
      const token = localStorage.getItem('auth_token')
      
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
            })
          })

          if (!createAddressResponse.ok) {
            throw new Error('Failed to create address')
          }
        }
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
      const vat = subtotal * 0.12 // 12% VAT in Philippines
      const shipping = subtotal > 2000 ? 0 : 150 // Free shipping over ₱2000
      const total = subtotal + vat + shipping

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
          items: items.map(item => ({
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
          status: "pending",
        })
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        if (errorData.error === 'Insufficient stock') {
          throw new Error(errorData.message || 'Some items are out of stock')
        }
        throw new Error(errorData.message || 'Failed to create order')
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

  // Calculate totals for display
  const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
  const vat = subtotal * 0.12 // 12% VAT in Philippines
  const shipping = subtotal > 2000 ? 0 : 150 // Free shipping over ₱2000
  const total = subtotal + vat + shipping

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
            {items.map((item, index) => (
              <Card key={`${item.id}-${item.size}-${index}`} className="bg-card border-border">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        {item.name}
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
                  <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                  <span className="text-gray-900 dark:text-white">
                    {shipping === 0 ? "Free" : `₱${shipping.toLocaleString()}`}
                  </span>
                </div>
                {shipping === 0 && (
                  <div className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                    🎉 You qualify for free shipping!
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fullName" className="text-sm text-gray-700 dark:text-gray-300">
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          value={shippingInfo.fullName}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                          placeholder="Enter your full name"
                          required
                          className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-sm text-gray-700 dark:text-gray-300">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          value={shippingInfo.phone}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                          placeholder="Enter your phone number"
                          required
                          className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
                        onChange={(e) => setShippingInfo({ ...shippingInfo, street: e.target.value })}
                        placeholder="Enter your street address"
                        required
                        className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city" className="text-sm text-gray-700 dark:text-gray-300">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={shippingInfo.city}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                          placeholder="Enter your city"
                          required
                          className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="province" className="text-sm text-gray-700 dark:text-gray-300">
                          Province
                        </Label>
                        <Input
                          id="province"
                          value={shippingInfo.province}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, province: e.target.value })}
                          placeholder="Enter your province"
                          required
                          className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="zipCode" className="text-sm text-gray-700 dark:text-gray-300">
                        ZIP Code
                      </Label>
                      <Input
                        id="zipCode"
                        value={shippingInfo.zipCode}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                        placeholder="Enter your ZIP code"
                        required
                        className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country" className="text-sm text-gray-700 dark:text-gray-300">
                        Country
                      </Label>
                      <Input
                        id="country"
                        value={shippingInfo.country}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                        placeholder="Enter your country"
                        required
                        className="h-10 sm:h-12 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
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
                            <div className="flex flex-col items-center justify-center py-2">
                              <Upload className="w-6 h-6 mb-1 text-gray-500 dark:text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
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
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-center text-base sm:text-lg text-gray-900 dark:text-yellow-400">
                {qrPaymentMethod === "gcash" ? "GCash Payment" : "PayMaya Payment"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 p-4 sm:p-6">
              <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center">
                {qrPaymentMethod === "gcash" ? (
                  <Image
                    src="/images/gcash-logo.png"
                    alt="GCash QR Code"
                    width={200}
                    height={200}
                    className="object-contain"
                  />
                ) : (
                  <Image
                    src="/images/maya-logo.png"
                    alt="PayMaya QR Code"
                    width={200}
                    height={200}
                    className="object-contain"
                  />
                )}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-yellow-400">₱{(total || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 px-4">
                  Scan this QR code with your {qrPaymentMethod === "gcash" ? "GCash" : "PayMaya"} app
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Upload payment screenshot after completing the payment
                </p>
              </div>
              
              {/* Screenshot Upload in QR Dialog */}
              <div className="w-full space-y-2">
                <Label className="text-sm text-gray-700 dark:text-gray-300">
                  Payment Screenshot *
                </Label>
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
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> payment screenshot
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or JPEG (MAX. 10MB)</p>
                    </div>
                  </label>
                </div>
                {screenshotPreview && (
                  <div className="mt-2">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot preview"
                      className="max-w-full h-32 object-contain border border-gray-200 dark:border-gray-600 rounded mx-auto"
                    />
                  </div>
                )}
              </div>
              
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
                className="w-full" 
                variant="outline"
                disabled={!paymentScreenshot}
              >
                Payment Completed
              </Button>
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
