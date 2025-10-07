// app/orders/page.tsx
"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { Package, Truck, CheckCircle, Clock, XCircle, Eye, RotateCcw, X } from "lucide-react"

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
  shippingAddress: any // JSONB type from your DB
  trackingNumber?: string
  paymentMethod?: string
  payment_screenshot?: string
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
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

export default function OrdersPage() {
  const { user, tokenReady } = useAuth()
  const isAuthenticated = Boolean(user && tokenReady)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
          // Map API response to frontend interface
          const mappedOrders = (data || []).map((order: any) => ({
            id: order.id,
            orderNumber: order.order_number,
            date: order.created_at,
            status: order.status,
            total: order.total,
            items: order.items || [],
            shippingAddress: order.shipping_address || {},
            trackingNumber: order.tracking_number
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
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel order')
      }

      // Refresh orders list
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      )
      setOrders(updatedOrders)
    } catch (error) {
      console.error('Failed to cancel order:', error)
      alert('Failed to cancel order. Please try again.')
    }
  }

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'delivered' })
      })

      if (!response.ok) {
        throw new Error('Failed to mark order as delivered')
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

      alert('Order marked as delivered successfully!')
    } catch (error) {
      console.error('Failed to mark order as delivered:', error)
      alert('Failed to mark order as delivered. Please try again.')
    }
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
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Order {order.orderNumber}</CardTitle>
                      <CardDescription>Placed on {new Date(order.date).toLocaleDateString()}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getStatusColor(order.status)} mb-2`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status}</span>
                        </div>
                      </Badge>
                      <p className="text-lg font-semibold">₱{Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={item.id}>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            <img
                              src={item.image_url || "/placeholder.svg"}
                              alt={item.name || `Product ${item.product_id}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.name || `Product ID: ${item.product_id}`}</h4>
                            {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
                            <p className="text-sm text-muted-foreground">
                              Size: {item.size || "-"} • Color: {item.color || "-"} • Qty: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₱{Number(item.price || 0).toFixed(2)}</p>
                          </div>
                        </div>
                        {index < order.items.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Shipping Address</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{order.shippingAddress.name || "-"}</p>
                        <p>{order.shippingAddress.address || "-"}</p>
                        <p>
                          {order.shippingAddress.city || "-"}, {order.shippingAddress.postalCode || "-"}
                        </p>
                        <p>{order.shippingAddress.country || "-"}</p>
                        {order.shippingAddress.shipping_region && (
                          <p>Shipping Region: {order.shippingAddress.shipping_region}</p>
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
                        {order.status === "delivered" && (
                          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                            <RotateCcw className="h-4 w-4" />
                            Return/Exchange
                          </Button>
                        )}
                        {order.trackingNumber && (
                          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                            <Truck className="h-4 w-4" />
                            Track Package
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
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
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
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="font-medium mb-2">Shipping Address</h4>
                <div className="bg-muted p-3 rounded-lg">
                  {selectedOrder.shippingAddress ? (
                    <div className="space-y-1">
                      <p>{selectedOrder.shippingAddress.name || selectedOrder.shippingAddress.fullName}</p>
                      <p>{selectedOrder.shippingAddress.address || selectedOrder.shippingAddress.street}</p>
                      <p>
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province || selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode || selectedOrder.shippingAddress.zipCode}
                      </p>
                      <p>{selectedOrder.shippingAddress.country || 'Philippines'}</p>
                      {selectedOrder.shippingAddress.shipping_region && (
                        <p>Shipping Region: {selectedOrder.shippingAddress.shipping_region}</p>
                      )}
                      {selectedOrder.shippingAddress.phone && (
                        <p>Phone: {selectedOrder.shippingAddress.phone}</p>
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

              {/* Action Buttons */}
              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
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
