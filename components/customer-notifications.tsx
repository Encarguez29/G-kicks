"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Truck, CheckCircle, Package, Clock, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DeliveryNotification {
  id: number
  order_id: number
  order_number: string
  notification_type: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'delivery_confirmation'
  title: string
  message: string
  created_at: string
  is_read: boolean
  order_status: string
  total_amount: number
  shipped_at?: string
}

interface NotificationData {
  notifications: DeliveryNotification[]
  unreadCount: number
}

export function CustomerNotifications() {
  const [notifications, setNotifications] = useState<NotificationData>({
    notifications: [],
    unreadCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/customer/delivery-notifications', {
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
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0
        })
      } else {
        console.error('API returned error:', data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      // Set empty state on error to prevent infinite loading
      setNotifications({
        notifications: [],
        unreadCount: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markNotificationsAsRead = async (notificationIds: number[]) => {
    if (notificationIds.length === 0) return
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/customer/delivery-notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ notificationIds })
      })
      
      if (response.ok) {
        console.log(`✅ Marked ${notificationIds.length} notifications as read`)
        // Optimistically update UI
        setNotifications(prev => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - notificationIds.length),
          notifications: prev.notifications.map(n => 
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        }))
        // Refresh notifications to ensure sync with server
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const handleViewNotification = (notification: DeliveryNotification) => {
    // Mark this specific notification as read
    if (!notification.is_read) {
      markNotificationsAsRead([notification.id])
    }
    router.push(`/orders?highlight=${notification.order_id}`)
  }

  const handleViewAllOrders = () => {
    router.push('/orders')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'processing':
        return <Package className="h-4 w-4 text-orange-600" />
      case 'shipped':
        return <Truck className="h-4 w-4 text-blue-600" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'cancelled':
        return <X className="h-4 w-4 text-red-600" />
      case 'delivery_confirmation':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Order Updates</span>
          {notifications.unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notifications.unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No order updates yet
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto">
              {notifications.notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex items-start space-x-3 p-3 cursor-pointer"
                  onClick={() => handleViewNotification(notification)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      Order #{notification.order_number} • {formatCurrency(notification.total_amount)}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(notification.created_at)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center font-medium"
              onClick={handleViewAllOrders}
            >
              <Package className="h-4 w-4 mr-2" />
              View All Orders
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}