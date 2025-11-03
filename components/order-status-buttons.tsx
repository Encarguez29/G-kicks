"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, Package, Truck, XCircle, RefreshCw } from "lucide-react"

// Type definitions
type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"

interface OrderStatusButtonsProps {
  currentStatus: OrderStatus
  onStatusUpdate: (newStatus: OrderStatus) => void
  isUpdating?: boolean
  disabled?: boolean
  showStatusInfo?: boolean
  className?: string
}

// Helper function to get status icon
const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return <Clock className="w-3 h-3 mr-1" />
    case "confirmed":
      return <CheckCircle className="w-3 h-3 mr-1" />
    case "processing":
      return <Package className="w-3 h-3 mr-1" />
    case "shipped":
      return <Truck className="w-3 h-3 mr-1" />
    case "delivered":
      return <CheckCircle className="w-3 h-3 mr-1" />
    case "cancelled":
      return <XCircle className="w-3 h-3 mr-1" />
    default:
      return null
  }
}

// Helper function to determine button states based on current order status
const getButtonStates = (currentStatus: OrderStatus) => {
  const statusFlow: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"]
  const currentIndex = statusFlow.indexOf(currentStatus)
  
  // If order is delivered or cancelled, disable all buttons
  if (currentStatus === "delivered" || currentStatus === "cancelled") {
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
  const buttonStates: Record<OrderStatus, { enabled: boolean; reason?: string }> = {} as any
  
  statusFlow.forEach((status, index) => {
    if (status === currentStatus) {
      // Current status - disabled (already at this status)
      buttonStates[status] = { enabled: false, reason: "Current status" }
    } else if (index < currentIndex) {
      // Previous statuses - disabled (cannot go backwards)
      buttonStates[status] = { enabled: false, reason: "Cannot go backwards" }
    } else if (index === currentIndex + 1) {
      // Next status - enabled
      buttonStates[status] = { enabled: true }
    } else {
      // Future statuses - disabled (must follow sequence)
      buttonStates[status] = { enabled: false, reason: "Must follow sequence" }
    }
  })
  
  // Cancelled is always available for ongoing orders (except delivered)
  buttonStates.cancelled = { 
    enabled: (currentStatus as OrderStatus) !== "delivered" && (currentStatus as OrderStatus) !== "cancelled",
    reason: (currentStatus as OrderStatus) === "delivered" || (currentStatus as OrderStatus) === "cancelled" ? "Order is finalized" : undefined
  }
  
  return buttonStates
}

export const OrderStatusButtons: React.FC<OrderStatusButtonsProps> = ({
  currentStatus,
  onStatusUpdate,
  isUpdating = false,
  disabled = false,
  showStatusInfo = true,
  className = ""
}) => {
  const buttonStates = getButtonStates(currentStatus)
  const allStatuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Update Buttons */}
      <div>
        <h4 className="font-medium mb-2 text-foreground text-sm sm:text-base">Update Order Status</h4>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {allStatuses.map((status) => {
            const buttonState = buttonStates[status]
            const isCurrentStatus = currentStatus === status
            const isEnabled = buttonState?.enabled && !isUpdating && !disabled
            const shouldDisable = !isEnabled
            
            // Special styling for current status and final states
            const isCancelledStatus = status === "cancelled" && isCurrentStatus
            const isDeliveredStatus = status === "delivered" && isCurrentStatus
            
            return (
              <Button
                key={status}
                variant={isCurrentStatus ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusUpdate(status)}
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
                {isUpdating ? (
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
          })}
        </div>
      </div>

      {/* Status Flow Information */}
      {showStatusInfo && (
        <div className="p-3 bg-muted/30 border border-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm font-medium text-foreground">Order Status Flow</span>
          </div>
          {currentStatus === "delivered" || currentStatus === "cancelled" ? (
            <p className="text-xs text-muted-foreground">
              {currentStatus === "delivered" 
                ? "✅ Order completed - Status cannot be changed" 
                : "❌ Order cancelled - Status cannot be changed"
              }
            </p>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium capitalize text-foreground">{currentStatus}</span>
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
      )}
    </div>
  )
}

// Example usage component
export const OrderStatusExample: React.FC = () => {
  const [orderStatus, setOrderStatus] = React.useState<OrderStatus>("pending")
  const [isUpdating, setIsUpdating] = React.useState(false)

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setOrderStatus(newStatus)
    setIsUpdating(false)
    
    console.log(`Order status updated to: ${newStatus}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Order Status Management</h2>
        <p className="text-muted-foreground">
          Current Status: <span className="font-semibold capitalize">{orderStatus}</span>
        </p>
      </div>
      
      <OrderStatusButtons
        currentStatus={orderStatus}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={isUpdating}
        showStatusInfo={true}
      />
      
      {/* Reset button for demo */}
      <div className="text-center pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => setOrderStatus("pending")}
          disabled={isUpdating}
        >
          Reset to Pending (Demo)
        </Button>
      </div>
    </div>
  )
}

export default OrderStatusButtons