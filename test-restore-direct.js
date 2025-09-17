const jwt = require('jsonwebtoken');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

console.log('🔍 Environment check:');
console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('- JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 30) + '...' : 'NOT SET');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.log('❌ JWT_SECRET not found in environment');
  process.exit(1);
}

// Create a token for the staff user
const staffToken = jwt.sign(
  {
    userId: 'staff-user-id',
    email: 'gkicksstaff@gmail.com',
    role: 'staff'
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🎫 Generated token:', staffToken);

// Verify the token locally
try {
  const decoded = jwt.verify(staffToken, JWT_SECRET);
  console.log('✅ Local token verification successful:', decoded);
} catch (error) {
  console.log('❌ Local token verification failed:', error.message);
  process.exit(1);
}

// Test with the actual API endpoint
async function testAPI() {
  try {
    console.log('\n🧪 Testing API endpoint...');
    console.log('📡 Making request to: http://localhost:3001/api/admin/archive/restore');
    console.log('📋 Request data:', { id: 24, type: 'order' });
    console.log('🔑 Authorization header:', `Bearer ${staffToken.substring(0, 50)}...`);
    
    const response = await axios.post('http://localhost:3001/api/admin/archive/restore', {
      id: 24,
      type: 'order'
    }, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', response.data);
  } catch (error) {
    console.log('❌ API Error Status:', error.response?.status);
    console.log('❌ API Error Data:', error.response?.data);
    console.log('❌ Full Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 Connection refused - is the server running on port 3001?');
    }
  }
}

testAPI();