require('dotenv').config({ path: '.env.local' });

async function testStaffLogin() {
  try {
    console.log('🔍 Testing staff login for gkicksstaff@gmail.com...');
    
    // Test login API
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkicksstaff@gmail.com',
        password: 'gkicksstaff_123'
      }),
    });

    console.log('📡 Login API Response Status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error('❌ Login failed:', errorData);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', {
      success: loginData.success,
      message: loginData.message,
      hasToken: !!loginData.token
    });

    // Test admin status check
    console.log('\n🔍 Testing admin status check...');
    const adminCheckResponse = await fetch('http://localhost:3001/api/admin/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkicksstaff@gmail.com'
      }),
    });

    console.log('📡 Admin Check Response Status:', adminCheckResponse.status);
    
    if (!adminCheckResponse.ok) {
      const errorData = await adminCheckResponse.json();
      console.error('❌ Admin check failed:', errorData);
      return;
    }

    const adminData = await adminCheckResponse.json();
    console.log('✅ Admin check successful:', {
      message: adminData.message,
      user: {
        email: adminData.user.email,
        role: adminData.user.role,
        permissions: adminData.user.permissions,
        is_active: adminData.user.is_active
      }
    });

    // Test orders API access (staff should have access)
    console.log('\n🔍 Testing orders API access...');
    const ordersResponse = await fetch('http://localhost:3001/api/admin/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
    });

    console.log('📡 Orders API Response Status:', ordersResponse.status);
    
    if (!ordersResponse.ok) {
      const errorData = await ordersResponse.json();
      console.error('❌ Orders API failed:', errorData);
    } else {
      const ordersData = await ordersResponse.json();
      console.log('✅ Orders API successful:', {
        ordersCount: ordersData.orders ? ordersData.orders.length : 0,
        message: ordersData.message
      });
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testStaffLogin();