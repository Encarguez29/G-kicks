import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/database/mysql';
import { executeQuery as executeQueryMySQL } from '../../../lib/database/mysql';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to get user from token
async function getUserFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ PRODUCTS: No valid authorization header found');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('🔍 PRODUCTS: Received token length:', token.length);
    console.log('🔍 PRODUCTS: Token preview:', token.substring(0, 50) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string, role: string };
    console.log('✅ PRODUCTS: Token verified successfully for user:', decoded.userId, 'role:', decoded.role);
    return { id: decoded.userId, email: decoded.email, role: decoded.role };
  } catch (error) {
    console.error('❌ PRODUCTS: Token verification failed:', error);
    console.error('❌ PRODUCTS: Token verification failed - no token available');
    return null;
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      brand,
      price,
      original_price,
      category,
      sku,
      stock_quantity,
      low_stock_threshold,
      status,
      image_url,
      gallery_images,
      description,
      is_active,
      is_new,
      is_sale,
      colors,
      sizes,
      model_3d_url,
      model_3d_filename,
      subtitle
    } = body;

    // Generate slug from product name
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim()
        .substring(0, 255); // Limit to 255 characters
    };
    
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    
    // Check if slug already exists and make it unique
    let slugCounter = 1;
    while (true) {
      const existingProduct = await executeQueryMySQL(
        'SELECT id FROM products WHERE slug = ? LIMIT 1',
        [slug]
      );
      
      if (!existingProduct || (existingProduct as any[]).length === 0) {
        break; // Slug is unique
      }
      
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Validate required fields
    if (!name || !brand || !price || !category) {
      return NextResponse.json(
        { error: 'Name, brand, price, and category are required' },
        { status: 400 }
      );
    }

    // Generate SKU if empty
    const finalSku = sku && sku.trim() !== '' ? sku : `${brand.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    console.log('🔄 API: Creating new product:', name);

    // Create product in MySQL database
    const insertQuery = `
      INSERT INTO products (
        name, slug, brand, price, original_price, category, sku, stock_quantity, low_stock_threshold,
        image_url, gallery_images, description, short_description, is_active, is_new, is_sale,
        colors, sizes, model_3d_url, model_3d_filename, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )
    `;

    const params = [
      name,
      slug,
      brand,
      parseFloat(price),
      original_price ? parseFloat(original_price) : null,
      category,
      finalSku,
      parseInt(stock_quantity) || 0,
      parseInt(low_stock_threshold) || 10,
      image_url || '/placeholder-product.jpg',
      JSON.stringify(gallery_images || []),
      description || '',
      subtitle || '', // short_description
      is_active !== false,
      is_new || false,
      is_sale || false,
      JSON.stringify(colors || []),
      JSON.stringify(sizes || []),
      model_3d_url || null,
      model_3d_filename || null
    ];

    const result = await executeQueryMySQL(insertQuery, params);

    console.log('✅ API: Product created successfully with ID:', (result as any).insertId);

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      productId: (result as any).insertId
    });

  } catch (error) {
    console.error('❌ API: Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Fetching products from MySQL database...');
    
    const query = `
      SELECT * FROM products 
      WHERE is_active = 1 AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `;
    
    const data = await executeQueryMySQL(query);

    const dataArray = data as any[];
    if (!dataArray || dataArray.length === 0) {
      console.log('📦 API: No products found in database');
      return NextResponse.json([]);
    }

    console.log(`✅ API: Successfully fetched ${dataArray.length} products from MySQL database`);
    
    // Debug logging for image URLs
    console.log('🔍 Products API - Debug image URLs:');
    dataArray.forEach((product: any, index: number) => {
      console.log(`Product ${index + 1} (ID: ${product.id}):`);
      console.log(`  - Name: ${product.name}`);
      console.log(`  - Image URL: ${product.image_url || 'NULL/EMPTY'}`);
      console.log(`  - Has image: ${!!product.image_url}`);
    });
    
    // Map the data to ensure it matches our Product interface
    const products = dataArray.map((item: any) => {
      let colors = [];
      let colorImages = {};
      let galleryImages = [];
      
      try {
        colors = item.colors ? JSON.parse(item.colors) : [];
      } catch (e) {
        console.warn('Failed to parse colors for product', item.id, ':', e);
        colors = [];
      }
      
      try {
        colorImages = item.color_images ? JSON.parse(item.color_images) : {};
      } catch (e) {
        console.warn('Failed to parse color_images for product', item.id, ':', e);
        colorImages = {};
      }
      
      try {
        galleryImages = item.gallery_images ? JSON.parse(item.gallery_images) : [];
      } catch (e) {
        console.warn('Failed to parse gallery_images for product', item.id, ':', e);
        galleryImages = [];
      }
      
      let sizes: string[] = [];
      try {
        sizes = item.sizes ? JSON.parse(item.sizes) : [];
      } catch (e) {
        console.warn('Failed to parse sizes for product', item.id, ':', e);
        sizes = [];
      }

      let variants: Record<string, Record<string, number>> = {};
      try {
        variants = item.variants ? JSON.parse(item.variants) : {};
      } catch (e) {
        console.warn('Failed to parse variants for product', item.id, ':', e);
        variants = {};
      }
      
      return {
        id: item.id,
        name: item.name || 'Unknown Product',
        brand: item.brand || 'Unknown Brand',
        price: parseFloat(item.price) || 0,
        original_price: item.original_price ? parseFloat(item.original_price) : undefined,
        description: item.description || '',
        image_url: item.image_url || '/placeholder-product.jpg',
        rating: item.rating || 0,
        reviews: item.reviews || 0,
        colors,
        colorImages,
        gallery_images: galleryImages,
        isNew: Boolean(item.is_new),
        isSale: Boolean(item.is_sale),
        views: item.views || 0,
        category: item.category || 'men',
        gender: item.gender || 'men',
        sku: item.sku || '',
        stock_quantity: parseInt(item.stock_quantity) || 0,
        low_stock_threshold: parseInt(item.low_stock_threshold) || 10,
        sizes: item.sizes ? JSON.parse(item.sizes) : [],
        variants: item.variants ? JSON.parse(item.variants) : {},
        created_at: item.created_at,
        updated_at: item.updated_at,
        isDeleted: false,
        isActive: Boolean(item.is_active),
        status: item.status || 'Active',
        model_3d_url: item.model_3d_url || null,
        model_3d_filename: item.model_3d_filename || null,
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('❌ API: Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      brand,
      price,
      original_price,
      category,
      sku,
      stock_quantity,
      image_url,
      gallery_images,
      description,
      is_active,
      is_new,
      is_sale,
      colors,
      sizes
    } = body;

    // Validate required fields
    if (!name || !brand || !price || !category) {
      return NextResponse.json(
        { error: 'Name, brand, price, and category are required' },
        { status: 400 }
      );
    }

    // Generate SKU if empty to avoid duplicate key error
    const finalSku = sku && sku.trim() !== '' ? sku : `${brand.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    console.log('🔄 API: Updating product:', productId);

    // Update product in MySQL database
    const updateQuery = `
      UPDATE products SET
        name = ?,
        brand = ?,
        price = ?,
        original_price = ?,
        category = ?,
        sku = ?,
        stock_quantity = ?,
        image_url = ?,
        gallery_images = ?,
        description = ?,
        is_active = ?,
        is_new = ?,
        is_sale = ?,
        colors = ?,
        sizes = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const params = [
      name,
      brand,
      parseFloat(price),
      original_price ? parseFloat(original_price) : null,
      category,
      finalSku,
      parseInt(stock_quantity) || 0,
      image_url,
      JSON.stringify(gallery_images || []),
      description,
      is_active,
      is_new || false,
      is_sale || false,
      JSON.stringify(colors || []),
      JSON.stringify(sizes || []),
      parseInt(productId)
    ];

    const result = await executeQueryMySQL(updateQuery, params);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Product not found or no changes made' },
        { status: 404 }
      );
    }

    console.log('✅ API: Product updated successfully:', productId);

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      productId: parseInt(productId)
    });

  } catch (error) {
    console.error('❌ API: Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}