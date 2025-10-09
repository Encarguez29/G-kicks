const mysql = require('mysql2/promise');

async function checkProducts() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gkicks'
    });

    const [rows] = await connection.execute('SELECT id, name, variants FROM products WHERE name LIKE "%Jordan%" LIMIT 5');
    
    console.log('Jordan products:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}`);
      if (row.variants) {
        try {
          const variants = JSON.parse(row.variants);
          console.log('Variants:', JSON.stringify(variants, null, 2));
        } catch (e) {
          console.log('Variants (raw):', row.variants);
        }
      }
      console.log('---');
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProducts();