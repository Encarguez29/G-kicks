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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Search, Eye, Package, Truck, CheckCircle, XCircle, Clock, Filter, RefreshCw, Archive, Trash2, RotateCcw, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

import * as settingsHelpers from '@/lib/settings'


// Helper functions to categorize orders
const isOngoingOrder = (status: string) => {
  return status === "pending" || status === "confirmed" || status === "processing" || status === "shipped"
}

const isDeliveredOrder = (status: string) => {
  return status === "delivered"
}

const isCancelledOrder = (status: string) => {
  return status === "cancelled"
}

const isReturnedOrder = (status: string) => {
  return status === "returned"
}

const isPendingCancellationOrder = (status: string) => {
  return status === "pending_cancellation"
}

// Helper function to determine button states based on current order status
const getButtonStates = (currentStatus: string) => {
  const statusFlow = ["pending", "confirmed", "processing", "shipped", "delivered"]
  const currentIndex = statusFlow.indexOf(currentStatus)
  
  // If order is delivered, cancelled, or returned, disable all buttons
  if (currentStatus === "delivered" || currentStatus === "cancelled" || currentStatus === "returned") {
    return {
      pending: { enabled: false, reason: "Order is finalized" },
      confirmed: { enabled: false, reason: "Order is finalized" },
      processing: { enabled: false, reason: "Order is finalized" },
      shipped: { enabled: false, reason: "Order is finalized" },
      delivered: { enabled: false, reason: "Order is finalized" },
      cancelled: { enabled: false, reason: "Order is finalized" }
    }
  }
  
  // For ongoing orders, only allow progression to next status
  const buttonStates: Record<string, { enabled: boolean; reason?: string }> = {}
  
  statusFlow.forEach((status, index) => {
    if (status === currentStatus) {
      // Current status - disabled (already at this status)
      buttonStates[status] = { enabled: false, reason: "Current status" }
    } else if (index < currentIndex) {
      // Previous statuses - disabled (cannot go backwards)
      buttonStates[status] = { enabled: false, reason: "Cannot go backwards" }
    } else if (index === currentIndex + 1) {
      // Next status - enabled (except for delivered which is customer-only)
      if (status === "delivered") {
        buttonStates[status] = { enabled: false, reason: "Only customers can mark orders as delivered" }
      } else {
        buttonStates[status] = { enabled: true }
      }
    } else {
      // Future statuses - disabled (must follow sequence)
      buttonStates[status] = { enabled: false, reason: "Must follow sequence" }
    }
  })
  
  // Always disable delivered status for admin users
  if (buttonStates.delivered) {
    buttonStates.delivered = { enabled: false, reason: "Only customers can mark orders as delivered" }
  }
  
  // Cancelled is always available for ongoing orders (except delivered and returned)
  buttonStates.cancelled = { 
    enabled: currentStatus !== "delivered" && currentStatus !== "cancelled" && currentStatus !== "returned",
    reason: currentStatus === "delivered" || currentStatus === "cancelled" || currentStatus === "returned" ? "Order is finalized" : undefined
  }
  
  return buttonStates
}



export default function AdminOrdersPage() {
  const { state } = useAdmin()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "ongoing" | "delivered" | "cancelled" | "returned" | "pending_cancellation">("all")
  const [orderSourceFilter, setOrderSourceFilter] = useState<"all" | "online" | "walk-in">("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<Record<string, boolean>>({})
  const [lastClickedStatus, setLastClickedStatus] = useState<Record<string, string>>({})
  const [disabledButtons, setDisabledButtons] = useState<Record<string, Set<string>>>({})
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null)
  const { toast } = useToast()

  // Calculate category counts
  const ongoingOrders = orders.filter(order => isOngoingOrder(order.status))
  const deliveredOrders = orders.filter(order => isDeliveredOrder(order.status))
  const cancelledOrders = orders.filter(order => isCancelledOrder(order.status))
  const returnedOrders = orders.filter(order => isReturnedOrder(order.status))
  const pendingCancellationOrders = orders.filter(order => isPendingCancellationOrder(order.status))

  const [isLoading, setIsLoading] = useState(true)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [orderToArchive, setOrderToArchive] = useState<Order | null>(null)
  const [lastSyncInfo, setLastSyncInfo] = useState<{orderId: string, updatedBy: string, timestamp: number} | null>(null)
  const [isBulkArchiving, setIsBulkArchiving] = useState(false)

  // Load admin settings from persistent storage on component mount
  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        // Load disabled buttons
        const savedDisabledButtons = await settingsHelpers.getAdminDisabledButtons()
        if (savedDisabledButtons && Object.keys(savedDisabledButtons).length > 0) {
          // Convert arrays back to Sets
          const converted: Record<string, Set<string>> = {}
          Object.keys(savedDisabledButtons).forEach(orderId => {
            converted[orderId] = new Set(savedDisabledButtons[orderId])
          })
          setDisabledButtons(converted)
        }

        // Load last clicked status
        const savedLastClickedStatus = await settingsHelpers.getAdminLastClickedStatus()
        if (savedLastClickedStatus && Object.keys(savedLastClickedStatus).length > 0) {
          setLastClickedStatus(savedLastClickedStatus)
        }
      } catch (error) {
        console.error('Error loading admin settings:', error)
        // Fallback to localStorage
        try {
          const savedDisabledButtons = localStorage.getItem('admin_disabled_buttons')
          if (savedDisabledButtons) {
            const parsed = JSON.parse(savedDisabledButtons)
            const converted: Record<string, Set<string>> = {}
            Object.keys(parsed).forEach(orderId => {
              converted[orderId] = new Set(parsed[orderId])
            })
            setDisabledButtons(converted)
          }

          const savedLastClickedStatus = localStorage.getItem('admin_last_clicked_status')
          if (savedLastClickedStatus) {
            const parsed = JSON.parse(savedLastClickedStatus)
            setLastClickedStatus(parsed)
          }
        } catch (fallbackError) {
          console.error('Error loading admin settings from localStorage fallback:', fallbackError)
        }
      }
    }

    loadAdminSettings()
  }, [])

  // Save disabled buttons to persistent storage whenever it changes
  useEffect(() => {
    if (Object.keys(disabledButtons).length > 0) {
      const saveDisabledButtons = async () => {
        try {
          // Convert Sets to arrays for JSON serialization
          const serializable: Record<string, string[]> = {}
          Object.keys(disabledButtons).forEach(orderId => {
            serializable[orderId] = Array.from(disabledButtons[orderId])
          })
          await settingsHelpers.setAdminDisabledButtons(serializable)
        } catch (error) {
          console.error('Error saving disabled buttons:', error)
          // Fallback to localStorage
          const serializable: Record<string, string[]> = {}
          Object.keys(disabledButtons).forEach(orderId => {
            serializable[orderId] = Array.from(disabledButtons[orderId])
          })
          localStorage.setItem('admin_disabled_buttons', JSON.stringify(serializable))
        }
      }
      saveDisabledButtons()
    }
  }, [disabledButtons])

  // Save last clicked status to persistent storage whenever it changes
  useEffect(() => {
    if (Object.keys(lastClickedStatus).length > 0) {
      const saveLastClickedStatus = async () => {
        try {
          await settingsHelpers.setAdminLastClickedStatus(lastClickedStatus)
        } catch (error) {
          console.error('Error saving last clicked status:', error)
          // Fallback to localStorage
          localStorage.setItem('admin_last_clicked_status', JSON.stringify(lastClickedStatus))
        }
      }
      saveLastClickedStatus()
    }
  }, [lastClickedStatus])

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
          // Store sync info for visual feedback
          setLastSyncInfo({
            orderId: data.orderId,
            updatedBy: data.updatedBy || 'Another user',
            timestamp: data.timestamp || Date.now()
          })
          
          // Sync last clicked status from other tabs
          if (data.lastClickedStatus) {
            setLastClickedStatus(prev => ({
              ...prev,
              ...data.lastClickedStatus
            }))
          }
          
          // Clear sync info after 5 seconds
          setTimeout(() => {
            setLastSyncInfo(null)
          }, 5000)
          
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

  // Update select all state when filtered orders change
  useEffect(() => {
    if (filteredOrders.length === 0) {
      setIsSelectAll(false)
      setSelectedOrders(new Set())
    } else {
      const allSelected = filteredOrders.every(order => selectedOrders.has(order.id))
      setIsSelectAll(allSelected)
    }
  }, [filteredOrders])

  useEffect(() => {
    // Filter orders based on search term and category
    let filtered = orders

    if (categoryFilter !== "all") {
      switch (categoryFilter) {
        case "ongoing":
          filtered = filtered.filter((order) => isOngoingOrder(order.status))
          break
        case "delivered":
          filtered = filtered.filter((order) => isDeliveredOrder(order.status))
          break
        case "cancelled":
          filtered = filtered.filter((order) => isCancelledOrder(order.status))
          break
        case "returned":
          filtered = filtered.filter((order) => isReturnedOrder(order.status))
          break
        case "pending_cancellation":
          filtered = filtered.filter((order) => isPendingCancellationOrder(order.status))
          break
      }
    }

    if (orderSourceFilter !== "all") {
      filtered = filtered.filter((order) => order.order_source === orderSourceFilter)
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.customerEmail?.toLowerCase().includes(searchLower) ||
          String(order?.id ?? '').toLowerCase().includes(searchLower),
      )
    }

    setFilteredOrders(filtered)
  }, [orders, searchTerm, categoryFilter, orderSourceFilter])

  const handleReturnConfirmation = async (orderId: string) => {
    if (!orderId) {
      toast({
        title: "Missing Order ID",
        description: "Cannot process return without a valid order ID.",
        variant: "destructive",
      })
      return
    }

    if (isUpdatingStatus[orderId]) {
      return // Prevent multiple clicks
    }
    
    // Prevent duplicate interactions while updating
    setIsUpdatingStatus(prev => ({ ...prev, [orderId]: true }))
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in as admin or staff to process returns.",
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

      const apiUrl = `/api/admin/orders/${orderId}/return`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'Product returned by customer'
        })
      })
      
      if (response.ok) {
        const responseData = await response.json()
        
        // Update order status to returned locally
        setOrders((prevOrders) => prevOrders.map((order) => (
          order.id === orderId ? { ...order, status: 'returned' as Order["status"] } : order
        )))
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => (prev ? { ...prev, status: 'returned' as Order["status"] } : prev))
        }
        toast({
          title: "Return Confirmed",
          description: "Order has been marked as returned and customer has been notified.",
        })
        // Notify other same-origin tabs and refresh silently
        broadcastRef.current?.postMessage({ 
          type: 'order-returned', 
          orderId, 
          newStatus: 'returned' 
        })
        await loadOrders(true)
      } else {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        toast({
          title: "Return Failed",
          description: errorData.error || `Failed to process return confirmation. Status: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('❌ Error processing return:', error)
      toast({
        title: "Return Failed",
        description: "An error occurred while processing the return.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleCancellationApproval = async (orderId: string, action: 'approve' | 'reject') => {
    if (!orderId) {
      toast({
        title: "Missing Order ID",
        description: "Cannot process cancellation without a valid order ID.",
        variant: "destructive",
      })
      return
    }

    if (isUpdatingStatus[orderId]) return // Prevent multiple clicks
    
    setIsUpdatingStatus(prev => ({ ...prev, [orderId]: true }))

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/admin/orders/${orderId}/cancel-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        const responseData = await response.json()
        const newStatus = action === 'approve' ? 'cancelled' : 'processing'
        
        // Update order status locally
        setOrders((prevOrders) => prevOrders.map((order) => (
          order.id === orderId ? { 
            ...order, 
            status: newStatus as Order["status"],
            cancellation_requested_at: action === 'reject' ? null : order.cancellation_requested_at,
            cancellation_reason: action === 'reject' ? null : order.cancellation_reason
          } : order
        )))
        
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => (prev ? { 
            ...prev, 
            status: newStatus as Order["status"],
            cancellation_requested_at: action === 'reject' ? null : prev.cancellation_requested_at,
            cancellation_reason: action === 'reject' ? null : prev.cancellation_reason
          } : prev))
        }
        
        toast({
          title: action === 'approve' ? "Cancellation Approved" : "Cancellation Rejected",
          description: action === 'approve' 
            ? "Order has been cancelled and stock has been restored." 
            : "Cancellation request has been rejected and order continues processing.",
        })
        
        // Notify other same-origin tabs and refresh silently
        broadcastRef.current?.postMessage({ 
          type: 'cancellation-processed', 
          orderId, 
          action,
          newStatus 
        })
        await loadOrders(true)
      } else {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        toast({
          title: "Processing Failed",
          description: errorData.error || `Failed to process cancellation ${action}. Status: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`❌ Error processing cancellation ${action}:`, error)
      toast({
        title: "Processing Failed",
        description: `An error occurred while processing the cancellation ${action}.`,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    if (!orderId) {
      toast({
        title: "Missing Order ID",
        description: "Cannot update status without a valid order ID.",
        variant: "destructive",
      })
      return
    }

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

      const response = await fetch(`/api/admin/orders`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      })
      
      if (response.ok) {
        // API returns a success payload, not the full order; update locally
        setOrders((prevOrders) => prevOrders.map((order) => (
          order.id === orderId ? { ...order, status: newStatus } : order
        )))
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => (prev ? { ...prev, status: newStatus } : prev))
        }
        toast({
          title: "Order Updated",
          description: `Order status changed to ${newStatus}`,
        })
        // Notify other same-origin tabs and refresh silently with detailed info
        broadcastRef.current?.postMessage({ 
          type: 'order-updated', 
          orderId, 
          status: newStatus, 
          updatedBy: state.user?.email || 'Unknown',
          timestamp: Date.now(),
          lastClickedStatus: { ...lastClickedStatus, [orderId]: newStatus }
        })
        loadOrders(true)
      } else {
        // Read body once to avoid "body stream already read" errors
        let errorMsg = 'Unknown error'
        try {
          const text = await response.text()
          try {
            const errData = JSON.parse(text)
            errorMsg = errData?.error || JSON.stringify(errData)
          } catch {
            errorMsg = text?.slice(0, 200) + (text && text.length > 200 ? '…' : '')
          }
        } catch (readErr) {
          console.warn('Failed to read error response body:', readErr)
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

    try {
      // Get JWT token from localStorage for admin authentication
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers,
      })
      
      if (response.ok) {
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
        toast({
          title: "Order Archived",
          description: "Order has been successfully archived",
        })
        // Stay on current page after archiving
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
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
      }
    } catch (error) {
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

  // Handle select all functionality
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedOrders(new Set())
      setIsSelectAll(false)
    } else {
      const allOrderIds = new Set(filteredOrders.map(order => order.id))
      setSelectedOrders(allOrderIds)
      setIsSelectAll(true)
    }
  }

  // Handle individual order selection
  const handleOrderSelect = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
    
    // Update select all state based on current selection
    const allSelected = filteredOrders.every(order => newSelected.has(order.id))
    setIsSelectAll(allSelected && filteredOrders.length > 0)
  }

  // Handle bulk archive
  const handleBulkArchive = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select orders to archive",
        variant: "destructive",
      })
      return
    }

    setIsBulkArchiving(true)
    const selectedOrderIds = Array.from(selectedOrders)
    let successCount = 0
    let failCount = 0

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in as admin or staff to archive orders.",
          variant: "destructive",
        })
        return
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }

      // Archive orders one by one
      for (const orderId of selectedOrderIds) {
        try {
          const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'DELETE',
            headers,
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
            console.error(`Failed to archive order ${orderId}:`, response.status)
          }
        } catch (error) {
          failCount++
          console.error(`Error archiving order ${orderId}:`, error)
        }
      }

      // Update UI by removing successfully archived orders
      if (successCount > 0) {
        setOrders((prevOrders) => 
          prevOrders.filter((order) => !selectedOrderIds.includes(order.id))
        )
        setSelectedOrders(new Set())
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        toast({
          title: "Bulk Archive Successful",
          description: `Successfully archived ${successCount} order${successCount > 1 ? 's' : ''}`,
        })
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: "Partial Success",
          description: `Archived ${successCount} order${successCount > 1 ? 's' : ''}, failed to archive ${failCount}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Archive Failed",
          description: `Failed to archive ${failCount} order${failCount > 1 ? 's' : ''}`,
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error('Bulk archive error:', error)
      toast({
        title: "Network Error",
        description: "Unable to connect to server. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsBulkArchiving(false)
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
      case "delivered":
        return <CheckCircle className="h-4 w-4" />
      case "returned":
        return <RotateCcw className="h-4 w-4" />
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
      case "delivered":
        return "bg-green-500/10 text-green-600 dark:text-green-400"
      case "returned":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400"
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
      {/* Sync Notification */}
      {lastSyncInfo && (
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-right-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm">
              Order #{lastSyncInfo.orderId} updated by {lastSyncInfo.updatedBy}
            </span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-yellow-500">Orders Management</h1>
          <p className="text-muted-foreground mt-1">Manage and track customer orders from G-Kicks</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => loadOrders()} disabled={isLoading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Badge variant="outline" className="text-xs">
            {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
          </Badge>
        </div>
      </div>

      {/* Search and Category Tabs */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders by customer name, email, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            
            {/* Category Tabs */}
            <Tabs value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as typeof categoryFilter)}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  All
                  <Badge variant="secondary" className="text-xs">
                    {orders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="ongoing" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ongoing
                  <Badge variant="secondary" className="text-xs">
                    {ongoingOrders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending_cancellation" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Pending Cancellation
                  <Badge variant="destructive" className="text-xs">
                    {pendingCancellationOrders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="delivered" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Delivered
                  <Badge variant="secondary" className="text-xs">
                    {deliveredOrders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="returned" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Returned
                  <Badge variant="secondary" className="text-xs">
                    {returnedOrders.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Cancelled
                  <Badge variant="secondary" className="text-xs">
                    {cancelledOrders.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Order Source Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Order Source:</label>
              <Select value={orderSourceFilter} onValueChange={(value) => setOrderSourceFilter(value as typeof orderSourceFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Customer Orders</CardTitle>
              <CardDescription className="text-muted-foreground">
                {filteredOrders.length === 0 && orders.length === 0
                  ? "No orders found - orders will appear here when customers make purchases"
                  : filteredOrders.length === 0
                    ? "No orders match your filters"
                    : `Showing ${filteredOrders.length} of ${orders.length} orders`}
              </CardDescription>
            </div>
            {filteredOrders.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={isSelectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Select All
                  </label>
                </div>
                {selectedOrders.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkArchive}
                    disabled={isBulkArchiving}
                    className="flex items-center gap-2"
                  >
                    {isBulkArchiving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Archive Selected ({selectedOrders.size})
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
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
              {searchTerm || categoryFilter !== "all" || orderSourceFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setCategoryFilter("all")
                    setOrderSourceFilter("all")
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
                  key={`${order?.id ?? 'no-id'}-${index}`}
                  className={`border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-all duration-300 bg-card ${
                    highlightOrderId === String(order?.id ?? '') 
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg ring-2 ring-yellow-400/50' 
                      : 'border-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => handleOrderSelect(order.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground">#{order.order_number}</h3>
                            <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 text-xs`}>
                              {getStatusIcon(order.status)}
                              <span className="hidden xs:inline">{order.status}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate pr-2">{order.customerName || "Unknown Customer"}</p>
                          <p className="text-xs text-muted-foreground truncate pr-2">{order.customerEmail || "No email"}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant={order.order_source === 'walk-in' ? 'secondary' : 'outline'} className="text-xs">
                              {order.order_source === 'walk-in' ? '🏪 Walk-in' : '🌐 Online'}
                            </Badge>
                          </div>
                        </div>
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
                      
                      {/* Show approve/reject buttons for pending cancellation orders */}
                      {order.status === 'pending_cancellation' ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancellationApproval(order.id, 'approve'); }}
                            disabled={isUpdatingStatus[order.id]}
                            className="w-full xs:w-auto"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {isUpdatingStatus[order.id] ? 'Processing...' : 'Approve Cancellation'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancellationApproval(order.id, 'reject'); }}
                            disabled={isUpdatingStatus[order.id]}
                            className="w-full xs:w-auto border-green-500 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {isUpdatingStatus[order.id] ? 'Processing...' : 'Reject Cancellation'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOrderToArchive(order); setIsArchiveDialogOpen(true); }}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950 w-full xs:w-auto"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      )}
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
            <DialogTitle className="text-foreground text-base sm:text-lg flex items-center gap-2">
              Order Details - #{selectedOrder?.order_number || ''}
              {selectedOrder && (
                <Badge variant={selectedOrder.order_source === 'walk-in' ? 'secondary' : 'outline'} className="text-xs">
                  {selectedOrder.order_source === 'walk-in' ? '🏪 Walk-in' : '🌐 Online'}
                </Badge>
              )}
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
                    const buttonStates = getButtonStates(selectedOrder.status)
                    const isCurrentOrderUpdating = isUpdatingStatus[selectedOrder.id]
                    
                    return ["pending", "confirmed", "processing", "shipped", "cancelled"].map((status) => {
                      const buttonState = buttonStates[status]
                      const isCurrentStatus = selectedOrder.status === status
                      const isEnabled = buttonState?.enabled && !isCurrentOrderUpdating
                      const shouldDisable = !isEnabled
                      
                      // Special styling for current status and final states
                      const isCancelledStatus = status === "cancelled" && isCurrentStatus
                      const isDeliveredStatus = status === "delivered" && isCurrentStatus
                      
                      return (
                        <Button
                          key={status}
                          variant={isCurrentStatus ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusUpdate(selectedOrder.id, status as Order["status"])}
                          disabled={shouldDisable}
                          title={buttonState?.reason || (isCurrentStatus ? "Current status" : "")}
                          className={`flex items-center gap-1 text-xs transition-all ${
                            isCancelledStatus 
                              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                              : isDeliveredStatus
                                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                                : shouldDisable 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:scale-105'
                          }`}
                        >
                          {isCurrentOrderUpdating ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              <span className="hidden xs:inline">Updating...</span>
                            </>
                          ) : (
                            <>
                              {getStatusIcon(status)}
                              <span className="capitalize whitespace-nowrap text-xs sm:text-sm">{status}</span>
                            </>
                          )}
                        </Button>
                      )
                    })
                  })()}
                </div>
                
                {/* Status Flow Information */}
                <div className="mt-3 p-3 bg-muted/30 border border-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-foreground">Order Status Flow</span>
                  </div>
                  {selectedOrder.status === "delivered" || selectedOrder.status === "cancelled" || selectedOrder.status === "returned" || selectedOrder.status === "pending_cancellation" ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.status === "delivered" 
                      ? "✅ Order completed - Status cannot be changed" 
                      : selectedOrder.status === "returned"
                        ? "🔄 Order returned - Status cannot be changed"
                        : selectedOrder.status === "pending_cancellation"
                          ? "⏳ Cancellation pending - Awaiting admin approval"
                          : "❌ Order cancelled - Status cannot be changed"
                    }
                  </p>
                ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Current: <span className="font-medium capitalize text-foreground">{selectedOrder.status}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Flow: Pending → Confirmed → Processing → Shipped → Delivered
                      </p>
                      <p className="text-xs text-muted-foreground">
                        • Only next status in sequence is available
                        • Cannot go backwards in the flow
                        • Can cancel at any time before delivery
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedOrder.status === "delivered" && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm text-green-800 font-medium">
                            Order Delivered Successfully
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            This order has been completed and delivered to the customer.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturnConfirmation(selectedOrder.id)}
                        disabled={isUpdatingStatus[selectedOrder.id]}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950 dark:border-orange-800"
                      >
                        {isUpdatingStatus[selectedOrder.id] ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Confirm Return
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {selectedOrder.status === "returned" && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-orange-600" />
                      <p className="text-sm text-orange-800 font-medium">
                        Order Returned
                      </p>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      This order has been returned by the customer and processed.
                    </p>
                  </div>
                )}
                {selectedOrder.status === "pending_cancellation" && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-800 font-medium">
                            Cancellation Request Pending
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Customer has requested to cancel this order. Please review and approve or reject.
                          </p>
                          {(selectedOrder as any).cancellation_reason && (
                            <p className="text-xs text-yellow-700 mt-1">
                              <strong>Reason:</strong> {(selectedOrder as any).cancellation_reason}
                            </p>
                          )}
                          {(selectedOrder as any).cancellation_requested_at && (
                            <p className="text-xs text-yellow-700 mt-1">
                              <strong>Requested:</strong> {new Date((selectedOrder as any).cancellation_requested_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancellationApproval(selectedOrder.id, 'approve')}
                          disabled={isUpdatingStatus[selectedOrder.id]}
                        >
                          {isUpdatingStatus[selectedOrder.id] ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancellationApproval(selectedOrder.id, 'reject')}
                          disabled={isUpdatingStatus[selectedOrder.id]}
                          className="border-green-500 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                        >
                          {isUpdatingStatus[selectedOrder.id] ? (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2 text-foreground text-sm sm:text-base">Shipping Address</h4>
                <div className="bg-muted p-3 rounded-lg">
                  {selectedOrder.shippingAddress ? (
                    <>
                      <p className="text-foreground text-sm">{(selectedOrder.shippingAddress as any).fullName || 'N/A'}</p>
                      <p className="text-foreground text-sm">{(selectedOrder.shippingAddress as any).street || 'N/A'}</p>
                      {(selectedOrder.shippingAddress as any).barangay && (
                        <p className="text-foreground text-sm">{(selectedOrder.shippingAddress as any).barangay}</p>
                      )}
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
