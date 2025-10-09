const mysql = require('mysql2/promise');

async function debugProductStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    // Get the Jordan 4 product complete data
    const [products] = await connection.execute(`
      SELECT * FROM products WHERE id = 19
    `);

    console.log('=== COMPLETE PRODUCT DATA ===');
    const product = products[0];
    
    console.log('ID:', product.id);
    console.log('Name:', product.name);
    console.log('Colors:', product.colors);
    console.log('Sizes:', product.sizes);
    console.log('Variants (raw):', product.variants);
    
    // Try to parse variants if it's a JSON string
    if (product.variants) {
      try {
        const parsedVariants = typeof product.variants === 'string' 
          ? JSON.parse(product.variants) 
          : product.variants;
        console.log('Variants (parsed):', JSON.stringify(parsedVariants, null, 2));
      } catch (e) {
        console.log('Failed to parse variants:', e.message);
      }
    }

    // Check product_variants table
    const [variants] = await connection.execute(`
      SELECT * FROM product_variants WHERE product_id = 19
    `);

    console.log('\n=== PRODUCT_VARIANTS TABLE ===');
    console.log('Variant count:', variants.length);
    variants.forEach(variant => {
      console.log(`Color: ${variant.color}, Size: ${variant.size}, Stock: ${variant.stock_quantity}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugProductStructure();