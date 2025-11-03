// lib/order-utils.ts
// Unified order ID generation utility for all systems

/**
 * Generates a sequential order ID in the format 2025000X
 * @param index - The order index (0-based)
 * @returns Sequential order ID string
 */
export function generateOrderId(index: number): string {
  const baseId = 2025000
  return `${baseId + index + 1}`
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

/**
 * Generates the next order ID by querying the database for the highest existing order number
 * @returns Promise<string> Next sequential order ID with current year prefix
 */
export async function generateNextOrderId(): Promise<string> {
  try {
    const { executeQuery } = await import('@/lib/database/mysql')
    const currentYear = new Date().getFullYear()
    
    // Get the highest order number from the database for the current year
    const result = await executeQuery(`
      SELECT MAX(CAST(SUBSTRING(order_number, 7) AS UNSIGNED)) as max_number 
      FROM orders 
      WHERE order_number LIKE '${currentYear}GK%' AND order_number REGEXP '^${currentYear}GK[0-9]+$'
    `) as any[]
    
    const maxNumber = result[0]?.max_number || 999 // Start from 1000 if no orders exist for this year
    const nextNumber = maxNumber + 1
    
    return `${currentYear}GK${nextNumber}`
  } catch (error) {
    console.error('Error generating next order ID:', error)
    
    // Better fallback: try to get the count of orders for current year and use that as base
    try {
      const { executeQuery } = await import('@/lib/database/mysql')
      const currentYear = new Date().getFullYear()
      const countResult = await executeQuery(`
        SELECT COUNT(*) as count FROM orders 
        WHERE order_number LIKE '${currentYear}GK%'
      `) as any[]
      const orderCount = countResult[0]?.count || 0
      return `${currentYear}GK${1000 + orderCount + 1}`
    } catch (fallbackError) {
      console.error('Fallback order ID generation failed:', fallbackError)
      // Last resort: use timestamp with random suffix to avoid duplicates
      const currentYear = new Date().getFullYear()
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      return `${currentYear}GK${timestamp}${random}`
    }
  }
}

/**
 * Validates if an order ID follows the sequential format with year prefix
 * @param orderId - The order ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidOrderId(orderId: string): boolean {
  const cleanId = orderId.replace('#', '')
  // Check if it matches the new format: YYYYGK#### (e.g., 2025GK1000)
  const yearGkPattern = /^(\d{4})GK(\d+)$/
  const match = cleanId.match(yearGkPattern)
  
  if (match) {
    const year = parseInt(match[1], 10)
    const orderNum = parseInt(match[2], 10)
    const currentYear = new Date().getFullYear()
    
    // Valid if year is reasonable (2020-current+5) and order number >= 1000
    return year >= 2020 && year <= currentYear + 5 && orderNum >= 1000
  }
  
  // Also support legacy format for backward compatibility: GK#### or plain numbers
  if (cleanId.startsWith('GK')) {
    const num = parseInt(cleanId.substring(2), 10)
    return !isNaN(num) && num >= 1000
  }
  
  const num = parseInt(cleanId, 10)
  return !isNaN(num) && num >= 2025001
}

/**
 * Formats currency for display
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString()}`
}