// lib/admin-data.ts
"use client";

// Removed Supabase import - using local MySQL simulator
import { products } from "@/lib/product-data"; // Import local cached products list

/** PRODUCT / INVENTORY TYPES & FUNCTIONS **/

export interface ProductInventory {
  id: number;
  name: string;
  subtitle?: string;
  sku?: string;
  category: string;
  brand: string;
  price: number;
  originalPrice: number;
  image?: string;
  image_url?: string;
  gallery_images?: string[];
  description?: string;
  is_new?: boolean;
  is_sale?: boolean;
  is_active: boolean;
  low_stock_threshold?: number;
  colors?: string[]; // Array of colors
  variants?: Record<string, Record<string, number>>; // { color: { size: quantity } }
}

export async function getInventoryData() {
  // your logic here
  return [];
}

export async function getDailySales() {
  // your logic here
  return [];
}

export async function updateDailySales() {
  // your logic here
}

// Fetch all active products from local data
export async function fetchInventory(): Promise<ProductInventory[]> {
  // Use local product data for now
  return products.map(product => ({
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    price: product.price,
    originalPrice: product.originalPrice || product.price,
    image: product.image,
    description: product.description,
    is_new: product.isNew,
    is_sale: product.isSale,
    is_active: true,
    colors: product.colors
  }));
}

// Add new product (placeholder - use MySQL simulator API)
export async function addProduct(
  product: Omit<ProductInventory, "id">
): Promise<boolean> {
  try {
    // TODO: Implement with MySQL simulator API
    console.log("Adding product:", product);
    return true;
  } catch (error) {
    console.error("Error in addProduct:", error);
    return false;
  }
}

// Update product (placeholder - use MySQL simulator API)
export async function updateProduct(
  productId: number,
  updates: Partial<ProductInventory>
): Promise<boolean> {
  try {
    // TODO: Implement with MySQL simulator API
    console.log("Updating product:", productId, updates);
    return true;
  } catch (error) {
    console.error("Error in updateProduct:", error);
    return false;
  }
}

// Soft delete product (placeholder - use MySQL simulator API)
export async function deleteProduct(productId: number): Promise<boolean> {
  try {
    // TODO: Implement with MySQL simulator API
    console.log("Deleting product:", productId);
    await syncToHomepage();
    return true;
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    return false;
  }
}

// Check stock for given product/color/size by fetching from database
export async function checkStock(
  productId: number,
  color: string,
  size: string
): Promise<number> {
  try {
    // Fetch product data from database API
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      console.error('Failed to fetch product data for stock check');
      return 0;
    }
    
    const product = await response.json();
    if (!product) return 0;
    
    // Check if product has variants (size/color specific stock)
    if (product.variants && product.variants[color] && product.variants[color][size] !== undefined) {
      return product.variants[color][size] || 0;
    }
    
    // If product has variants structure but this specific color/size combo doesn't exist,
    // and the general stock_quantity is > 0, assume this size is available
    if (product.variants && Object.keys(product.variants).length > 0) {
      // If general stock is available, assume reasonable stock for missing variants
      return product.stock_quantity > 0 ? Math.min(product.stock_quantity, 10) : 0;
    }
    
    // Fall back to general stock_quantity if no variants structure exists
    return product.stock_quantity || 10;
  } catch (error) {
    console.error('Error checking stock:', error);
    return 0;
  }
}

// Update stock
export async function updateStock(
  productId: number,
  color: string,
  size: string,
  delta: number
): Promise<number> {
  try {
    // First get current stock
    const currentStock = await checkStock(productId, color, size);
    const newQty = Math.max(0, currentStock + delta);

    // Get current product data to update variants
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) {
      console.error('Failed to fetch product for stock update');
      return 0;
    }
    
    const product = await response.json();
    if (!product) return 0;

    // Update variants structure
    const updatedVariants = {
      ...product.variants,
      [color]: {
        ...product.variants[color],
        [size]: newQty,
      },
    };

    // Update product in database via API
    const updateResponse = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        variants: JSON.stringify(updatedVariants),
        stock_quantity: newQty // Also update general stock quantity
      }),
    });

    if (!updateResponse.ok) {
      console.error('Failed to update stock in database');
      return currentStock;
    }

    console.log("Stock updated successfully:", productId, color, size, newQty);

    // Notify UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent("inventoryUpdate", {
          detail: { productId, color, size, newStock: newQty },
        })
      );
    }

    return newQty;
  } catch (error) {
    console.error("Exception in updateStock:", error);
    return 0;
  }
}

// Sync all products to homepage localStorage (using local data)
export async function syncToHomepage(): Promise<void> {
  try {
    const products = await fetchInventory();

    window.dispatchEvent(
      new CustomEvent("adminProductsSync", {
        detail: { products },
      })
    );
  } catch (error) {
    console.error("Error syncing to homepage:", error);
  }
}


/** ORDERS TYPES & FUNCTIONS **/

export interface Order {
  id: string;
  customerName?: string;
  customerEmail?: string;
  items: Array<{
    name: string;
    image?: string;
    size?: string;
    color?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "cancelled";
  orderDate: string; // ISO string
  created_at?: string; // Database field
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
    phone?: string;
  };
  paymentMethod: string;
  payment_screenshot?: string;
  trackingNumber?: string;
}

/**
 * Load all orders from localStorage.
 */
export function getOrders(): Order[] {
  const raw = localStorage.getItem("gkicks-orders");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    console.error("Failed to parse orders JSON");
    return [];
  }
}

/**
 * Update a single order, persist back to localStorage, and emit a storage event.
 */
export function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Order | undefined {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return undefined;

  const updated = { ...orders[idx], ...updates };
  orders[idx] = updated;
  localStorage.setItem("gkicks-orders", JSON.stringify(orders));

  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "gkicks-orders",
      newValue: JSON.stringify(orders),
    })
  );
  return updated;
}
