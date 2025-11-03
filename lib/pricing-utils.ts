import { executeQuery } from './database/mysql';

export interface PricingSettings {
  admin_fee: number;
  markup_percentage: number;
}

export interface ProductPricing {
  price: number;
  originalPrice?: number;
}

// Cache for pricing settings to avoid frequent database calls
let pricingSettingsCache: PricingSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches pricing settings from the database with caching
 */
export async function getPricingSettings(): Promise<PricingSettings> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (pricingSettingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return pricingSettingsCache;
  }

  try {
    // Create pricing_settings table if it doesn't exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS pricing_settings (
        id INT PRIMARY KEY DEFAULT 1,
        admin_fee DECIMAL(10,2) DEFAULT 0,
        markup_percentage DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const result = await executeQuery(`
      SELECT admin_fee, markup_percentage 
      FROM pricing_settings 
      WHERE id = 1
    `);
    
    let settings: PricingSettings;
    
    if (!Array.isArray(result) || result.length === 0) {
      // Initialize with default values if no settings exist
      await executeQuery(`
        INSERT INTO pricing_settings (id, admin_fee, markup_percentage)
        VALUES (1, 0, 0)
      `);
      
      settings = { admin_fee: 0, markup_percentage: 0 };
    } else {
      const row = result[0] as any;
      settings = {
        admin_fee: parseFloat(row.admin_fee) || 0,
        markup_percentage: parseFloat(row.markup_percentage) || 0
      };
    }

    // Update cache
    pricingSettingsCache = settings;
    cacheTimestamp = now;
    
    return settings;
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    // Return default settings on error
    return { admin_fee: 0, markup_percentage: 0 };
  }
}

/**
 * Calculates the final price with admin fee, markup, and VAT applied
 * Formula: Final Price = ((Base Price + Admin Fee) * (1 + Markup/100)) * (1 + VAT)
 * This matches the exact calculation used in the admin inventory
 */
export function calculatePrice(basePrice: number, settings: PricingSettings): number {
  if (basePrice <= 0) return basePrice;
  
  const { admin_fee, markup_percentage } = settings;
  
  // Step 1: Add admin fee to base price
  const priceWithAdminFee = basePrice + admin_fee;
  
  // Step 2: Apply markup percentage
  const priceWithMarkup = priceWithAdminFee * (1 + markup_percentage / 100);
  
  // Step 3: Apply 12% VAT (same as admin)
  const finalPriceWithVAT = priceWithMarkup * (1 + 0.12);
  
  return Math.round(finalPriceWithVAT * 100) / 100; // Round to 2 decimal places
}

/**
 * Applies pricing calculations to a product's pricing data
 */
export async function applyPricingToProduct(productPricing: ProductPricing): Promise<ProductPricing> {
  const settings = await getPricingSettings();
  
  return {
    price: calculatePrice(productPricing.price, settings),
    originalPrice: productPricing.originalPrice 
      ? calculatePrice(productPricing.originalPrice, settings)
      : undefined
  };
}

/**
 * Applies pricing calculations to multiple products
 */
export async function applyPricingToProducts(products: any[]): Promise<any[]> {
  const settings = await getPricingSettings();
  
  return products.map(product => ({
    ...product,
    price: calculatePrice(product.price, settings),
    originalPrice: product.originalPrice 
      ? calculatePrice(product.originalPrice, settings)
      : product.originalPrice
  }));
}

/**
 * Clears the pricing settings cache (useful for testing or when settings are updated)
 */
export function clearPricingCache(): void {
  pricingSettingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Gets the current cached pricing settings without fetching from database
 */
export function getCachedPricingSettings(): PricingSettings | null {
  const now = Date.now();
  
  if (pricingSettingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return pricingSettingsCache;
  }
  
  return null;
}