// app/orders/page.tsx
"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { Package, Truck, CheckCircle, Clock, XCircle, Eye, RotateCcw, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { generateDisplayOrderId } from "@/lib/order-display-utils"

interface OrderItem {
  id: string
  product_id?: number
  quantity: number
  size: string | null
  color: string | null
  price: number
  name?: string
  brand?: string
  image_url?: string
}

interface Order {
  id: string
  orderNumber: string
  date: string
  status: string
  total: number
  items: OrderItem[]
  shipping_address: any // JSONB type from your DB
  trackingNumber?: string
  paymentMethod?: string
  payment_screenshot?: string
  payment_reference?: string | null
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />
    case "processing":
      return <Package className="h-4 w-4" />
    case "shipped":
      return <Truck className="h-4 w-4" />
    case "delivered":
      return <CheckCircle className="h-4 w-4" />
    case "cancelled":
      return <XCircle className="h-4 w-4" />
    case "pending_cancellation":
      return <RotateCcw className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "processing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "shipped":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    case "pending_cancellation":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

const getStatusDisplayText = (status: string) => {
  switch (status) {
    case "pending_cancellation":
      return "Cancel Request Sent"
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

// Helper function to categorize orders
const isCompletedOrder = (status: string) => {
  return status === "delivered" || status === "cancelled"
}

const isOngoingOrder = (status: string) => {
  return status === "pending" || status === "processing" || status === "shipped" || status === "pending_cancellation"
}

export default function OrdersPage() {
  const { user, tokenReady } = useAuth()
  const isAuthenticated = Boolean(user && tokenReady)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("ongoing")
  const router = useRouter()

  // Filter orders based on category
  const ongoingOrders = orders.filter(order => isOngoingOrder(order.status))
  const completedOrders = orders.filter(order => isCompletedOrder(order.status))

  useEffect(() => {
    if (isAuthenticated && tokenReady) {
      const fetchOrders = async () => {
        setLoading(true)
        try {
          const token = localStorage.getItem('auth_token')
          const response = await fetch('/api/orders', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            throw new Error('Failed to fetch orders')
          }

          const data = await response.json()
          // Map API response to frontend interface using actual order numbers from database
          const mappedOrders = (data || []).map((order: any) => ({
            id: order.id,
            orderNumber: order.order_number, // Use the actual order number from database (e.g., GK1001, GK1002)
            date: order.created_at,
            status: order.status,
            total: order.total,
            items: order.items || [],
            shipping_address: order.shipping_address || {},
            trackingNumber: order.tracking_number,
            paymentMethod: order.paymentMethod,
            payment_screenshot: order.payment_screenshot,
            payment_reference: order.payment_reference
          }))
          setOrders(mappedOrders)
        } catch (error) {
          console.error("Failed to load orders:", error)
          setOrders([])
        } finally {
          setLoading(false)
        }
      }

      fetchOrders()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, tokenReady, user?.id])

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) throw new Error('You are not authenticated')
    
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg = (data as any)?.error || (data as any)?.message || 'Failed to cancel order'
        throw new Error(msg)
      }
    
      // Update local state on success - set to pending_cancellation instead of cancelled
      setOrders(prev => prev.map(order => order.id === orderId ? { ...order, status: 'pending_cancellation' } : order))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'pending_cancellation' })
      }
      
      // Show success message
      alert('✅ Cancellation request sent! Your order is now pending admin approval.')
    } catch (error) {
      console.error('Failed to cancel order:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel order. Please try again.')
    }
  }

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/orders/${orderId}/delivered`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to mark order as delivered')
      }

      // Refresh orders list
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status: 'delivered' } : order
      )
      setOrders(updatedOrders)
      
      // Update selected order if it's the same one
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'delivered' })
      }

      // Close dialog and show success message
      setIsDialogOpen(false)
      alert('✅ Order marked as delivered successfully! Admin and staff have been notified via email.')
    } catch (error) {
      console.error('Failed to mark order as delivered:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Failed to mark order as delivered. Please try again.'}`)
    }
  }

  const handleReturnExchange = (order: Order) => {
    const idOrNumber = order.orderNumber || order.id
    router.push(`/customer-support?orderId=${encodeURIComponent(idOrNumber)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please log in to view your orders</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <a href="/auth">Go to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your shoe orders</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
              <Button asChild>
                <a href="/">Start Shopping</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ongoing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ongoing Orders ({ongoingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed Orders ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ongoing" className="mt-6">
              {ongoingOrders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No ongoing orders</h3>
                    <p className="text-muted-foreground mb-4">All your orders have been completed</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {ongoingOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Order {order.orderNumber}</CardTitle>
                            <CardDescription>Placed on {new Date(order.date).toLocaleDateString()}</CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge className={`${getStatusColor(order.status)} mb-2`}>
                              {getStatusIcon(order.status)}
                              {getStatusDisplayText(order.status)}
                            </Badge>
                            <p className="text-lg font-bold">₱{order.total.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                              {item.image_url && (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name || 'Product'} 
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{item.name || 'Product'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.brand && `${item.brand} • `}
                                  {item.size && `Size: ${item.size}`}
                                  {item.color && ` • Color: ${item.color}`}
                                  {item.quantity && ` • Qty: ${item.quantity}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₱{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator className="my-6" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">Shipping Address</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{order.shipping_address.name || order.shipping_address.fullName || "-"}</p>
                              <p>{order.shipping_address.address || order.shipping_address.street || "-"}</p>
                              <p>
                                {order.shipping_address.city || "-"}, {order.shipping_address.postalCode || order.shipping_address.zipCode || "-"}
                              </p>
                              <p>{order.shipping_address.country || "-"}</p>
                              {order.shipping_address.shipping_region && (
                                <p>Shipping Region: {order.shipping_address.shipping_region}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {order.trackingNumber && (
                              <div>
                                <h4 className="font-semibold mb-2">Tracking Information</h4>
                                <p className="text-sm text-muted-foreground mb-2">Tracking Number:</p>
                                <code className="bg-muted px-2 py-1 rounded text-sm">{order.trackingNumber}</code>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-2 bg-transparent"
                                onClick={() => handleViewDetails(order)}
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                              {(order.status === "pending" || order.status === "processing") && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex items-center gap-2 bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <X className="h-4 w-4" />
                                  Cancel Order
                                </Button>
                              )}
                              {order.status === "shipped" && (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleMarkAsDelivered(order.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Mark as Delivered
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No completed orders</h3>
                    <p className="text-muted-foreground mb-4">Your completed orders will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {completedOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Order {order.orderNumber}</CardTitle>
                            <CardDescription>Placed on {new Date(order.date).toLocaleDateString()}</CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge className={`${getStatusColor(order.status)} mb-2`}>
                              {getStatusIcon(order.status)}
                              {getStatusDisplayText(order.status)}
                            </Badge>
                            <p className="text-lg font-bold">₱{order.total.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                              {item.image_url && (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name || 'Product'} 
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{item.name || 'Product'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.brand && `${item.brand} • `}
                                  {item.size && `Size: ${item.size}`}
                                  {item.color && ` • Color: ${item.color}`}
                                  {item.quantity && ` • Qty: ${item.quantity}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₱{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator className="my-6" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">Shipping Address</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{order.shipping_address.name || order.shipping_address.fullName || "-"}</p>
                              <p>{order.shipping_address.address || order.shipping_address.street || "-"}</p>
                              <p>
                                {order.shipping_address.city || "-"}, {order.shipping_address.postalCode || order.shipping_address.zipCode || "-"}
                              </p>
                              <p>{order.shipping_address.country || "-"}</p>
                              {order.shipping_address.shipping_region && (
                                <p>Shipping Region: {order.shipping_address.shipping_region}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {order.trackingNumber && (
                              <div>
                                <h4 className="font-semibold mb-2">Tracking Information</h4>
                                <p className="text-sm text-muted-foreground mb-2">Tracking Number:</p>
                                <code className="bg-muted px-2 py-1 rounded text-sm">{order.trackingNumber}</code>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-2 bg-transparent"
                                onClick={() => handleViewDetails(order)}
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                              {order.status === "delivered" && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex items-center gap-2 bg-transparent"
                                  onClick={() => handleReturnExchange(order)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Return/Exchange
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              Order placed on {selectedOrder && new Date(selectedOrder.date).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Status */}
              <div>
                <h4 className="font-medium mb-2">Order Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedOrder.status)}
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {getStatusDisplayText(selectedOrder.status)}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name || 'Product'} 
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name || 'Product'}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.brand && `${item.brand} • `}
                          {item.size && `Size: ${item.size}`}
                          {item.color && ` • Color: ${item.color}`}
                        </p>
                        <p className="text-sm">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{(item.price * item.quantity).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">₱{(item.price || 0).toLocaleString()} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h4 className="font-medium mb-2">Payment Information</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span>Payment Method:</span>
                    <span className="font-medium">{selectedOrder.paymentMethod || 'Not specified'}</span>
                  </div>
                  {selectedOrder.payment_screenshot && (selectedOrder.paymentMethod === "GCash" || selectedOrder.paymentMethod === "Maya") && (
                    <div>
                      <span className="font-medium">Payment Screenshot:</span>
                      <div className="mt-2 border rounded-lg overflow-hidden max-w-sm">
                        <img 
                          src={selectedOrder.payment_screenshot} 
                          alt="Payment Screenshot" 
                          className="w-full h-auto max-h-64 object-contain hover:opacity-80 transition-opacity"
                          onClick={() => window.open(selectedOrder.payment_screenshot, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                    </div>
                  )}

                  {(selectedOrder.paymentMethod === "GCash" || selectedOrder.paymentMethod === "Maya") && selectedOrder.payment_reference && (
                    <div className="mt-3">
                      <span className="font-medium">Payment Reference:</span>
                      <p className="text-sm mt-1">{selectedOrder.payment_reference}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <div className="bg-muted p-3 rounded-lg">
                  {selectedOrder.shipping_address ? (
                    <div className="space-y-1">
                      <p>{selectedOrder.shipping_address.name || selectedOrder.shipping_address.fullName}</p>
                      <p>{selectedOrder.shipping_address.address || selectedOrder.shipping_address.street}</p>
                      {selectedOrder.shipping_address.barangay && (
                        <p>{selectedOrder.shipping_address.barangay}</p>
                      )}
                      <p>
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.province || selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postalCode || selectedOrder.shipping_address.zipCode}
                      </p>
                      <p>{selectedOrder.shipping_address.country || 'Philippines'}</p>
                      {selectedOrder.shipping_address.shipping_region && (
                        <p>Shipping Region: {selectedOrder.shipping_address.shipping_region}</p>
                      )}
                      {selectedOrder.shipping_address.phone && (
                        <p>Phone: {selectedOrder.shipping_address.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No shipping address available</p>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h4 className="font-medium mb-2">Order Summary</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Total:</span>
                    <span className="font-bold text-lg">₱{selectedOrder.total.toLocaleString()}</span>
                  </div>
                  {selectedOrder.trackingNumber && (
                    <div className="flex justify-between items-center mt-2">
                      <span>Tracking Number:</span>
                      <span className="font-mono">{selectedOrder.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update Section */}
              <div>
                <h4 className="font-medium mb-2">Update Order Status</h4>
                <div className="flex flex-wrap gap-2">
                  {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((status) => {
                    const isCurrentStatus = selectedOrder.status === status
                    const isDelivered = selectedOrder.status === 'delivered'
                    const isCancelled = selectedOrder.status === 'cancelled'
                    
                    // Disable all buttons if order is delivered or cancelled
                    const isDisabled = isDelivered || isCancelled || isCurrentStatus
                    
                    return (
                      <Button
                        key={status}
                        variant={isCurrentStatus ? "default" : "outline"}
                        size="sm"
                        disabled={isDisabled}
                        className={`
                          ${isCurrentStatus ? "bg-primary text-primary-foreground" : ""}
                          ${isDelivered && isCurrentStatus ? "bg-green-600 text-white" : ""}
                          ${isCancelled && isCurrentStatus ? "bg-red-600 text-white border-red-600 opacity-75 cursor-not-allowed" : ""}
                          ${isDisabled && !isCurrentStatus && !(isCancelled && isCurrentStatus) ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        onClick={() => {
                          if (status === 'delivered' && selectedOrder.status === 'shipped') {
                            handleMarkAsDelivered(selectedOrder.id)
                          }
                          // Add other status update logic here if needed
                        }}
                      >
                        {getStatusIcon(status)}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    )
                  })}
                </div>
                {selectedOrder.status === 'delivered' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ✅ This order has been delivered. Status cannot be changed.
                  </p>
                )}
                {selectedOrder.status === 'cancelled' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ❌ This order has been cancelled. Status cannot be changed.
                  </p>
                )}
                {selectedOrder.status === 'pending_cancellation' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ⏳ Cancellation request sent. Awaiting admin approval.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {selectedOrder.status === 'shipped' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => handleMarkAsDelivered(selectedOrder.id)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Delivered
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Remove mistakenly appended function at file end
// (this section intentionally left blank)
