"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Search, Plus, Minus, ShoppingCart, CreditCard, QrCode, Receipt, Trash2, Loader2 } from "lucide-react"
import {
  type ProductInventory,
} from "@/lib/admin-data"
import { toast } from "sonner"
import { useAdmin } from "@/contexts/admin-context"
import { useToast } from "@/hooks/use-toast"

interface CartItem {
  productId: string
  name: string
  brand: string
  price: number
  color: string
  size: string
  quantity: number
  image: string
}

interface Transaction {
  id: string
  items: CartItem[]
  total: number
  paymentMethod: string
  timestamp: string
  customerName?: string
}

export default function POSPage() {
  const { state } = useAdmin()
  const router = useRouter()
  const { toast: toastHook } = useToast()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [inventory, setInventory] = useState<ProductInventory[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null)
  const [selectedColor, setSelectedColor] = useState("")
  const [selectedSize, setSelectedSize] = useState("")
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false)
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [customerName, setCustomerName] = useState("")
  const [amountPaid, setAmountPaid] = useState(0)
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null)
  const [dailySales, setDailySales] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customerEmail, setCustomerEmail] = useState("")
  const [isEmailSending, setIsEmailSending] = useState(false)

  const sizes = ["5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"]

  // Check authentication
  useEffect(() => {
    if (state.isLoading) return // Still loading
    
    if (!state.isAuthenticated || !state.user) {
      toastHook({
        title: "Access Denied",
        description: "Admin authentication required. Redirecting to login...",
        variant: "destructive",
      })
      router.push('/admin/login')
      return
    }
  }, [state.isAuthenticated, state.isLoading, state.user, router, toastHook])

  useEffect(() => {
    console.log('🚀 POS: Component mounted, initializing data...')
    const initializeData = async () => {
      console.log('📡 POS: Starting data initialization...')
      await refreshInventory()
      await loadDailySales()
      loadTransactions()
      console.log('✅ POS: Data initialization complete')
    }
    initializeData().catch(error => {
      console.error('❌ POS: Error during initialization:', error)
    })
  }, [])

  const getTotalStock = (product: ProductInventory): number => {
    if (!product?.variants) return 0

    return Object.values(product.variants).reduce((total, variant) => {
      if (!variant) return total
      return total + Object.values(variant).reduce((sum, qty) => sum + (typeof qty === "number" ? qty : 0), 0)
    }, 0)
  }

  const refreshInventory = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/inventory', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          const activeProducts = data.filter((product) => {
            if (!product || product.is_active === false) return false
            return true
          })
          setInventory(activeProducts)
          console.log('✅ POS: Loaded', activeProducts.length, 'active products')
        } else {
          console.error('❌ POS: Invalid inventory data format')
          setInventory([])
        }
      } else {
        throw new Error('Failed to fetch inventory')
      }
    } catch (error) {
      console.error('❌ POS: Error loading inventory:', error)
      setInventory([])
      toast.error('Failed to load inventory')
    }
  }

  const loadDailySales = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/daily-sales', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDailySales(data.totalGrossSales || 0)
      } else {
        console.error('Failed to fetch daily sales')
      }
    } catch (error) {
      console.error('Error loading daily sales:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/transactions', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        const transactionsArray = data.transactions || data
        if (Array.isArray(transactionsArray)) {
          const formattedTransactions = transactionsArray.map((transaction: any) => ({
            id: transaction.id,
            items: JSON.parse(transaction.items || '[]'),
            total: transaction.total_amount,
            paymentMethod: transaction.payment_method,
            timestamp: transaction.created_at,
            customerName: transaction.customer_name
          }))
          setTransactions(formattedTransactions)
        }
      } else {
        console.error('Failed to fetch transactions')
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const saveTransaction = async (transaction: Transaction) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: transaction.items,
          total: transaction.total,
          paymentMethod: transaction.paymentMethod,
          customerName: transaction.customerName,
          discount: (transaction as any).discount ?? 0,
          tax: (transaction as any).tax ?? 0,
        }),
      })
      
      if (response.ok) {
        await loadTransactions()
        await refreshInventory()
        await loadDailySales()
        toast.success('Transaction saved successfully')
      } else {
        throw new Error('Failed to save transaction')
      }
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error('Failed to save transaction')
    }
  }

  const getCurrentStock = (product: ProductInventory): number => {
    try {
      return getTotalStock(product)
    } catch (error) {
      console.error('Error getting current stock:', error)
      return 0
    }
  }

  const refreshData = async () => {
    try {
      console.log('🔄 POS: Refreshing all data...')
      await Promise.all([
        refreshInventory(),
        loadDailySales(),
        loadTransactions()
      ])
      console.log('✅ POS: All data refreshed successfully')
    } catch (error) {
      console.error('❌ POS: Error refreshing data:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    refreshData()
  }, [])

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    const transaction: Transaction = {
      id: `TXN-${Date.now()}`,
      items: cart,
      total: getCartTotal(),
      paymentMethod,
      timestamp: new Date().toISOString(),
      customerName: customerName || undefined
    }

    await saveTransaction(transaction)
    
    // Clear cart and reset form
    setCart([])
    setPaymentMethod('')
    setCustomerName('')
    setAmountPaid(0)
// Remove setChangeGiven since it's not defined and not needed
    setIsCheckoutDialogOpen(false)
    
    toast.success('Transaction completed successfully!')
  }

  const filteredInventory = inventory.filter((product) => {
    const searchMatch =
      !searchQuery ||
      (product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()))

    return searchMatch
  })

  const getAvailableColors = (product: ProductInventory): string[] => {
    if (!product?.variants) return []

    return Object.keys(product.variants).filter((color) => {
      const variant = product.variants?.[color]
      if (!variant) return false
      // Check if any size has stock > 0
      return Object.values(variant).some((stock) => typeof stock === "number" && stock > 0)
    })
  }

  const getAvailableSizes = (product: ProductInventory, color: string): string[] => {
    if (!product?.variants?.[color]) return []

    return Object.entries(product.variants[color])
      .filter(([, stock]) => typeof stock === "number" && stock > 0)
      .map(([size]) => size)
      .sort((a, b) => Number(a) - Number(b))
  }

  const getCurrentStockForVariant = (product: ProductInventory, color: string, size: string): number => {
    try {
      if (!product?.variants || !color || !size) return 0
      
      const colorVariants = product.variants[color]
      if (!colorVariants) return 0
      
      const stock = colorVariants[size]
      return typeof stock === 'number' ? stock : 0
    } catch (error) {
      console.error("Error getting current stock:", error)
      return 0
    }
  }

  const openProductDialog = (product: ProductInventory) => {
    setSelectedProduct(product)
    setSelectedColor("")
    setSelectedSize("")
    setIsProductDialogOpen(true)
  }

  const addToCartFromDialog = () => {
    if (!selectedProduct || !selectedColor || !selectedSize) {
      toast.error("Please select color and size")
      return
    }

    const stock = getCurrentStockForVariant(selectedProduct, selectedColor, selectedSize)
    if (stock <= 0) {
      toast.error("Product is out of stock")
      return
    }

    // Check if stock is a number before comparison
    if (typeof stock !== 'number') {
      toast.error("Invalid stock value")
      return
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(
      (item) => item.productId === String(selectedProduct.id) && item.color === selectedColor && item.size === selectedSize,
    )

    if (existingItemIndex >= 0) {
      // Update quantity if item exists
      const updatedCart = [...cart]
      if (updatedCart[existingItemIndex].quantity < stock) {
        updatedCart[existingItemIndex].quantity += 1
        setCart(updatedCart)
        toast.success("Quantity updated in cart")
      } else {
        toast.error("Cannot add more than available stock")
      }
    } else {
      // Add new item to cart
      const newItem: CartItem = {
        productId: String(selectedProduct.id),
        name: selectedProduct.name,
        brand: selectedProduct.brand,
        price: selectedProduct.price,
        color: selectedColor,
        size: selectedSize,
        quantity: 1,
        image: selectedProduct.image_url || `/images/${selectedProduct.name.toLowerCase().replace(/\s+/g, "-")}.png`,
      }

      setCart([...cart, newItem])
      toast.success("Added to cart")
    }

    setIsProductDialogOpen(false)
  }

  const updateCartItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index)
      return
    }

    const updatedCart = [...cart]
    const item = updatedCart[index]
    
    // Find the product to check stock
    const product = inventory.find(p => String(p.id) === item.productId)
    if (product) {
      const stock = getCurrentStockForVariant(product, item.color, item.size)
      if (newQuantity > stock) {
        toast.error(`Only ${stock} items available in stock`)
        return
      }
    }

    updatedCart[index].quantity = newQuantity
    setCart(updatedCart)
  }

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index)
    setCart(updatedCart)
    toast.success("Item removed from cart")
  }

  const getCartTotal = (): number => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const processCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    if (paymentMethod === "cash" && amountPaid < getCartTotal()) {
      toast.error("Insufficient payment amount")
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      // Prepare transaction data for API
      const transactionData = {
        items: cart.map(item => ({
          productId: Number(item.productId),
          variantId: null, // You might need to get this from your product data
          name: item.name,
          brand: item.brand,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: item.price
        })),
        total: getCartTotal(),
        paymentMethod,
        customerName: customerName || null,
        paymentReference: paymentMethod !== 'cash' ? `REF-${Date.now()}` : null,
        cashReceived: paymentMethod === 'cash' ? amountPaid : null,
        changeGiven: paymentMethod === 'cash' ? getChange() : null
      }

      // Create POS transaction via API
      const response = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create transaction')
      }

      // Create local transaction object for UI
      const transaction: Transaction = {
        id: result.transactionId, // Use the actual transaction ID from database
        items: [...cart],
        total: getCartTotal(),
        paymentMethod,
        timestamp: new Date().toISOString(),
        customerName: customerName || undefined,
      }

      // Update daily sales
      const newDailySales = dailySales + getCartTotal()
      try {
        await fetch('/api/pos/daily-sales', {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ totalSales: newDailySales })
        })
        setDailySales(newDailySales)
      } catch (salesError) {
        console.error("Error updating daily sales:", salesError)
        // Don't fail the transaction for this
      }

      // Save transaction locally
      saveTransaction(transaction)
      setLastTransaction(transaction)

      // Clear cart and form
      setCart([])
      setCustomerName("")
      setAmountPaid(0)
      setPaymentMethod("cash")
      setIsCheckoutDialogOpen(false)
      setIsReceiptDialogOpen(true)

      // Refresh inventory
      refreshInventory()

      toast.success("Transaction completed successfully")
    } catch (error) {
      console.error("Error processing checkout:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process transaction")
    }
  }

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Invalid Date"
    }
  }

  const sendReceiptEmail = async () => {
    if (!customerEmail || !lastTransaction) {
      toast.error("Customer email and transaction required")
      return
    }

    setIsEmailSending(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const response = await fetch('/api/pos/send-receipt', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: lastTransaction.id,
          customerEmail: customerEmail,
          customerName: lastTransaction.customerName || customerName
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Receipt sent successfully!")
        setCustomerEmail("")
      } else {
        toast.error(result.error || "Failed to send receipt")
      }
    } catch (error) {
      console.error("Error sending receipt:", error)
      toast.error("Failed to send receipt")
    } finally {
      setIsEmailSending(false)
    }
  }

  const getChange = (): number => {
    return Math.max(0, amountPaid - getCartTotal())
  }

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Checking authentication...</span>
      </div>
    )
  }

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to be logged in as an admin to access the POS system.
          </p>
          <Button onClick={() => router.push('/admin/login')}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Point of Sale</h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-2">Process sales and manage transactions</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Product Selection */}
            <div className="lg:col-span-2">
              <Card className="bg-card border-border shadow-lg">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">Products</CardTitle>
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 bg-background border-border text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    {filteredInventory.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium">No products available</p>
                        <p className="text-sm">Check inventory or adjust search terms</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {filteredInventory.map((product) => {
                          const totalStock = getTotalStock(product)
                          const availableColors = getAvailableColors(product)
                          
                          return (
                            <Card
                              key={product.id}
                              className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 bg-card border-border"
                              onClick={() => openProductDialog(product)}
                            >
                              <div className="aspect-square relative overflow-hidden rounded-t-lg">
                                <img
                                  src={product.image_url || `/images/${product.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                                  alt={product.name}
                                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.jpg"
                                  }}
                                />
                                <div className="absolute top-2 right-2">
                                  <Badge variant={totalStock > 0 ? "default" : "destructive"} className="text-xs">
                                    {totalStock > 0 ? `${totalStock} in stock` : "Out of stock"}
                                  </Badge>
                                </div>
                              </div>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{product.brand}</p>
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                                    <div className="flex gap-1">
                                      {availableColors.slice(0, 3).map((color) => (
                                        <div
                                          key={color}
                                          className="w-4 h-4 rounded-full border border-border"
                                          style={{ backgroundColor: color.toLowerCase() }}
                                          title={color}
                                        />
                                      ))}
                                      {availableColors.length > 3 && (
                                        <span className="text-xs text-muted-foreground ml-1">+{availableColors.length - 3}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Cart */}
            <div>
              <Card className="bg-card border-border shadow-lg sticky top-4">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart ({getCartItemCount()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] mb-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                        <p>Cart is empty</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item, index) => (
                          <div key={`${item.productId}-${item.color}-${item.size}`} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.jpg"
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm line-clamp-1">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.color} - Size {item.size}</p>
                              <p className="text-sm font-semibold text-primary">{formatCurrency(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeFromCart(index)}
                                className="h-8 w-8 p-0 ml-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  {cart.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium">{formatCurrency(getCartTotal())}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-primary">{formatCurrency(getCartTotal())}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => setIsCheckoutDialogOpen(true)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        size="lg"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Checkout
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Selection Dialog */}
          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Select Product Options</DialogTitle>
              </DialogHeader>
              {selectedProduct && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedProduct.image_url || `/images/${selectedProduct.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.jpg"
                      }}
                    />
                    <div>
                      <h3 className="font-semibold">{selectedProduct.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(selectedProduct.price)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Select value={selectedColor} onValueChange={setSelectedColor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableColors(selectedProduct).map((color) => (
                            <SelectItem key={color} value={color}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: color.toLowerCase() }}
                                />
                                {color}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedColor && (
                      <div>
                        <Label htmlFor="size">Size</Label>
                        <Select value={selectedSize} onValueChange={setSelectedSize}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableSizes(selectedProduct, selectedColor).map((size) => (
                              <SelectItem key={size} value={size}>
                                Size {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedColor && selectedSize && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Stock available:</span>{" "}
                          <span className="font-bold">{getCurrentStockForVariant(selectedProduct, selectedColor, selectedSize)}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsProductDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={addToCartFromDialog} className="flex-1" disabled={!selectedColor || !selectedSize}>
                      Add to Cart
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Checkout Dialog */}
          <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Checkout</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name (Optional)</Label>
                  <Input
                    id="customer-name"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                      <SelectItem value="paymaya">PayMaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <Label htmlFor="amount-paid">Amount Paid</Label>
                    <Input
                      id="amount-paid"
                      type="number"
                      placeholder="0.00"
                      value={amountPaid || ""}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">{formatCurrency(getCartTotal())}</span>
                  </div>
                  {paymentMethod === "cash" && amountPaid > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span>{formatCurrency(amountPaid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change:</span>
                        <span className="font-bold text-green-600">{formatCurrency(getChange())}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={processCheckout} className="flex-1">
                    Complete Sale
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Receipt Dialog */}
          <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Transaction Receipt
                </DialogTitle>
              </DialogHeader>
              {lastTransaction && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="font-bold">GKICKS</h3>
                    <p className="text-sm text-muted-foreground">Transaction ID: {lastTransaction.id}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(lastTransaction.timestamp)}</p>
                    {lastTransaction.customerName && (
                      <p className="text-sm">Customer: {lastTransaction.customerName}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {lastTransaction.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">
                            {item.color} - Size {item.size} x {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p>{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(lastTransaction.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Payment Method:</span>
                      <span className="capitalize">{lastTransaction.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    <p>Thank you for your purchase!</p>
                  </div>

                  {/* Email Receipt Section */}
                  <Separator />
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm font-medium">Send Receipt via Email</p>
                      <p className="text-xs text-muted-foreground">Customer will receive a PDF receipt</p>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Customer email address"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                      <Button 
                        onClick={sendReceiptEmail} 
                        className="w-full" 
                        variant="outline"
                        disabled={!customerEmail || isEmailSending}
                      >
                        {isEmailSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Receipt className="h-4 w-4 mr-2" />
                            Send Email Receipt
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button onClick={() => setIsReceiptDialogOpen(false)} className="w-full">
                    Close
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}