const mysql = require('mysql2/promise');

async function fixMissingSize() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gkicks'
  });

  try {
    // Update the variants to include size 8 with stock 2
    const updatedVariants = {
      "Pine Green": {
        "6": 1,
        "7": 11,
        "8": 2,  // Adding the missing size 8
        "9": 2,
        "10": 1,
        "11": 1,
        "12": 1,
        "13": 2,
        "14": 2,
        "15": 2
      }
    };

    const [result] = await connection.execute(
      'UPDATE products SET variants = ? WHERE id = 19',
      [JSON.stringify(updatedVariants)]
    );

    console.log('Update result:', result);
    console.log('Rows affected:', result.affectedRows);

    // Verify the update
    const [products] = await connection.execute('SELECT variants FROM products WHERE id = 19');
    const product = products[0];
    
    console.log('\n=== UPDATED VARIANTS ===');
    const parsedVariants = JSON.parse(product.variants);
    console.log(JSON.stringify(parsedVariants, null, 2));

    // Check available sizes
    const availableSizes = Object.entries(parsedVariants["Pine Green"])
      .filter(([, stock]) => stock > 0)
      .map(([size]) => size)
      .sort((a, b) => Number(a) - Number(b));
    
    console.log('\n=== AVAILABLE SIZES ===');
    console.log('Available sizes:', availableSizes);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixMissingSize();