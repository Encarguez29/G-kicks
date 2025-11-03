// lib/order-display-utils.ts
// Client-safe order display utilities (no database dependencies)

/**
 * Generates a stable order ID based on the database ID
 * @param dbId - The database ID of the order
 * @returns Stable order ID string in format 2025000X
 */
export function generateOrderId(dbId: string | number): string {
  const baseId = 2025000
  
  // Convert database ID to a number and use it to generate a stable display ID
  const numericId = typeof dbId === 'string' ? parseInt(dbId, 10) : dbId
  
  // Use the database ID directly to ensure stability
  return (baseId + numericId).toString()
}

/**
 * Legacy function for backward compatibility - generates sequential IDs
 * @param index - The order index (0-based)
 * @param totalCount - Total count of orders
 * @returns Sequential order ID string
 */
export function generateSequentialOrderId(index: number, totalCount?: number): string {
  const baseId = 2025000
  
  // If totalCount is provided, calculate the correct ID for DESC-sorted orders
  // (newest orders first, but we want oldest orders to have lower IDs)
  if (totalCount !== undefined) {
    return (baseId + (totalCount - index)).toString()
  }
  
  // Fallback to original logic for backward compatibility
  return (baseId + index + 1).toString()
}

/**
 * Generates a sequential order ID for display with # prefix
 * @param index - The order index (0-based)
 * @returns Sequential order ID string with # prefix
 */
export function generateDisplayOrderId(index: number): string {
  return `#${generateOrderId(index)}`
}

/**
 * Extracts the numeric part from an order ID
 * @param orderId - The order ID string (with or without #)
 * @returns The numeric order number
 */
export function extractOrderNumber(orderId: string): number {
  const cleanId = orderId.replace('#', '')
  return parseInt(cleanId, 10)
}

/**
 * Converts an order number back to index
 * @param orderNumber - The numeric order number
 * @returns The 0-based index
 */
export function orderNumberToIndex(orderNumber: number): number {
  const baseId = 2025000
  return orderNumber - baseId - 1
}