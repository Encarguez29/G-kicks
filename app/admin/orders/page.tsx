"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAdmin } from "@/contexts/admin-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { type Order } from "@/lib/admin-data"
import { Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, Filter, RefreshCw, Archive } from "lucide-react"
import { useToast } from "@/hooks/use-toast"


export default function AdminOrdersPage() {
  const { state } = useAdmin()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [orderToArchive, setOrderToArchive] = useState<Order | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<Record<string, boolean>>({})
  const [disabledButtons, setDisabledButtons] = useState<Record<string, Set<string>>>({})
  const [lastClickedStatus, setLastClickedStatus] = useState<Record<string, Order["status"] | null>>({})
  const { toast } = useToast()

  // Load disabled buttons from localStorage on component mount
  useEffect(() => {
    const savedDisabledButtons = localStorage.getItem('admin_disabled_buttons')
    if (savedDisabledButtons) {
      try {
        const parsed = JSON.parse(savedDisabledButtons)
        // Convert arrays back to Sets
        const converted: Record<string, Set<string>> = {}
        Object.keys(parsed).forEach(orderId => {
          converted[orderId] = new Set(parsed[orderId])
        })
        setDisabledButtons(converted)
      } catch (error) {
        console.error('Error loading disabled buttons from localStorage:', error)
      }
    }
  }, [])

  // Save disabled buttons to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(disabledButtons).length > 0) {
      // Convert Sets to arrays for JSON serialization
      const serializable: Record<string, string[]> = {}
      Object.keys(disabledButtons).forEach(orderId => {
        serializable[orderId] = Array.from(disabledButtons[orderId])
      })
      localStorage.setItem('admin_disabled_buttons', JSON.stringify(serializable))
    }
  }, [disabledButtons])

  // Check authentication
  useEffect(() => {
    if (state.isLoading) return // Still loading
    
    if (!state.isAuthenticated || !state.user) {
      toast({
        title: "Access Denied",
        description: "Admin authentication required. Redirecting to login...",
        variant: "destructive",
      })
      router.push('/admin/login')
      return
    }
  }, [state.isAuthenticated, state.isLoading, state.user, router, toast])

  const broadcastRef = useRef<BroadcastChannel | null>(null)
  const loadOrders = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/admin/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        cache: 'no-cache'
      })
      if (response.ok) {
        const allOrders = await response.json()
        setOrders(allOrders || [])
        console.log("Loaded orders:", allOrders)
      } else {
        throw new Error('Failed to fetch orders')
      }
    } catch (error) {
      console.error("Error loading orders:", error)
      setOrders([])
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      })
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()

    // Listen for new orders from the orders context
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "gkicks-orders") {
        loadOrders(true)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  useEffect(() => {
    // Setup cross-tab sync via BroadcastChannel and lightweight polling
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastRef.current = new BroadcastChannel('gkicks-orders-sync')
      broadcastRef.current.onmessage = (event: MessageEvent) => {
        const data: any = event?.data
        if (data && data.type === 'order-updated') {
          loadOrders(true)
        }
      }
    }

    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadOrders(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadOrders(true)
      }
    }, 5000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
      if (broadcastRef.current) {
        try { broadcastRef.current.close() } catch {}
        broadcastRef.current = null
      }
    }
  }, [])

  // Handle highlight parameter from URL
  useEffect(() => {
    const highlightId = searchParams?.get('highlight')
    if (highlightId) {
      setHighlightOrderId(highlightId)
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightOrderId(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    // Filter orders based on search term and status
    let filtered = orders

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.customerEmail?.toLowerCase().includes(searchLower) ||
          order.id.toLowerCase().includes(searchLower),
      )
    }

    setFilteredOrders(filtered)
  }, [orders, searchTerm, statusFilter])

  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    if (isUpdatingStatus[orderId]) return // Prevent multiple clicks
    
    // Track which status was last clicked for session highlight
    setLastClickedStatus(prev => ({ ...prev, [orderId]: newStatus }))

    // Prevent duplicate interactions while updating
    setIsUpdatingStatus(prev => ({ ...prev, [orderId]: true }))
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in as admin or staff to update orders.",
          variant: "destructive",
        })
        try {
          router.push('/admin/login')
        } catch (navError) {
          console.warn('Navigation error:', navError)
          window.location.href = '/admin/login'
        }
        return
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        const updatedOrder = await response.json()
        setOrders((prevOrders) => prevOrders.map((order) => (order.id === orderId ? updatedOrder : order)))
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder)
        }
        toast({
          title: "Order Updated",
          description: `Order status changed to ${newStatus}`,
        })
        // Notify other same-origin tabs and refresh silently
        broadcastRef.current?.postMessage({ type: 'order-updated', orderId, status: newStatus, at: Date.now() })
        loadOrders(true)
      } else {
        let errorMsg = 'Unknown error'
        try {
          const errData = await response.json()
          errorMsg = errData?.error || JSON.stringify(errData)
        } catch {
          const text = await response.text()
          errorMsg = text?.slice(0, 200) + (text && text.length > 200 ? '…' : '')
        }
        console.error('Failed to update order:', response.status, errorMsg)
        throw new Error(`Failed to update order: ${response.status}`)
      }
    } catch (error) {
      console.error('Error updating order:', error)
      toast({
        title: "Error",
        description: typeof error === 'object' ? (error as any).message || "Failed to update order status" : "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleArchiveOrder = async (orderId: string) => {
    if (!orderToArchive) return;
    
    console.log('📦 Frontend: Archive button clicked for order:', orderId)
    console.log('✅ Frontend: User confirmed archiving, proceeding...')

    try {
      // Get JWT token from localStorage for admin authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      console.log('🔑 Frontend: JWT token found:', !!token)
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      console.log('📡 Frontend: Making DELETE request to:', `/api/admin/orders/${orderId}`)
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers,
      })
      
      console.log('📡 Frontend: Response status:', response.status)
      
      if (response.ok) {
        console.log('✅ Frontend: Archive successful, updating UI')
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
        toast({
          title: "Order Archived",
          description: "Order has been successfully archived",
        })
        // Navigate to archive page
        window.location.href = '/admin/archive'
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Frontend: Archive failed:', response.status, errorData)
        
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in as an admin to archive orders. Go to /admin/login",
            variant: "destructive",
          })
        } else if (response.status === 403) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to archive orders",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: errorData.error || `Failed to archive order (${response.status})`,
            variant: "destructive",
          })
        }
        console.error('Archive order error:', response.status, errorData)
      }
    } catch (error) {
      console.error('❌ Frontend: Network error archiving order:', error)
      toast({
        title: "Network Error",
        description: "Unable to connect to server. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsArchiveDialogOpen(false)
      setOrderToArchive(null)
    }
  }



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
      case "processing":
        return <Package className="h-4 w-4" />
      case "shipped":
        return <Truck className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
      case "confirmed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      case "processing":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      case "shipped":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400"
      case "cancelled":
        return "bg-red-500/10 text-red-600 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Show loading while checking authentication
  if (state.isLoading) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="text-muted-foreground">Checking authentication...</div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!state.isAuthenticated || !state.user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-yellow-500">Orders Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track customer orders from G-Kicks</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadOrders} disabled={isLoading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Badge variant="outline" className="text-xs">
            {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search orders by customer name, email, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-input border-border text-foreground">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Customer Orders</CardTitle>
          <CardDescription className="text-muted-foreground">
            {filteredOrders.length === 0 && orders.length === 0
              ? "No orders found - orders will appear here when customers make purchases"
              : filteredOrders.length === 0
                ? "No orders match your filters"
                : `Showing ${filteredOrders.length} of ${orders.length} orders`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {orders.length === 0 ? "No customer orders yet" : "No orders found"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {orders.length === 0
                  ? "Customer orders from the G-Kicks website will appear here"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {searchTerm || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <div 
                  key={order.id} 
                  className={`border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-all duration-300 bg-card ${
                    highlightOrderId === order.id.toString() 
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg ring-2 ring-yellow-400/50' 
                      : 'border-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">#{index + 1}</h3>
                          <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 text-xs`}>
                            {getStatusIcon(order.status)}
                            <span className="hidden xs:inline">{order.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate pr-2">{order.customerName || "Unknown Customer"}</p>
                        <p className="text-xs text-muted-foreground truncate pr-2">{order.customerEmail || "No email"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-foreground text-sm sm:text-base">{formatCurrency(order.total)}</p>
                      </div>
                    </div>
                
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>
                          {order.items?.length || 0} {(order.items?.length || 0) === 1 ? "item" : "items"}
                        </span>
                        <span>
                          {new Date(order.created_at || order.orderDate).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col xs:flex-row gap-2 pt-2 border-t border-border/50">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(order); setSelectedOrderIndex(index); }} className="w-full xs:w-auto">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOrderToArchive(order); setIsArchiveDialogOpen(true); }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950 w-full xs:w-auto"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">Archive Order</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to archive order "{orderToArchive?.id}"? This will move the order to the archive where it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary hover:bg-secondary/80 border-border text-secondary-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchiveOrder(orderToArchive?.id || '')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setSelectedOrderIndex(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border mx-4">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base sm:text-lg">
              Order Details - #{selectedOrderIndex !== null ? selectedOrderIndex + 1 : ''}
            </DialogTitle>
            {selectedOrder && (
              <DialogDescription className="text-muted-foreground text-sm">
                Order placed on {new Date(selectedOrder.created_at || (selectedOrder as any).orderDate).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            )}
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h4 className="font-medium mb-2 text-foreground text-sm sm:text-base">Update Order Status</h4>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  {(() => {
                    const lastClicked = lastClickedStatus[selectedOrder.id]
                    const statusOrder: Order["status"][] = ["pending", "confirmed", "processing", "shipped"]
                    const currentIndex = statusOrder.indexOf(selectedOrder.status as Order["status"]) 
                    const lastIndex = lastClicked ? statusOrder.indexOf(lastClicked as Order["status"]) : -1
                    const progressIndex = Math.max(currentIndex, lastIndex)
                    const isCancelled = selectedOrder.status === "cancelled"
                    return ["pending", "confirmed", "processing", "shipped", "cancelled"].map((status) => {
                      const isCurrentOrderUpdating = isUpdatingStatus[selectedOrder.id]
                      const statusIndex = statusOrder.indexOf(status as Order["status"]) 
                      const isHighlighted = lastClicked === status
                      const isCompletedStep = !isCancelled && progressIndex >= 0 && statusIndex >= 0 && statusIndex <= progressIndex
                      const shouldDisable = isCurrentOrderUpdating || (isCancelled ? status !== "cancelled" : isCompletedStep)
                      return (
                        <Button
                          key={status}
                          variant={isHighlighted ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(selectedOrder.id, status as Order["status"])}
                          disabled={shouldDisable}
                          className={`flex items-center gap-1 text-xs ${shouldDisable ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isCurrentOrderUpdating ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              <span className="hidden xs:inline">Updating...</span>
                            </>
                          ) : (
                            <>
                              {isCompletedStep ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                getStatusIcon(status)
                              )}
                              <span className="capitalize whitespace-nowrap text-xs sm:text-sm">{status}</span>
                            </>
                          )}
                        </Button>
                      )
                    })
                  })()}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-foreground text-sm sm:text-base">Shipping Address</h4>
                <div className="bg-muted p-3 rounded-lg">
                  {selectedOrder.shippingAddress ? (
                    <>
                      <p className="text-foreground text-sm">{(selectedOrder.shippingAddress as any).fullName || 'N/A'}</p>
                      <p className="text-foreground text-sm">{(selectedOrder.shippingAddress as any).street || 'N/A'}</p>
                      <p className="text-foreground text-sm">
                        {(selectedOrder.shippingAddress as any).city || 'N/A'}, {(selectedOrder.shippingAddress as any).province || 'N/A'} {(selectedOrder.shippingAddress as any).zipCode || 'N/A'}
                      </p>
                      <p className="text-foreground text-sm">Philippines</p>
                      {(selectedOrder.shippingAddress as any).phone && (
                        <p className="text-foreground text-sm">
                          <strong>Phone:</strong> {(selectedOrder.shippingAddress as any).phone}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-foreground text-muted-foreground text-sm">No shipping address available</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-foreground text-sm sm:text-base">Payment Information</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center mb-3 gap-1">
                    <span className="text-foreground text-sm">Payment Method:</span>
                    <span className="text-foreground font-medium text-sm">{selectedOrder.paymentMethod}</span>
                  </div>
                  {selectedOrder.payment_screenshot && (selectedOrder.paymentMethod === "GCash" || selectedOrder.paymentMethod === "Maya") && (
                    <div>
                      <span className="text-foreground font-medium text-sm">Payment Screenshot:</span>
                      <div className="mt-2 border rounded-lg overflow-hidden max-w-full sm:max-w-sm">
                        <img 
                          src={selectedOrder.payment_screenshot} 
                          alt="Payment Screenshot" 
                          className="w-full h-auto max-h-48 sm:max-h-64 object-contain hover:opacity-80 transition-opacity"
                          onClick={() => window.open(selectedOrder.payment_screenshot, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                    </div>
                  )}

                  {(selectedOrder.paymentMethod === "GCash" || selectedOrder.paymentMethod === "Maya") && selectedOrder.payment_reference && (
                    <div className="mt-3">
                      <span className="text-foreground font-medium text-sm">Payment Reference:</span>
                      <p className="text-foreground text-sm mt-1">{selectedOrder.payment_reference}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
