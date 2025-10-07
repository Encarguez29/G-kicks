"use client"

import { useState, useEffect } from "react"
import { Bell, Package, Clock, Eye } from "lucide-react"
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

interface NotificationData {
  newOrdersCount: number
  recentOrders: OrderNotification[]
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationData>({
    newOrdersCount: 0,
    recentOrders: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('jwt_token')
      const response = await fetch('/api/admin/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        setNotifications({
          newOrdersCount: data.newOrdersCount,
          recentOrders: data.recentOrders
        })
      } else {
        console.error('API returned error:', data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Set empty state on error to prevent infinite loading
      setNotifications({
        newOrdersCount: 0,
        recentOrders: []
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.newOrdersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notifications.newOrdersCount > 99 ? '99+' : notifications.newOrdersCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Order Notifications</span>
          {notifications.newOrdersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notifications.newOrdersCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.recentOrders.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No recent orders
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto">
              {notifications.recentOrders.map((order) => (
                <DropdownMenuItem
                  key={order.id}
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