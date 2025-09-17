require('dotenv').config({ path: '.env.local' });

async function testStaffDashboardAccess() {
  try {
    console.log('🧪 Testing staff dashboard access removal...');
    
    // Login as staff
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gkicksstaff@gmail.com',
        password: 'gkicksstaff_123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Staff login failed');
      const loginError = await loginResponse.json();
      console.log('Login error:', loginError);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Staff login successful');
    
    // Try to access dashboard API
    console.log('🔍 Testing dashboard API access...');
    const dashboardResponse = await fetch('http://localhost:3001/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Dashboard API Response Status:', dashboardResponse.status);
    
    if (dashboardResponse.status === 403) {
      console.log('✅ SUCCESS: Dashboard access properly denied for staff user');
    } else if (dashboardResponse.status === 200) {
      console.log('❌ ISSUE: Staff user still has dashboard access');
    } else {
      console.log('⚠️  Unexpected response status:', dashboardResponse.status);
    }
    
    const responseData = await dashboardResponse.json();
    console.log('Response message:', responseData.error || responseData.message || 'No message');
    
    // Test auth/me to verify user role
    console.log('\n🔍 Verifying user role...');
    const meResponse = await fetch('http://localhost:3001/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('User role:', meData.user?.role);
      console.log('User email:', meData.user?.email);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testStaffDashboardAccess();