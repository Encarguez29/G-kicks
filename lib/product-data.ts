// lib/product-data.ts
"use client";

// Database operations are now handled via API routes

export interface Product {
  description: string;
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  image_url: string;
  gallery_images?: string[];
  model_3d_url?: string;
  model_3d_filename?: string;
  rating: number;
  reviews: number;
  colors: string[];
  sizes?: string[];
  colorImages?: Record<
    string,
    { front?: string; side?: string; back?: string; sole?: string; three_d?: string }
  >;
  isNew?: boolean;
  isSale?: boolean;
  views: number;
  category: "men" | "women" | "kids";
  isDeleted?: boolean;
  isActive?: boolean;
  is_new?: boolean;
  is_sale?: boolean;
  variants?: Record<string, Record<string, number>>;
}

const PRODUCTS_STORAGE_KEY = "homepage_products";

export let products: Product[] = [];

function loadProducts(): Product[] {
  if (typeof window === "undefined") return products;

  try {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (stored) {
      const loadedProducts = JSON.parse(stored);
      if (Array.isArray(loadedProducts) && loadedProducts.length > 0) {
        console.log("Loaded", loadedProducts.length, "products from localStorage");
        return loadedProducts;
      }
    }
  } catch (error) {
    console.error("Error loading products from localStorage:", error);
  }
  return products;
}

export function saveProducts(productsToSave: Product[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(productsToSave));
    products = productsToSave;
    window.dispatchEvent(new CustomEvent("productsUpdated", { detail: { products: productsToSave } }));
    console.log("Saved", productsToSave.length, "products to localStorage");
  } catch (error) {
    console.error("Error saving products to localStorage:", error);
  }
}

export async function fetchProductsFromAPI(): Promise<Product[]> {
  try {
    console.log('🔍 Fetching products from API...');
    
    const response = await fetch('/api/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const products: Product[] = await response.json();

    console.log(`✅ Successfully fetched ${products.length} products from API`);
    return products;
  } catch (error) {
    console.error('❌ Error in fetchProductsFromAPI:', error);
    throw error;
  }
}

export async function syncWithAdminInventory(): Promise<Product[]> {
  if (typeof window === "undefined") return [];

  try {
    const productsFromAPI = await fetchProductsFromAPI();
    if (productsFromAPI.length > 0) {
      saveProducts(productsFromAPI);
      console.log("Synced", productsFromAPI.length, "products from API");
    }
    return productsFromAPI;
  } catch (error) {
    console.error("Error syncing with Supabase inventory:", error);
    return [];
  }
}

export function getActiveProducts(): Product[] {
  return loadProducts().filter((p) => !p.isDeleted && p.isActive !== false);
}

export function getProductById(id: number): Product | undefined {
  const product = loadProducts().find((p) => p.id === id);
  return product && !product.isDeleted && product.isActive !== false ? product : undefined;
}

export async function fetchProductByIdFromAPI(id: number): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error("API fetch product by ID error:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      brand: data.brand,
      price: data.price,
      originalPrice: data.original_price,
      description: data.description || "",
      image: data.image_url || `/images/${data.name.toLowerCase().replace(/\s+/g, "-")}.png`,
      image_url: data.image_url || `/images/${data.name.toLowerCase().replace(/\s+/g, "-")}.png`,
      gallery_images: data.gallery_images || [],
      model_3d_url: data.model_3d_url,
      model_3d_filename: data.model_3d_filename,
      rating: data.rating || 0,
      reviews: data.reviews || 0,
      colors: data.colors || [],
      sizes: data.sizes || [],
      colorImages: data.color_images || {},
      variants: data.variants || {},
      isNew: data.is_new || false,
      isSale: data.is_sale || false,
      views: data.views || 0,
      category: data.category,
      isDeleted: false,
      isActive: data.is_active,
    };
  } catch (error) {
    console.error("Unexpected error fetching product by ID from API:", error);
    return null;
  }
}

// --- User-product views tracking ---

/**
 * Returns true if the user has already viewed this product.
 * Uses .maybeSingle() so that if no row exists, data === null instead of a 406 error.
 */
export async function hasUserViewedProduct(userId: string, productId: number): Promise<boolean> {
  if (!userId) return false;

  try {
    const response = await fetch('/api/products/check-view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, userId }),
    });

    if (!response.ok) {
      console.error('Error checking user view:', response.status);
      return false;
    }

    const data = await response.json();
    return data.hasViewed || false;
  } catch (error) {
    console.error('Error checking user view:', error);
    return false;
  }
}

/**
 * Records a view via your RLS-enabled RPC, then fetches & updates the new view count.
 */
export async function updateViewCount(productId: number, userId: string): Promise<number> {
  if (!userId) return 0;

  try {
    // Call API to update view count
    const response = await fetch('/api/products/update-views', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, userId }),
    });

    if (!response.ok) {
      console.error('Error updating view count:', response.status);
      return 0;
    }

    const data = await response.json();
    const newViewCount = data.views || 0;

    // Update local cache
    const cached = loadProducts();
    const idx = cached.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      cached[idx].views = newViewCount;
      saveProducts(cached);
    }

    return newViewCount;
  } catch (error) {
    console.error('Error updating view count:', error);
    return 0;
  }
}
