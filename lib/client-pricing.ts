/**
 * Client-side pricing utilities that call the API endpoint
 * This avoids importing database connections on the client side
 */

interface PricingResult {
  basePrice: number
  finalPrice: number
}

interface PricingResponse {
  calculatedPrices: PricingResult[]
  settings: {
    adminFee: number
    markupPercentage: number
  }
}

// Cache for pricing calculations to avoid repeated API calls
const pricingCache = new Map<string, number>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Calculate final prices for given base prices using the API
 */
export async function calculateFinalPrices(prices: number[]): Promise<PricingResult[]> {
  try {
    const response = await fetch('/api/pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prices }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: PricingResponse = await response.json()
    
    // Cache the results
    data.calculatedPrices.forEach(result => {
      const cacheKey = `${result.basePrice}-${Date.now()}`
      pricingCache.set(cacheKey, result.finalPrice)
    })

    return data.calculatedPrices
  } catch (error) {
    console.error('Error calculating prices via API:', error)
    // Return fallback prices (same as base prices)
    return prices.map(price => ({ basePrice: price, finalPrice: price }))
  }
}

/**
 * Calculate final price for a single base price
 */
export async function calculateFinalPrice(basePrice: number): Promise<number> {
  if (basePrice <= 0) return basePrice

  try {
    const results = await calculateFinalPrices([basePrice])
    return results[0]?.finalPrice || basePrice
  } catch (error) {
    console.error('Error calculating single price:', error)
    return basePrice
  }
}

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number): string {
  return `₱${price.toLocaleString()}`
}

/**
 * Calculate savings between original and current price
 */
export function calculateSavings(originalPrice: number, currentPrice: number): number {
  return Math.max(0, originalPrice - currentPrice)
}