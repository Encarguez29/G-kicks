"use client"

import { useState, useEffect } from "react"
import { Bell, Package, Clock, Eye, Truck, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface OrderNotification {
  id: number
  order_number: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
}

interface DeliveryNotification {
  id: number
  order_id: number
  order_number: string
  customer_name: string
  notification_type: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'delivery_confirmation'
  title: string
  message: string
  created_at: string
  is_read: boolean
}

interface NotificationData {
  newOrdersCount: number
  recentOrders: OrderNotification[]
  deliveryNotifications: DeliveryNotification[]
  unreadDeliveryCount: number
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationData>({
    newOrdersCount: 0,
    recentOrders: [],
    deliveryNotifications: [],
    unreadDeliveryCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      }
      
      // Fetch order notifications
      const orderResponse = await fetch('/api/admin/notifications', {
        method: 'GET',
        headers,
        cache: 'no-cache'
      })
      
      // Fetch delivery notifications
      const deliveryResponse = await fetch('/api/admin/delivery-notifications', {
        method: 'GET',
        headers,
        cache: 'no-cache'
      })
      
      if (!orderResponse.ok || !deliveryResponse.ok) {
        throw new Error(`HTTP error! Order: ${orderResponse.status}, Delivery: ${deliveryResponse.status}`)
      }
      
      const orderData = await orderResponse.json()
      const deliveryData = await deliveryResponse.json()
      
      if (orderData.success && deliveryData.success) {
        setNotifications({
          newOrdersCount: orderData.newOrdersCount,
          recentOrders: orderData.recentOrders,
          deliveryNotifications: deliveryData.notifications || [],
          unreadDeliveryCount: deliveryData.unreadCount || 0
        })
      } else {
        console.error('API returned error:', orderData.error || deliveryData.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Set empty state on error to prevent infinite loading
      setNotifications({
        newOrdersCount: 0,
        recentOrders: [],
        deliveryNotifications: [],
        unreadDeliveryCount: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch if component is mounted
    let isMounted = true
    
    const fetchWithRetry = async (retries = 3) => {
      if (!isMounted) return
      
      try {
        await fetchNotifications()
      } catch (error) {
        if (retries > 0 && isMounted) {
          console.log(`Retrying notification fetch... ${retries} attempts left`)
          setTimeout(() => fetchWithRetry(retries - 1), 2000)
        }
      }
    }
    
    fetchWithRetry()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      if (isMounted) {
        fetchNotifications()
      }
    }, 30000)
    
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'processing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  const markNotificationsAsViewed = async (orderIds: number[]) => {
    if (orderIds.length === 0) return
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/admin/notifications/mark-viewed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderIds })
      })
      
      if (response.ok) {
        console.log(`✅ Marked ${orderIds.length} notifications as viewed`)
        // Optimistically update UI count and list
        setNotifications(prev => ({
          ...prev,
          newOrdersCount: Math.max(0, prev.newOrdersCount - orderIds.length),
          recentOrders: prev.recentOrders.filter(o => !orderIds.includes(o.id))
        }))
        // Refresh notifications to ensure sync with server
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to mark notifications as viewed:', error)
    }
  }

  const markDeliveryNotificationsAsRead = async (notificationIds: number[]) => {
    if (notificationIds.length === 0) return
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/admin/delivery-notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ notificationIds })
      })
      
      if (response.ok) {
        console.log(`✅ Marked ${notificationIds.length} delivery notifications as read`)
        // Optimistically update UI
        setNotifications(prev => ({
          ...prev,
          unreadDeliveryCount: Math.max(0, prev.unreadDeliveryCount - notificationIds.length),
          deliveryNotifications: prev.deliveryNotifications.map(n => 
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        }))
        // Refresh notifications to ensure sync with server
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to mark delivery notifications as read:', error)
    }
  }

  const handleViewOrder = (orderId: number) => {
    // Mark this specific notification as viewed
    markNotificationsAsViewed([orderId])
    try {
      router.push(`/admin/orders?highlight=${orderId}`)
    } catch (error) {
      console.warn('Navigation error:', error)
      window.location.href = `/admin/orders?highlight=${orderId}`
    }
  }

  const handleViewDeliveryNotification = (notification: DeliveryNotification) => {
    // Mark this specific delivery notification as read
    if (!notification.is_read) {
      markDeliveryNotificationsAsRead([notification.id])
    }
    try {
      router.push(`/admin/orders?highlight=${notification.order_id}`)
    } catch (error) {
      console.warn('Navigation error:', error)
      window.location.href = `/admin/orders?highlight=${notification.order_id}`
    }
  }

  const handleViewAllOrders = () => {
    // Mark all current notifications as viewed
    const orderIds = notifications.recentOrders.map(order => order.id)
    markNotificationsAsViewed(orderIds)
    try {
      router.push('/admin/orders')
    } catch (error) {
      console.warn('Navigation error:', error)
      window.location.href = '/admin/orders'
    }
  }

  const totalUnreadCount = notifications.newOrdersCount + notifications.unreadDeliveryCount

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {totalUnreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {totalUnreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : totalUnreadCount === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto">
              {/* Order Notifications */}
              {notifications.recentOrders.map((order) => (
                <DropdownMenuItem
                  key={`order-${order.id}`}
                  className="flex items-start space-x-3 p-3 cursor-pointer"
                  onClick={() => handleViewOrder(order.id)}
                >
                  <div className="flex-shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        #{order.order_number}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.customer_name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-medium">
                        {formatCurrency(order.total_amount)}
                      </span>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              
              {/* Delivery Notifications */}
              {notifications.deliveryNotifications
                .filter(notification => !notification.is_read)
                .map((notification) => (
                  <DropdownMenuItem
                    key={`delivery-${notification.id}`}
                    className="flex items-start space-x-3 p-3 cursor-pointer"
                    onClick={() => handleViewDeliveryNotification(notification)}
                  >
                    <div className="flex-shrink-0">
                      {notification.notification_type === 'delivered' ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                      ) : (
                        <Truck className="h-4 w-4 text-blue-600 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Order #{notification.order_number} • {notification.customer_name}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(notification.created_at)}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center font-medium"
              onClick={handleViewAllOrders}
            >
              <Eye className="h-4 w-4 mr-2" />
              View All Orders
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}