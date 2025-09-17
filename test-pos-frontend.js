// Test POS frontend behavior with variants
const puppeteer = require('puppeteer');

async function testPOSFrontend() {
  let browser;
  try {
    console.log('🔍 Testing POS frontend behavior...');
    
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Navigate to POS page
    await page.goto('http://localhost:3001/admin/pos');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check if products are loaded
    const products = await page.$$('.product-card, [data-testid="product-card"]');
    console.log(`📦 Found ${products.length} products on POS page`);
    
    if (products.length > 0) {
      // Click on first product to open dialog
      await products[0].click();
      
      // Wait for dialog to open
      await page.waitForTimeout(1000);
      
      // Check available colors
      const colorButtons = await page.$$('[data-testid="color-button"], .color-button');
      console.log(`🎨 Found ${colorButtons.length} color options`);
      
      // Check available sizes
      const sizeButtons = await page.$$('[data-testid="size-button"], .size-button');
      console.log(`👟 Found ${sizeButtons.length} size options`);
      
      // Get console logs
      const logs = await page.evaluate(() => {
        return window.console.logs || [];
      });
      
      if (logs.length > 0) {
        console.log('📝 Console logs:', logs);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing POS frontend:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  testPOSFrontend();
} catch (e) {
  console.log('⚠️  Puppeteer not available, skipping frontend test');
  console.log('Please manually test the POS system:');
  console.log('1. Open http://localhost:3001/admin/pos');
  console.log('2. Click on a product (e.g., "sambahin moko")');
  console.log('3. Check if only "Black" color is available (not yellow)');
  console.log('4. Select Black and check if only sizes 6-12 are available (not 2,4,5)');
  console.log('5. Compare with inventory page behavior');
}