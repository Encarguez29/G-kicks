const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

async function testDashboardAPI() {
  try {
    // Create a test JWT token for admin user
    const adminUser = {
      id: 1,
      email: 'gkcksdmn@gmail.com',
      is_admin: true
    };

    const token = jwt.sign(adminUser, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('🔑 Generated JWT token for admin user');

    // Test the dashboard API endpoint
    console.log('🌐 Testing dashboard API endpoint...');
    const response = await fetch('http://localhost:3000/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dashboard API successful!');
      console.log('📈 Dashboard data keys:', Object.keys(data));
      
      // Show a summary of the data
      if (data.productStats) {
        console.log('📦 Product stats:', data.productStats);
      }
      if (data.orderStats) {
        console.log('📋 Order stats:', data.orderStats);
      }
      if (data.userStats) {
        console.log('👥 User stats:', data.userStats);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Dashboard API failed');
      console.error('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDashboardAPI();