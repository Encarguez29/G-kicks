const puppeteer = require('puppeteer');

async function testFrontendPersistence() {
  console.log('🚀 Starting frontend data persistence test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('🖥️ Browser:', msg.text());
      } else if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });
    
    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to application...');
    await page.goto('http://localhost:3000');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Login
    console.log('📍 Step 2: Logging in...');
    await page.click('button:has-text("Login")');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.fill('input[type="email"]', 'encarguerz@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Navigate to profile page
    console.log('📍 Step 3: Navigating to profile page...');
    await page.goto('http://localhost:3000/profile');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Check if profile data loads
    console.log('📍 Step 4: Checking profile data loading...');
    
    // Wait for profile data to load
    await page.waitForSelector('input[name="first_name"]', { timeout: 10000 });
    
    const firstName = await page.inputValue('input[name="first_name"]');
    const lastName = await page.inputValue('input[name="last_name"]');
    const phone = await page.inputValue('input[name="phone"]');
    
    console.log('✅ Profile data loaded:');
    console.log('   First Name:', firstName);
    console.log('   Last Name:', lastName);
    console.log('   Phone:', phone);
    
    // Step 5: Update profile data
    console.log('📍 Step 5: Updating profile data...');
    
    await page.fill('input[name="first_name"]', 'Updated Joshua');
    await page.fill('input[name="phone"]', '09123456789');
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Navigate to address tab
    console.log('📍 Step 6: Checking address data...');
    await page.click('button:has-text("Address")');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if address data loads
    const streetAddress = await page.inputValue('input[name="street_address"]');
    const city = await page.inputValue('input[name="city"]');
    const barangay = await page.inputValue('input[name="barangay"]');
    
    console.log('✅ Address data loaded:');
    console.log('   Street:', streetAddress);
    console.log('   City:', city);
    console.log('   Barangay:', barangay);
    
    // Step 7: Update address data
    console.log('📍 Step 7: Updating address data...');
    
    await page.fill('input[name="barangay"]', 'Test Barangay Updated');
    
    // Save address changes
    await page.click('button:has-text("Save Address")');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 8: Test persistence by refreshing the page
    console.log('📍 Step 8: Testing data persistence after refresh...');
    await page.reload();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if profile data persists
    await page.waitForSelector('input[name="first_name"]', { timeout: 10000 });
    
    const persistedFirstName = await page.inputValue('input[name="first_name"]');
    const persistedPhone = await page.inputValue('input[name="phone"]');
    
    console.log('🔄 After refresh - Profile data:');
    console.log('   First Name:', persistedFirstName);
    console.log('   Phone:', persistedPhone);
    
    // Check address persistence
    await page.click('button:has-text("Address")');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const persistedBarangay = await page.inputValue('input[name="barangay"]');
    
    console.log('🔄 After refresh - Address data:');
    console.log('   Barangay:', persistedBarangay);
    
    // Step 9: Verify persistence
    console.log('📍 Step 9: Verifying data persistence...');
    
    const profilePersisted = persistedFirstName === 'Updated Joshua' && persistedPhone === '09123456789';
    const addressPersisted = persistedBarangay === 'Test Barangay Updated';
    
    if (profilePersisted && addressPersisted) {
      console.log('✅ SUCCESS: All data persisted correctly after refresh!');
    } else {
      console.log('❌ FAILURE: Data persistence issues detected:');
      if (!profilePersisted) {
        console.log('   - Profile data did not persist');
      }
      if (!addressPersisted) {
        console.log('   - Address data did not persist');
      }
    }
    
    // Step 10: Test navigation persistence
    console.log('📍 Step 10: Testing navigation persistence...');
    await page.goto('http://localhost:3000');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.goto('http://localhost:3000/profile');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check data after navigation
    await page.waitForSelector('input[name="first_name"]', { timeout: 10000 });
    const navFirstName = await page.inputValue('input[name="first_name"]');
    
    console.log('🔄 After navigation - First Name:', navFirstName);
    
    if (navFirstName === 'Updated Joshua') {
      console.log('✅ SUCCESS: Data persists across navigation!');
    } else {
      console.log('❌ FAILURE: Data lost during navigation');
    }
    
    console.log('🎉 Frontend persistence test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testFrontendPersistence().catch(console.error);