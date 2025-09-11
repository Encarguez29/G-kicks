"use client"

export const dynamic = 'force-dynamic'


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
import { Search, Plus, Minus, ShoppingCart, CreditCard, QrCode, Receipt, Trash2, Settings, Menu, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import {
  type ProductInventory,
} from "@/lib/admin-data"
import { toast } from "sonner"
import { useAdmin } from "@/contexts/admin-context"
import { useToast } from "@/hooks/use-toast"

interface DailySale {
  amount: number;
  // any other properties, e.g. date, id, etc.
}
interface Sale {
  amount: number;
  // Add any other properties that your sales object has, if needed
}

interface CartItem {
  productId: number;
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
  paymentDetails?: {method: string, amount: number}[]
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
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [openingCash, setOpeningCash] = useState<string>("")
  const [closingCash, setClosingCash] = useState("")
  const [barcodeInput, setBarcodeInput] = useState<string>("")
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none")
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [couponCode, setCouponCode] = useState<string>("")
  const [appliedDiscount, setAppliedDiscount] = useState<{type: string, value: number, amount: number} | null>(null)

  // Refund system state
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [refundTransactionId, setRefundTransactionId] = useState("")
  const [refundItems, setRefundItems] = useState<CartItem[]>([])
  const [refundReason, setRefundReason] = useState("")
  const [refundAmount, setRefundAmount] = useState(0)
  const [originalTransaction, setOriginalTransaction] = useState<Transaction | null>(null)

  // Multi-payment support state
  const [isMultiPaymentMode, setIsMultiPaymentMode] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<{method: string, amount: number}[]>([{method: 'cash', amount: 0}])
  const [remainingAmount, setRemainingAmount] = useState(0)

  // Cash drawer state
  const [cashDrawerConnected, setCashDrawerConnected] = useState(false)
  const [drawerPort, setDrawerPort] = useState('COM1')
  const [drawerStatus, setDrawerStatus] = useState<'open' | 'closed' | 'unknown'>('unknown')
  const [showCashDrawerDialog, setShowCashDrawerDialog] = useState(false)

  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showMoreProducts, setShowMoreProducts] = useState(false)
  const [showMoreCartItems, setShowMoreCartItems] = useState(false)
  const [isMobile, setIsMobile] = useState(false)


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
  async function fetchStocks() {
    if (!selectedProduct || !selectedColor) {
      setStockMap({});
      return;
    }
    const sizes = getAvailableSizes(selectedProduct, selectedColor);
    const stocks: Record<string, number> = {};
    for (const size of sizes) {
      const stock = await getCurrentStock(selectedProduct, selectedColor, size);
      stocks[size] = stock;
    }
    setStockMap(stocks);
  }
  fetchStocks();
}, [selectedProduct, selectedColor]);

  useEffect(() => {
    loadDailySales()
    refreshInventory()
    loadDailySales()
    loadTransactions()
  }, [])

  // Mobile detection useEffect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const refreshInventory = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/inventory', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setInventory(data)
      } else {
        console.warn("Invalid inventory data received:", data)
        setInventory([])
      }
    } catch (error) {
      console.error("Error refreshing inventory:", error)
      setInventory([])
      toast.error("Failed to load inventory data")
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
        if (data.summary) {
          setDailySales(data.summary.totalGrossSales || 0)
        }
      }
    } catch (error) {
      console.error("Error loading daily sales:", error)
      setDailySales(0)
    }
  }




  const loadTransactions = async () => {
    try {
      // Load all recent transactions (not just today's)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/transactions?limit=100', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        const transactionsArray = data.transactions || data
        if (Array.isArray(transactionsArray)) {
          // Convert API format to component format
          const formattedTransactions = transactionsArray.map((t: any) => ({
            id: t.id,
            items: JSON.parse(t.items || '[]'),
            total: t.total_amount || t.total || 0,
            paymentMethod: t.payment_method || 'cash',
            timestamp: t.created_at || new Date().toISOString(),
            customerName: t.customer_name
          }))
          setTransactions(formattedTransactions)
        }
      }
    } catch (error) {
      console.error("Error loading transactions:", error)
      setTransactions([])
    }
  }

  const saveTransaction = async (transaction: Transaction) => {
    try {
      // Convert transaction format for API
      const transactionData = {
        items: transaction.items.map(item => ({
          productId: item.productId.toString(),
          name: item.name,
          brand: item.brand,
          price: item.price,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          image: item.image
        })),
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        customerName: transaction.customerName
      }
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      })
      
      if (response.ok) {
        // Refresh transactions, inventory, and daily sales after successful save
        await loadTransactions()
        await refreshInventory()
        await loadDailySales()
        toast.success('Transaction saved successfully')
      } else {
        throw new Error('Failed to save transaction')
      }
    } catch (error) {
      console.error("Error saving transaction:", error)
      toast.error('Failed to save transaction')
    }
  }

  const filteredInventory = inventory.filter((product) => {
    if (!product) return false

    const searchMatch =
      !searchQuery ||
      (product.name && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()))

    return searchMatch
  })

  const getTotalStock = (product: ProductInventory): number => {
    if (!product?.variants) return 0

    return Object.values(product.variants).reduce((total, variant) => {
      if (!variant?.sizes) return total
      return total + Object.values(variant.sizes).reduce((sum, qty) => sum + (typeof qty === "number" ? qty : 0), 0)
    }, 0)
  }

  const getAvailableColors = (product: ProductInventory): string[] => {
    if (!product?.variants) {
      console.log('No variants in product:', product);
      return [];
    }

    return Object.keys(product.variants).filter((color) => {
      const variant = product.variants?.[color]
      if (!variant) return false
      // Check if any size has stock > 0
      return Object.values(variant).some((stock) => typeof stock === "number" && stock > 0)
    })
  }

  const getAvailableSizes = (product: ProductInventory, color: string): string[] => {
    if (!product?.variants?.[color]) {
      console.log('No variants for color:', color, 'in product:', product);
      return [];
    }
    console.log('Sizes object for color', color, ':', product.variants[color]);
    
    return Object.entries(product.variants[color])
      .filter(([, stock]) => typeof stock === "number" && stock > 0)
      .map(([size]) => size)
      .sort((a, b) => Number(a) - Number(b))
  }

  const getCurrentStock = (product: ProductInventory, color: string, size: string): number => {
  return product?.variants?.[color]?.[size] ?? 0;
}


  const openProductDialog = (product: ProductInventory) => {
    setSelectedProduct(product)
    setSelectedColor("")
    setSelectedSize("")
    setIsProductDialogOpen(true)
  }

  const addToCart = async () => {
    if (!selectedProduct || !selectedColor || !selectedSize) {
      toast.error("Please select color and size")
      return
    }

    const stock = await getCurrentStock(selectedProduct, selectedColor, selectedSize)
    if (stock <= 0) {
      toast.error("Product is out of stock")
      return
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(
      (item) => item.productId === selectedProduct.id && item.color === selectedColor && item.size === selectedSize,
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
        productId: selectedProduct.id,
        name: selectedProduct.name,
        brand: selectedProduct.brand,
        price: selectedProduct.price,
        color: selectedColor,
        size: selectedSize,
        quantity: 1,
        image: (selectedProduct.gallery_images && selectedProduct.gallery_images.length > 0 
          ? selectedProduct.gallery_images[0] 
          : selectedProduct.image_url) || 
        `/images/${selectedProduct.name.toLowerCase().replace(/\s+/g, "-")}.png`,
      }

      setCart([...cart, newItem])
      toast.success("Added to cart")
    }

    setIsProductDialogOpen(false)
    setSelectedProduct(null)
    setSelectedColor("")
    setSelectedSize("")
  }



  const updateCartItemQuantity = async (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index)
      return
    }
    
    const item = cart[index]
    const stock = await getCurrentStock(
      inventory.find((p) => p.id === Number(item.productId))!,
      item.color,
      item.size
    );

    if (newQuantity > stock) {
      toast.error("Cannot exceed available stock");
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    setCart(updatedCart);
  }

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index)
    setCart(updatedCart)
    toast.success("Removed from cart")
  }

  const getCartTotal = (): number => {
    const subtotal = getCartSubtotal()
    const discount = getDiscountAmount()
    return Math.max(0, subtotal - discount)
  }

  const getCartItemCount = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const processCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    // Check payment amount based on mode
    const totalAmount = getCartTotal()
    const paidAmount = isMultiPaymentMode ? getTotalPaidAmount() : amountPaid
    
    if (paidAmount < totalAmount) {
      toast.error("Insufficient payment amount")
      return
    }

    try {
      // Create transaction
      const transaction: Transaction = {
        id: `TXN-${Date.now()}`,
        items: [...cart],
        total: totalAmount,
        paymentMethod: isMultiPaymentMode ? 'multiple' : paymentMethod,
        timestamp: new Date().toISOString(),
        customerName: customerName || undefined,
        paymentDetails: isMultiPaymentMode ? paymentMethods.filter(p => p.amount > 0) : undefined,
      }

      // Save transaction (this will handle stock updates and daily sales via API)
      await saveTransaction(transaction)
      setLastTransaction(transaction)

      // Print receipt
      const transactionData = {
        ...transaction,
        subtotal: getCartSubtotal(),
        discount: getDiscountAmount(),
        amountPaid: isMultiPaymentMode ? getTotalPaidAmount() : amountPaid,
        change: isMultiPaymentMode ? Math.max(0, getTotalPaidAmount() - totalAmount) : getChange(),
        cashier: 'Admin'
      }
      printReceipt(transactionData)

      // Open cash drawer for cash transactions
      const hasCashPayment = isMultiPaymentMode 
        ? paymentMethods.some(p => p.method === 'cash' && p.amount > 0)
        : paymentMethod === 'cash'
      
      if (hasCashPayment) {
        await openCashDrawer()
      }

      // Clear cart and form
      setCart([])
      setCustomerName("")
      setAmountPaid(0)
      setPaymentMethod("cash")
      setIsCheckoutDialogOpen(false)
      setIsReceiptDialogOpen(true)

      // Clear discount and multi-payment
      removeDiscount()
      resetMultiPayment()

      // Refresh inventory
      refreshInventory()

      toast.success("Transaction completed successfully")
    } catch (error) {
      console.error("Error processing checkout:", error)
      toast.error("Failed to process transaction")
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

  const startSession = async () => {
    try {
      const response = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          opening_cash: parseFloat(openingCash) || 0,
        }),
      })

      if (response.ok) {
        const session = await response.json()
        setCurrentSession(session)
        setShowSessionDialog(false)
        setOpeningCash("")
        toast.success("Session started successfully")
      } else {
        toast.error("Failed to start session")
      }
    } catch (error) {
      console.error("Error starting session:", error)
      toast.error("Error starting session")
    }
  }

  const endSession = async () => {
    try {
      const response = await fetch("/api/pos/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "close",
          session_id: currentSession?.id,
          closing_cash: parseFloat(closingCash) || 0,
        }),
      })

      if (response.ok) {
        setCurrentSession(null)
        setShowSessionDialog(false)
        setClosingCash("")
        toast.success("Session ended successfully")
        loadDailySales() // Refresh daily sales after session end
      } else {
        toast.error("Failed to end session")
      }
    } catch (error) {
      console.error("Error ending session:", error)
      toast.error("Error ended session")
    }
  }

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return
    
    setIsScanning(true)
    try {
      // Search for product by barcode in the inventory
      const foundProduct = inventory.find(product => 
        product.id.toString() === barcode ||
        product.sku === barcode ||
        product.id.toString() === barcode
      )
      
      if (foundProduct) {
        setSelectedProduct(foundProduct)
        setIsProductDialogOpen(true)
        toast.success(`Product found: ${foundProduct.name}`)
      } else {
        toast.error("Product not found with this barcode")
      }
    } catch (error) {
      console.error("Error searching barcode:", error)
      toast.error("Error searching for product")
    } finally {
      setIsScanning(false)
      setBarcodeInput("")
    }
  }

  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBarcodeSearch(barcodeInput)
    }
  }

  const applyDiscount = () => {
    const subtotal = getCartSubtotal()
    let discountAmount = 0

    if (discountType === "percentage" && discountValue > 0) {
      discountAmount = (subtotal * discountValue) / 100
      setAppliedDiscount({
        type: "Percentage",
        value: discountValue,
        amount: discountAmount
      })
    } else if (discountType === "fixed" && discountValue > 0) {
      discountAmount = Math.min(discountValue, subtotal)
      setAppliedDiscount({
        type: "Fixed Amount",
        value: discountValue,
        amount: discountAmount
      })
    }

    if (discountAmount > 0) {
      toast.success(`Discount applied: ${formatCurrency(discountAmount)}`)
    }
  }

  const removeDiscount = () => {
    setAppliedDiscount(null)
    setDiscountType("none")
    setDiscountValue(0)
    setCouponCode("")
    toast.success("Discount removed")
  }

  const getCartSubtotal = (): number => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getDiscountAmount = (): number => {
    return appliedDiscount?.amount || 0
  }

  const searchTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/pos/transactions/${transactionId}`)
      if (response.ok) {
        const transaction = await response.json()
        setOriginalTransaction(transaction)
        setRefundItems(transaction.items.map((item: CartItem) => ({ ...item, quantity: 0 })))
        return transaction
      } else {
        toast.error('Transaction not found')
        return null
      }
    } catch (error) {
      console.error('Error searching transaction:', error)
      toast.error('Failed to search transaction')
      return null
    }
  }

  const processRefund = async () => {
    if (!originalTransaction || refundItems.length === 0) {
      toast.error('No items selected for refund')
      return
    }

    const itemsToRefund = refundItems.filter(item => item.quantity > 0)
    if (itemsToRefund.length === 0) {
      toast.error('Please select items to refund')
      return
    }

    const totalRefundAmount = itemsToRefund.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    try {
      const refundTransaction = {
        id: `REF-${Date.now()}`,
        originalTransactionId: originalTransaction.id,
        items: itemsToRefund,
        total: -totalRefundAmount, // Negative amount for refund
        paymentMethod: originalTransaction.paymentMethod,
        timestamp: new Date().toISOString(),
        customerName: originalTransaction.customerName,
        reason: refundReason,
        type: 'refund'
      }

      // Save refund transaction
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(refundTransaction)
      })

      if (response.ok) {
        // Update daily sales (subtract refund amount)
        setDailySales(prev => prev - totalRefundAmount)
        
        // Clear refund form
        setRefundTransactionId('')
        setRefundItems([])
        setRefundReason('')
        setRefundAmount(0)
        setOriginalTransaction(null)
        setIsRefundDialogOpen(false)
        
        toast.success(`Refund processed: ₱${totalRefundAmount.toFixed(2)}`)
      } else {
        toast.error('Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Failed to process refund')
    }
  }

  const updateRefundItemQuantity = (index: number, quantity: number) => {
    const maxQuantity = originalTransaction?.items[index]?.quantity || 0
    const validQuantity = Math.max(0, Math.min(quantity, maxQuantity))
    
    setRefundItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: validQuantity } : item
    ))
  }

  const addPaymentMethod = (method: string) => {
    setPaymentMethods(prev => [...prev, {method, amount: 0}])
  }

  const removePaymentMethod = (index: number) => {
    if (paymentMethods.length > 1) {
      setPaymentMethods(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updatePaymentMethod = (index: number, method: string, amount: number) => {
    setPaymentMethods(prev => prev.map((payment, i) => 
      i === index ? { method, amount: Math.max(0, amount) } : payment
    ))
  }

  const getTotalPaidAmount = (): number => {
    return paymentMethods.reduce((sum, payment) => sum + payment.amount, 0)
  }

  const getRemainingAmount = (): number => {
    return Math.max(0, getCartTotal() - getTotalPaidAmount())
  }

  const resetMultiPayment = () => {
    setPaymentMethods([{method: 'cash', amount: 0}])
    setIsMultiPaymentMode(false)
    setRemainingAmount(0)
  }

  // Cash drawer functions
  const openCashDrawer = async () => {
    try {
      // ESC/POS command to open cash drawer
      // Standard command: ESC p m t1 t2 (0x1B 0x70 0x00 0x19 0x19)
      const escPosCommand = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0x19])
      
      // For web-based POS, we'll simulate the drawer opening
      // In a real implementation, this would communicate with hardware via:
      // - Serial port communication
      // - USB connection
      // - Network-connected cash drawer
      
      if (cashDrawerConnected) {
        setDrawerStatus('open')
        toast.success('Cash drawer opened')
        
        // Auto-close status after 3 seconds (simulation)
        setTimeout(() => {
          setDrawerStatus('closed')
        }, 3000)
      } else {
        toast.warning('Cash drawer not connected')
      }
    } catch (error) {
      console.error('Error opening cash drawer:', error)
      toast.error('Failed to open cash drawer')
    }
  }

  const testCashDrawerConnection = async () => {
    try {
      // Simulate connection test
      // In real implementation, this would test serial/USB connection
      const isConnected = Math.random() > 0.3 // 70% success rate for demo
      
      setCashDrawerConnected(isConnected)
      setDrawerStatus(isConnected ? 'closed' : 'unknown')
      
      if (isConnected) {
        toast.success(`Cash drawer connected on ${drawerPort}`)
      } else {
        toast.error(`Failed to connect to cash drawer on ${drawerPort}`)
      }
    } catch (error) {
      console.error('Error testing cash drawer connection:', error)
      setCashDrawerConnected(false)
      setDrawerStatus('unknown')
      toast.error('Cash drawer connection test failed')
    }
  }

  const configureCashDrawer = (port: string) => {
    setDrawerPort(port)
    setCashDrawerConnected(false)
    setDrawerStatus('unknown')
    toast.info(`Cash drawer port set to ${port}`)
  }

  const printReceipt = (transactionData: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Unable to open print window. Please check popup settings.')
      return
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 15px;
            width: 350px;
            color: #333;
          }
          .logo-section {
            text-align: center;
            margin-bottom: 20px;
          }
          .logo-section img {
            max-width: 120px;
            height: auto;
          }
          .company-info {
            text-align: justify;
            margin-bottom: 20px;
            font-size: 10px;
            line-height: 1.4;
          }
          .company-info div {
            text-align: justify;
          }
          .company-name {
            font-weight: bold;
            margin-bottom: 2px;
            text-align: justify;
          }
          .receipt-header {
            text-align: right;
            margin-bottom: 20px;
          }
          .receipt-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .receipt-details {
            font-size: 10px;
            line-height: 1.4;
          }
          .receipt-details div {
            text-align: justify;
          }
          .customer-info {
            text-align: justify;
            margin-bottom: 20px;
            font-size: 10px;
            line-height: 1.4;
          }
          .customer-info div {
            text-align: justify;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th {
            text-align: justify;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
            font-weight: bold;
            font-size: 10px;
          }
          .items-table td {
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 10px;
            text-align: justify;
          }
          .qty-col { width: 40px; text-align: center; }
          .desc-col { width: 180px; text-align: justify; }
          .price-col { width: 60px; text-align: right; }
          .amount-col { width: 70px; text-align: right; }
          .totals-section {
            margin-top: 20px;
            padding-top: 10px;
            text-align: justify;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 10px;
            text-align: justify;
          }
          .final-total {
            font-weight: bold;
            font-size: 12px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #333;
            text-align: justify;
          }
          .contact-info {
            margin-top: 30px;
            text-align: justify;
            font-size: 9px;
            line-height: 1.4;
          }
          .contact-info div {
            text-align: justify;
          }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="logo-section">
          <img src="/images/gkicks-transparent-logo.png" alt="GKicks Logo" />
        </div>
        
        <div class="company-info">
          <div class="company-name">FROM</div>
          <div>GKICKS SHOP</div>
          <div>Your Address 1234</div>
          <div>CA 12345</div>
        </div>
        
        <div class="receipt-header">
          <div class="receipt-title">RECEIPT</div>
          <div class="receipt-details">
            <div>Receipt #: ${transactionData.id.slice(-6)}</div>
            <div>Receipt Date: ${new Date(transactionData.timestamp).toLocaleDateString()}</div>
          </div>
        </div>
        
        <div class="customer-info">
          <div><strong>TO</strong></div>
          <div>${transactionData.customerName || 'Customer Name'}</div>
          <div>Customer Address 1234</div>
          <div>CA 12345</div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th class="qty-col">QTY</th>
              <th class="desc-col">Description</th>
              <th class="price-col">Unit Price</th>
              <th class="amount-col">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactionData.items.map((item: CartItem) => `
              <tr>
                <td class="qty-col">${item.quantity}</td>
                <td class="desc-col">${item.name}<br><small style="color: #666;">${item.brand} • ${item.color} • Size ${item.size}</small></td>
                <td class="price-col">₱{item.price.toFixed(2)}</td>
                <td class="amount-col">₱{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
            ${Array.from({length: Math.max(0, 8 - transactionData.items.length)}, () => `
              <tr>
                <td class="qty-col">0</td>
                <td class="desc-col"></td>
                <td class="price-col">0.00</td>
                <td class="amount-col">0.00</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals-section">
          <div class="total-line">
            <span>Subtotal</span>
            <span>₱{(transactionData.subtotal || transactionData.total).toFixed(2)}</span>
          </div>
          ${transactionData.discount ? `
            <div class="total-line">
              <span>Discount</span>
              <span>-₱{transactionData.discount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-line">
            <span>Sales Tax (5%)</span>
            <span>0.00</span>
          </div>
          <div class="total-line final-total">
            <span>Total</span>
            <span>₱{transactionData.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="contact-info">
           <div>Tel: +1 234 56 789</div>
           <div>Email: company@email.com</div>
           <div>Web: company.com</div>
         </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
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
    <div className="min-h-screen bg-background">
      <div className="mobile-container">
        {/* Mobile Header */}
        {isMobile && (
          <div className="mobile-section py-4">
            <div className="mobile-card flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-yellow-500">POS System</h1>
                <p className="text-xs text-muted-foreground mt-1">Point of Sale</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="h-10 w-10 p-0 hover:bg-muted"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Navigation Menu */}
        {isMobile && isMobileMenuOpen && (
          <div className="mobile-card mb-4 space-y-4 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
              {currentSession ? (
                <>
                  <div className="col-span-2 px-3 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium text-center">
                    Session Active
                  </div>
                  <Button
                    onClick={() => {
                      setShowSessionDialog(true)
                      setIsMobileMenuOpen(false)
                    }}
                    variant="outline"
                    className="mobile-button text-sm"
                  >
                    End Shift
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setShowSessionDialog(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className="col-span-2 mobile-button bg-primary text-primary-foreground text-sm"
                >
                  Start Shift
                </Button>
              )}
              <Button
                onClick={() => {
                  setIsRefundDialogOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                variant="outline"
                className="mobile-button text-sm"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Refund
              </Button>
              <Button
                onClick={() => {
                  setShowCashDrawerDialog(true)
                  setIsMobileMenuOpen(false)
                }}
                variant="outline"
                className="mobile-button text-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Drawer
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="mobile-card text-center">
                <p className="text-xs text-muted-foreground mb-1">Daily Sales</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(dailySales)}</p>
              </div>
              <div className="mobile-card text-center">
                <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                <p className="text-lg font-bold text-blue-600">{transactions.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-yellow-500">Point of Sale</h1>
              <p className="text-lg text-muted-foreground mt-2">Process sales and manage transactions</p>
            </div>
            <div className="flex items-center gap-6">
            {currentSession ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Session Active
                </div>
                <Button
                  onClick={() => setShowSessionDialog(true)}
                  variant="outline"
                  size="sm"
                >
                  End Shift
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowSessionDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                Start Shift
              </Button>
            )}
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Daily Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(dailySales)}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
              </div>
            </Card>
            <Button
              onClick={() => setIsRefundDialogOpen(true)}
              variant="outline"
              className="p-4 h-auto flex flex-col items-center gap-2"
            >
              <Receipt className="w-6 h-6" />
              <span className="text-sm">Process Refund</span>
            </Button>
            <Button
              onClick={() => setShowCashDrawerDialog(true)}
              variant="outline"
              className="p-4 h-auto flex flex-col items-center gap-2"
            >
              <Settings className="w-6 h-6" />
              <span className="text-sm">Cash Drawer</span>
            </Button>
          </div>
        </div>
        )}

        <div className="mobile-grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="mobile-card">
              <CardHeader className="mb-4">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                  <CardTitle className="text-lg font-semibold text-foreground">Products</CardTitle>
                  <div className="space-y-3 w-full lg:w-80">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mobile-input pl-12"
                      />
                    </div>
                    <div className="relative">
                      <QrCode className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Scan or enter barcode..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyPress={handleBarcodeKeyPress}
                        className="mobile-input pl-12"
                        disabled={isScanning}
                      />
                      {isScanning && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className={isMobile ? "h-[400px]" : "h-[600px]"}>
                  {filteredInventory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                      <p className="text-lg">No products available</p>
                      <p className="text-sm">Check inventory or adjust search terms</p>
                    </div>
                  ) : (
                    <>
                      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                        {(isMobile && !showMoreProducts ? filteredInventory.slice(0, 6) : filteredInventory).map((product) => (
                        <Card
                          key={product.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow bg-card border-border hover:border-yellow-400"
                          onClick={() => openProductDialog(product)}
                        >
                          <CardContent className="p-4">
                            <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                              <img
                                src={
                                  (product.gallery_images && product.gallery_images.length > 0 
                                    ? product.gallery_images[0] 
                                    : product.image_url) || 
                                  `/images/${product.name?.toLowerCase().replace(/\s+/g, "-")}.png`
                                }
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                                {product.is_new && <Badge className="bg-green-500 text-xs">New</Badge>}
                                {product.is_sale && <Badge className="bg-red-500 text-xs">Sale</Badge>}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{product.brand}</p>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-lg font-bold text-foreground">
                          {formatCurrency(product.price)}
                        </p>
                                  {product.originalPrice && product.originalPrice > product.price && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                      {formatCurrency(product.originalPrice)}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                >
                                  Stock: {getTotalStock(product)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {getAvailableColors(product)
                                  .slice(0, 3)
                                  .map((color) => (
                                    <div
                                      key={color}
                                      className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-500"
                                      style={{
                                        backgroundColor:
                                          color === "black"
                                            ? "#000000"
                                            : color === "white"
                                              ? "#ffffff"
                                              : color === "red"
                                                ? "#ef4444"
                                                : color === "blue"
                                                  ? "#3b82f6"
                                                  : color === "green"
                                                    ? "#10b981"
                                                    : color === "gray"
                                                      ? "#6b7280"
                                                      : color === "pink"
                                                        ? "#ec4899"
                                                        : color === "brown"
                                                          ? "#a3a3a3"
                                                          : "#d1d5db",
                                      }}
                                      title={color}
                                    />
                                  ))}
                                {getAvailableColors(product).length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{getAvailableColors(product).length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        ))}
                      </div>
                      {isMobile && filteredInventory.length > 6 && (
                        <div className="mt-4 text-center">
                          <Button
                            variant="outline"
                            onClick={() => setShowMoreProducts(!showMoreProducts)}
                            className="w-full"
                          >
                            {showMoreProducts ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-2" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                Show More ({filteredInventory.length - 6} more)
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Cart and Checkout */}
          <div className={`space-y-6 ${isMobile ? 'order-1' : ''}`}>
            {/* Cart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-foreground">Cart ({getCartItemCount()})</CardTitle>
                  {cart.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCart([])}
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isMobile ? '' : 'Clear'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className={isMobile ? "h-60" : "h-80"}>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>Cart is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {(isMobile && !showMoreCartItems ? cart.slice(0, 3) : cart).map((item, index) => (
                        <div
                          key={`${item.productId}-${item.color}-${item.size}`}
                          className="border border-border rounded-lg p-3 bg-muted"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-foreground">{item.name}</h4>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {item.brand} • {item.color} • Size {item.size}
                              </p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(item.price)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(index)}
                              className="h-6 w-6 p-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                                className="h-6 w-6 p-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center text-foreground">
                          {item.quantity}
                        </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                                className="h-6 w-6 p-0 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                          </div>
                        </div>
                        ))}
                      </div>
                      {isMobile && cart.length > 3 && (
                        <div className="mt-3 text-center">
                          <Button
                            variant="outline"
                            onClick={() => setShowMoreCartItems(!showMoreCartItems)}
                            className="w-full text-xs"
                            size="sm"
                          >
                            {showMoreCartItems ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Show More ({cart.length - 3} more)
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </ScrollArea>
                {cart.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    {/* Discount Section */}
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Discount</span>
                        {appliedDiscount && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={removeDiscount}
                            className="h-6 text-xs"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {!appliedDiscount ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Select value={discountType} onValueChange={(value: "none" | "percentage" | "fixed") => setDiscountType(value)}>
                              <SelectTrigger className="flex-1 h-8 text-xs">
                                <SelectValue placeholder="Discount type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Discount</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                              </SelectContent>
                            </Select>
                            {discountType !== "none" && (
                              <Input
                                type="number"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                placeholder={discountType === "percentage" ? "%" : "₱"}
                                className="w-20 h-8 text-xs"
                                min="0"
                                step={discountType === "percentage" ? "1" : "0.01"}
                              />
                            )}
                          </div>
                          {discountType !== "none" && discountValue > 0 && (
                            <Button
                              onClick={applyDiscount}
                              size="sm"
                              className="w-full h-7 text-xs"
                            >
                              Apply Discount
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-green-600 dark:text-green-400">
                          {appliedDiscount.type}: {appliedDiscount.type === "Percentage" ? `${appliedDiscount.value}%` : formatCurrency(appliedDiscount.value)} 
                          (-{formatCurrency(appliedDiscount.amount)})
                        </div>
                      )}
                    </div>
                    
                    {/* Totals */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Subtotal:</span>
                        <span className="text-sm text-foreground">{formatCurrency(getCartSubtotal())}</span>
                      </div>
                      {appliedDiscount && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Discount:</span>
                          <span className="text-sm text-green-600 dark:text-green-400">-{formatCurrency(getDiscountAmount())}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-foreground">Total:</span>
                        <span className="text-xl font-bold text-foreground">{formatCurrency(getCartTotal())}</span>
                      </div>
                    </div>
                    <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground ${isMobile ? 'text-sm py-3' : ''}`} size={isMobile ? "default" : "lg"}>
                          <CreditCard className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2`} />
                          Checkout
                        </Button>
                      </DialogTrigger>
                      <DialogContent className={`${isMobile ? 'max-w-[95vw] w-full mx-2' : 'max-w-md'} bg-card border-border`}>
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Checkout</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="customer-name" className="text-foreground">
              Customer Name (Optional)
            </Label>
                            <Input
                              id="customer-name"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Enter customer name"
                              className="bg-background border-border text-foreground placeholder-muted-foreground"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-foreground">Payment Method</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsMultiPaymentMode(!isMultiPaymentMode)}
                                className="text-xs"
                              >
                                {isMultiPaymentMode ? 'Single Payment' : 'Split Payment'}
                              </Button>
                            </div>
                            
                            {!isMultiPaymentMode ? (
                              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="bg-background border-border text-foreground">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                  <SelectItem value="cash" className="text-foreground hover:bg-accent">
                                    Cash
                                  </SelectItem>
                                  <SelectItem value="gcash" className="text-foreground hover:bg-accent">
                                    GCash
                                  </SelectItem>
                                  <SelectItem value="maya" className="text-foreground hover:bg-accent">
                                    Maya
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Select onValueChange={(value) => addPaymentMethod(value)}>
                                    <SelectTrigger className="bg-background border-border text-foreground">
                                      <SelectValue placeholder="Add payment method" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                      <SelectItem value="cash" className="text-foreground hover:bg-accent">
                                        Cash
                                      </SelectItem>
                                      <SelectItem value="gcash" className="text-foreground hover:bg-accent">
                                        GCash
                                      </SelectItem>
                                      <SelectItem value="maya" className="text-foreground hover:bg-accent">
                                        Maya
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {paymentMethods.map((payment, index) => (
                                  <div key={index} className="flex gap-2 items-center p-2 border border-border rounded">
                                    <span className="capitalize text-sm font-medium text-foreground min-w-16">
                                      {payment.method}
                                    </span>
                                    <Input
                                      type="number"
                                      value={payment.amount}
                                      onChange={(e) => updatePaymentMethod(index, payment.method, Number(e.target.value))}
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      className="flex-1 bg-background border-border text-foreground"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removePaymentMethod(index)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                
                                {paymentMethods.length > 0 && (
                                  <div className="text-sm space-y-1 p-2 bg-muted rounded">
                                    <div className="flex justify-between">
                                      <span>Total Paid:</span>
                                      <span className="font-medium">{formatCurrency(getTotalPaidAmount())}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Remaining:</span>
                                      <span className={`font-medium ${getRemainingAmount() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(getRemainingAmount())}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {!isMultiPaymentMode && paymentMethod === "cash" && (
                            <div>
                              <Label htmlFor="amount-paid" className="text-foreground">
                                Amount Paid
                              </Label>
                              <Input
                                id="amount-paid"
                                type="number"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(Number(e.target.value))}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="bg-background border-border text-foreground placeholder-muted-foreground"
                              />
                              {amountPaid > 0 && (
                                <div className="mt-2 text-sm text-foreground">
                                  <p>Total: {formatCurrency(getCartTotal())}</p>
                                  <p>Change: {formatCurrency(getChange())}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {!isMultiPaymentMode && (paymentMethod === "gcash" || paymentMethod === "maya") && (
                            <div className="text-center py-4">
                              <QrCode className="h-24 w-24 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">Show QR code to customer</p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(getCartTotal())}
                              </p>
                            </div>
                          )}
                          <div className="pt-4 border-t border-border">
                            <div className="flex justify-between items-center mb-4">
                              <span className="font-semibold text-foreground">Total Amount:</span>
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(getCartTotal())}
              </span>
                            </div>
                            <Button
                              onClick={processCheckout}
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                              size="lg"
                            >
                              <Receipt className="h-5 w-5 mr-2" />
                              Complete Transaction
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-60">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 10).map((transaction) => (
                        <div
                          key={transaction.id}
                          className="border border-border rounded-lg p-3 bg-muted"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm text-foreground">{transaction.id}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {formatDate(transaction.timestamp)}
                              </p>
                              {transaction.customerName && (
                                <p className="text-xs text-gray-600 dark:text-gray-300">{transaction.customerName}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                  {formatCurrency(transaction.total)}
                </p>
                              <Badge
                                variant="outline"
                                className="text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                              >
                                {transaction.paymentMethod}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {transaction.items.length} item{transaction.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Selection Dialog */}
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Select Product Options</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-6">
                <div className="flex gap-6">
                  <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={
                        (selectedProduct.gallery_images && selectedProduct.gallery_images.length > 0 
                          ? selectedProduct.gallery_images[0] 
                          : selectedProduct.image_url) || 
                        `/images/${selectedProduct.name?.toLowerCase().replace(/\s+/g, "-")}.png`
                      }
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=128&width=128"
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground">{selectedProduct.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{selectedProduct.brand}</p>
                    <p className="text-2xl font-bold mt-2 text-foreground">
                    {formatCurrency(selectedProduct.price)}
                  </p>
                    {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                      <p className="text-lg text-gray-500 dark:text-gray-400 line-through">
                        {formatCurrency(selectedProduct.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium text-foreground">Available Colors</Label>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    {getAvailableColors(selectedProduct).map((color) => (
                      <Button
                        key={color}
                        variant={selectedColor === color ? "default" : "outline"}
                        onClick={() => {
                          setSelectedColor(color)
                          setSelectedSize("") // Reset size when color changes
                        }}
                        className={`h-12 justify-start ${
                          selectedColor === color
                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-500 mr-2"
                          style={{
                            backgroundColor:
                              color === "black"
                                ? "#000000"
                                : color === "white"
                                  ? "#ffffff"
                                  : color === "red"
                                    ? "#ef4444"
                                    : color === "blue"
                                      ? "#3b82f6"
                                      : color === "green"
                                        ? "#10b981"
                                        : color === "gray"
                                          ? "#6b7280"
                                          : color === "pink"
                                            ? "#ec4899"
                                            : color === "brown"
                                              ? "#a3a3a3"
                                              : "#d1d5db",
                          }}
                        />
                        <span className="capitalize">{color}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedColor && (
                  <div>
                    <Label className="text-base font-medium text-foreground">Available Sizes</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {getAvailableSizes(selectedProduct, selectedColor).map((size) => {
                          const stock = stockMap[size] ?? 0; // default to 0 if not loaded yet

                          return (
                            <Button
                              key={size}
                              variant={selectedSize === size ? "default" : "outline"}
                              onClick={() => setSelectedSize(size)}
                              disabled={stock <= 0}
                              className={`h-12 ${
                                selectedSize === size
                                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                            >
                              <div className="text-center">
                                <div className="font-medium">{size}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{stock}</div>
                              </div>
                            </Button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {selectedColor && selectedSize && (
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedProduct.name} - {selectedColor} - Size {selectedSize}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {getCurrentStock(selectedProduct, selectedColor, selectedSize)}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(selectedProduct.price)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsProductDialogOpen(false)}
                    className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addToCart}
                    disabled={!selectedColor || !selectedSize}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Session Management Dialog */}
        <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {currentSession ? "End Shift" : "Start Shift"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!currentSession ? (
                <>
                  <div>
                    <Label htmlFor="opening-cash" className="text-foreground">
                      Opening Cash Amount
                    </Label>
                    <Input
                      id="opening-cash"
                      type="number"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="bg-background border-border text-foreground placeholder-muted-foreground"
                    />
                  </div>
                  <Button
                    onClick={startSession}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Start Shift
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opening Cash:</span>
                      <span className="text-foreground">{formatCurrency(currentSession.opening_cash || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Sales:</span>
                      <span className="text-foreground">{formatCurrency(dailySales)}</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="closing-cash" className="text-foreground">
                      Closing Cash Amount
                    </Label>
                    <Input
                      id="closing-cash"
                      type="number"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="bg-background border-border text-foreground placeholder-muted-foreground"
                    />
                  </div>
                  <Button
                    onClick={endSession}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    End Shift
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Transaction Receipt</DialogTitle>
            </DialogHeader>
            {lastTransaction && (
              <div className="space-y-4">
                <div className="text-center border-b border-gray-200 dark:border-gray-600 pb-4">
                  <h3 className="text-lg font-semibold text-foreground">GKicks Store</h3>
                  <p className="text-sm text-muted-foreground">Transaction Receipt</p>
                  <p className="text-xs text-muted-foreground">{formatDate(lastTransaction.timestamp)}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-foreground">{lastTransaction.id}</span>
                  </div>
                  {lastTransaction.customerName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="text-foreground">{lastTransaction.customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="capitalize text-foreground">{lastTransaction.paymentMethod}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {lastTransaction.items.map((item, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-foreground">{item.name}</span>
                        <span className="text-foreground">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground ml-2">
                        {item.color} • Size {item.size} • Qty: {item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-foreground">{formatCurrency(lastTransaction.total)}</span>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">Thank you for your purchase!</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const transactionData = {
                        ...lastTransaction,
                        subtotal: lastTransaction.total,
                        discount: 0,
                        amountPaid: lastTransaction.total,
                        change: 0,
                        cashier: 'Admin'
                      }
                      printReceipt(transactionData)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Print Receipt
                  </Button>
                  <Button
                    onClick={() => setIsReceiptDialogOpen(false)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Refund Dialog */}
        <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Process Refund</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transaction-id" className="text-foreground">Transaction ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="transaction-id"
                    placeholder="Enter transaction ID..."
                    value={refundTransactionId}
                    onChange={(e) => setRefundTransactionId(e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                  <Button
                    onClick={() => searchTransaction(refundTransactionId)}
                    disabled={!refundTransactionId.trim()}
                  >
                    Search
                  </Button>
                </div>
              </div>

              {originalTransaction && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Original Transaction</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <span className="ml-2 font-mono text-foreground">{originalTransaction.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2 text-foreground">{formatDate(originalTransaction.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-2 text-foreground">{formatCurrency(originalTransaction.total)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payment:</span>
                        <span className="ml-2 capitalize text-foreground">{originalTransaction.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Select Items to Refund</Label>
                    <div className="border border-border rounded-lg p-4 max-h-60 overflow-y-auto">
                      {refundItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.color} • Size {item.size} • {formatCurrency(item.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Original Qty: {originalTransaction.items[index]?.quantity || 0}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateRefundItemQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 0}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center text-foreground">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateRefundItemQuantity(index, item.quantity + 1)}
                              disabled={item.quantity >= (originalTransaction.items[index]?.quantity || 0)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refund-reason" className="text-foreground">Refund Reason</Label>
                    <Select value={refundReason} onValueChange={setRefundReason}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue placeholder="Select refund reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defective">Defective Product</SelectItem>
                        <SelectItem value="wrong-size">Wrong Size</SelectItem>
                        <SelectItem value="wrong-item">Wrong Item</SelectItem>
                        <SelectItem value="customer-request">Customer Request</SelectItem>
                        <SelectItem value="damaged-shipping">Damaged in Shipping</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Refund Amount:</span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(refundItems.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={processRefund}
                      disabled={!refundReason || refundItems.every(item => item.quantity === 0)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Process Refund
                    </Button>
                    <Button
                      onClick={() => {
                        setIsRefundDialogOpen(false)
                        setRefundTransactionId('')
                        setOriginalTransaction(null)
                        setRefundItems([])
                        setRefundReason('')
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Cash Drawer Settings Dialog */}
        <Dialog open={showCashDrawerDialog} onOpenChange={setShowCashDrawerDialog}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Cash Drawer Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Connection Status:</span>
                  <Badge 
                    variant={cashDrawerConnected ? "default" : "destructive"}
                    className={cashDrawerConnected ? "bg-green-100 text-green-800" : ""}
                  >
                    {cashDrawerConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Drawer Status:</span>
                  <Badge 
                    variant="outline"
                    className={`capitalize ${
                      drawerStatus === 'open' ? 'border-yellow-500 text-yellow-700' :
                      drawerStatus === 'closed' ? 'border-green-500 text-green-700' :
                      'border-gray-500 text-gray-700'
                    }`}
                  >
                    {drawerStatus}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="drawer-port" className="text-foreground">Serial Port</Label>
                <Select value={drawerPort} onValueChange={configureCashDrawer}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COM1">COM1</SelectItem>
                    <SelectItem value="COM2">COM2</SelectItem>
                    <SelectItem value="COM3">COM3</SelectItem>
                    <SelectItem value="COM4">COM4</SelectItem>
                    <SelectItem value="USB001">USB001</SelectItem>
                    <SelectItem value="USB002">USB002</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testCashDrawerConnection}
                  variant="outline"
                  className="flex-1"
                >
                  Test Connection
                </Button>
                <Button
                  onClick={openCashDrawer}
                  disabled={!cashDrawerConnected}
                  className="flex-1"
                >
                  Open Drawer
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Note:</strong> This is a simulation for demo purposes.</p>
                <p>In production, this would connect to actual cash drawer hardware via:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Serial port (RS-232)</li>
                  <li>USB connection</li>
                  <li>Network-connected drawer</li>
                  <li>Receipt printer with drawer kick</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
