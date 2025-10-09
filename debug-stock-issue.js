const mysql = require('mysql2/promise');

async function debugStockIssue() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    // Get the Jordan 4 product with all its variants
    const [products] = await connection.execute(`
      SELECT p.*, pv.color, pv.size, pv.stock_quantity 
      FROM products p 
      LEFT JOIN product_variants pv ON p.id = pv.product_id 
      WHERE p.id = 19
      ORDER BY pv.color, CAST(pv.size AS UNSIGNED)
    `);

    console.log('=== JORDAN 4 PRODUCT DEBUG ===');
    console.log('Product ID:', products[0]?.id);
    console.log('Product Name:', products[0]?.name);
    console.log('Product Colors:', products[0]?.colors);
    
    console.log('\n=== VARIANTS ===');
    products.forEach(row => {
      if (row.color && row.size) {
        console.log(`Color: ${row.color}, Size: ${row.size}, Stock: ${row.stock_quantity}`);
      }
    });

    // Group variants by color
    const variantsByColor = {};
    products.forEach(row => {
      if (row.color && row.size) {
        if (!variantsByColor[row.color]) {
          variantsByColor[row.color] = {};
        }
        variantsByColor[row.color][row.size] = row.stock_quantity;
      }
    });

    console.log('\n=== VARIANTS GROUPED BY COLOR ===');
    console.log(JSON.stringify(variantsByColor, null, 2));

    // Check what sizes would be available for each color
    console.log('\n=== AVAILABLE SIZES PER COLOR ===');
    Object.keys(variantsByColor).forEach(color => {
      const availableSizes = Object.entries(variantsByColor[color])
        .filter(([, stock]) => stock > 0)
        .map(([size]) => size)
        .sort((a, b) => Number(a) - Number(b));
      
      console.log(`${color}: [${availableSizes.join(', ')}]`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugStockIssue();