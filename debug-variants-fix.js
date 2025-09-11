const { executeQuery } = require('./lib/database/mysql.ts');

async function debugVariantsFix() {
  try {
    console.log('🔍 Checking if variants field is properly returned...');
    
    const query = `
      SELECT 
        id,
        name,
        colors,
        sizes,
        variants
      FROM products 
      WHERE is_active = 1 AND stock_quantity > 0
      LIMIT 3
    `;
    
    const products = await executeQuery(query);
    
    console.log('📦 Products with variants data:');
    products.forEach((product, index) => {
      console.log(`\nProduct ${index + 1} (ID: ${product.id}):`);
      console.log(`  - Name: ${product.name}`);
      console.log(`  - Colors: ${product.colors || 'NULL'}`);
      console.log(`  - Sizes: ${product.sizes || 'NULL'}`);
      console.log(`  - Variants: ${product.variants || 'NULL'}`);
      
      // Parse and display structured data
      try {
        if (product.colors) {
          const colors = JSON.parse(product.colors);
          console.log(`  - Parsed Colors: ${colors.join(', ')}`);
        }
        if (product.sizes) {
          const sizes = JSON.parse(product.sizes);
          console.log(`  - Parsed Sizes: ${sizes.join(', ')}`);
        }
        if (product.variants) {
          const variants = JSON.parse(product.variants);
          console.log(`  - Parsed Variants:`);
          Object.entries(variants).forEach(([color, sizeStock]) => {
            const availableSizes = Object.entries(sizeStock)
              .filter(([, stock]) => stock > 0)
              .map(([size]) => size);
            console.log(`    - ${color}: ${availableSizes.join(', ')} (with stock)`);
          });
        }
      } catch (e) {
        console.log(`  - JSON Parse Error: ${e.message}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking variants:', error);
  }
}

debugVariantsFix();