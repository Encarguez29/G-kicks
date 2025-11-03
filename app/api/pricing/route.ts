import { NextRequest, NextResponse } from 'next/server'
import { getPricingSettings, calculatePrice } from '@/lib/pricing-utils'

export async function POST(request: NextRequest) {
  try {
    const { prices } = await request.json()
    
    if (!prices || !Array.isArray(prices)) {
      return NextResponse.json({ error: 'Invalid prices array' }, { status: 400 })
    }

    // Get pricing settings from database
    const settings = await getPricingSettings()
    
    // Calculate final prices for all provided prices
    const calculatedPrices = prices.map(price => ({
      basePrice: price,
      finalPrice: calculatePrice(price, settings)
    }))

    return NextResponse.json({ 
      calculatedPrices,
      settings: {
        adminFee: settings.admin_fee,
        markupPercentage: settings.markup_percentage
      }
    })
  } catch (error) {
    console.error('Error calculating prices:', error)
    return NextResponse.json({ error: 'Failed to calculate prices' }, { status: 500 })
  }
}