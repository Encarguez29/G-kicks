// Test what the POS system is actually receiving
async function testPOSAPI() {
  try {
    console.log('=== Testing POS API Data ===');
    
    const response = await fetch('http://localhost:3001/api/products');
    if (!response.ok) {
      console.error('❌ API request failed:', response.status);
      return;
    }
    
    const products = await response.json();
    console.log('📦 Total products received:', products.length);
    
    // Find a product with variants
    const productWithVariants = products.find(p => p.variants && Object.keys(p.variants).length > 0);
    
    if (productWithVariants) {
      console.log('\n🎯 Found product with variants:');
      console.log('Name:', productWithVariants.name);
      console.log('Colors (raw):', productWithVariants.colors);
      console.log('Variants (raw):', productWithVariants.variants);
      console.log('Variants type:', typeof productWithVariants.variants);
      
      // Test the same logic as POS
      let availableColors = [];
      if (productWithVariants.variants && typeof productWithVariants.variants === 'object') {
        availableColors = Object.keys(productWithVariants.variants).filter(color => {
          const variant = productWithVariants.variants[color];
          const sizeData = variant.sizes || variant;
          if (typeof sizeData === 'object' && sizeData !== null) {
            return Object.values(sizeData).some(stock => 
              typeof stock === 'number' && stock > 0
            );
          }
          return false;
        });
      }
      
      console.log('\n✅ Available colors (POS logic):', availableColors);
      
      if (availableColors.length === 0) {
        console.log('\n⚠️  WARNING: No available colors found! This explains the empty dialog.');
        console.log('Debugging variant structure:');
        console.log('- Variants keys:', Object.keys(productWithVariants.variants || {}));
        if (productWithVariants.variants) {
          Object.entries(productWithVariants.variants).forEach(([color, variant]) => {
            console.log(`- ${color}:`, variant);
            const sizeData = variant.sizes || variant;
            console.log(`  - Size data:`, sizeData);
            console.log(`  - Size data type:`, typeof sizeData);
            if (typeof sizeData === 'object') {
              console.log(`  - Size values:`, Object.values(sizeData));
            }
          });
        }
      }
    } else {
      console.log('\n❌ No products with variants found');
      console.log('Sample product structure:');
      if (products.length > 0) {
        const sample = products[0];
        console.log('Name:', sample.name);
        console.log('Has variants:', !!sample.variants);
        console.log('Variants:', sample.variants);
        console.log('Colors:', sample.colors);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing POS API:', error);
  }
}

// Node.js 18+ has built-in fetch
testPOSAPI();