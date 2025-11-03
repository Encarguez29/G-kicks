import mysql from 'mysql2/promise';

// MySQL connection configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gkicks',
  ssl: process.env.MYSQL_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined,
  connectionLimit: 10,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection function
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    return false;
  }
}

// Execute query function
export async function executeQuery(query: string, params: (string | number | boolean | null)[] = []): Promise<any> {
  try {
    console.log('🔍 DB: Executing query:', query.substring(0, 100) + '...')
    console.log('🔍 DB: Query params:', params)
    const [results] = await pool.execute(query, params);
    console.log('✅ DB: Query executed successfully, rows affected:', Array.isArray(results) ? results.length : 'N/A')
    return results;
  } catch (error) {
    console.error('❌ DB: MySQL query failed:', error);
    console.error('❌ DB: Failed query:', query);
    console.error('❌ DB: Failed params:', params);
    throw error;
  }
}

// Execute non-prepared statement (for transaction control commands)
export async function executeNonPreparedQuery(query: string): Promise<any> {
  try {
    console.log('🔍 DB: Executing non-prepared query:', query)
    const [results] = await pool.query(query);
    console.log('✅ DB: Non-prepared query executed successfully')
    return results;
  } catch (error) {
    console.error('❌ DB: Non-prepared MySQL query failed:', error);
    console.error('❌ DB: Failed query:', query);
    throw error;
  }
}

// Get all products
export async function getAllProducts() {
  const query = `
    SELECT 
      id, name, brand, description, price, original_price,
      image_url, rating, reviews, colors, color_images,
      is_new, is_sale, views, category, stock_quantity,
      sku, is_active, model_3d_url, model_3d_filename,
      created_at, updated_at
    FROM products 
    WHERE is_active = 1 AND is_deleted = 0
    ORDER BY created_at DESC
  `;
  
  const results = await executeQuery(query);
  
  // Debug logging for image URLs
  console.log('🔍 MySQL getAllProducts - Debug image URLs:');
  if (Array.isArray(results) && results.length > 0) {
    results.forEach((product: any, index: number) => {
      console.log(`Product ${index + 1} (ID: ${product.id}):`);
      console.log(`  - Name: ${product.name}`);
      console.log(`  - Image URL: ${product.image_url || 'NULL/EMPTY'}`);
      console.log(`  - Has image: ${!!product.image_url}`);
    });
  } else {
    console.log('No products returned from database');
  }
  
  return results;
}

// Get product by ID
export async function getProductById(id: number) {
  const query = `
    SELECT 
      id, name, brand, description, price, original_price,
      image_url, rating, reviews, colors, color_images,
      is_new, is_sale, views, category, stock_quantity,
      sku, is_active, model_3d_url, model_3d_filename,
      created_at, updated_at
    FROM products 
    WHERE id = ? AND is_active = 1 AND is_deleted = 0
  `;
  
  const results = await executeQuery(query, [id]) as any[];
  return results[0] || null;
}

// Insert new product
export async function insertProduct(product: any) {
  const query = `
    INSERT INTO products (
      name, brand, description, price, original_price,
      image_url, rating, reviews, colors, color_images,
      is_new, is_sale, views, category, stock_quantity,
      sku, is_active, model_3d_url, model_3d_filename
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    product.name, product.brand, product.description,
    product.price, product.original_price, product.image_url,
    product.rating, product.reviews, JSON.stringify(product.colors),
    JSON.stringify(product.color_images), product.is_new,
    product.is_sale, product.views, product.category,
    product.stock_quantity, product.sku, product.is_active,
    product.model_3d_url, product.model_3d_filename
  ];
  
  return await executeQuery(query, params);
}

// Update product
export async function updateProduct(id: number, product: any) {
  const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  const query = `
    UPDATE products SET
      name = ?, brand = ?, description = ?, price = ?,
      original_price = ?, image_url = ?, rating = ?,
      reviews = ?, colors = ?, color_images = ?,
      is_new = ?, is_sale = ?, category = ?,
      stock_quantity = ?, sku = ?, is_active = ?,
      model_3d_url = ?, model_3d_filename = ?,
      updated_at = ?
    WHERE id = ?
  `;
  
  const params = [
    product.name, product.brand, product.description,
    product.price, product.original_price, product.image_url,
    product.rating, product.reviews, JSON.stringify(product.colors),
    JSON.stringify(product.color_images), product.is_new,
    product.is_sale, product.category, product.stock_quantity,
    product.sku, product.is_active, product.model_3d_url,
    product.model_3d_filename, currentTimestamp, id
  ];
  
  return await executeQuery(query, params);
}

// Delete product (soft delete)
export async function deleteProduct(id: number) {
  const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  const query = `
    UPDATE products SET 
      is_deleted = 1, 
      updated_at = ? 
    WHERE id = ?
  `;
  
  return await executeQuery(query, [currentTimestamp, id]);
}

export default pool;