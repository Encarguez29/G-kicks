const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';

console.log('🔐 JWT_SECRET preview:', JWT_SECRET.substring(0, 30) + '...');

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

// Verify the token
try {
  const decoded = jwt.verify(staffToken, JWT_SECRET);
  console.log('✅ Token verification successful:', decoded);
} catch (error) {
  console.log('❌ Token verification failed:', error.message);
}

// Test with the actual API endpoint
const axios = require('axios');

async function testAPI() {
  try {
    console.log('\n🧪 Testing API endpoint...');
    const response = await axios.post('http://localhost:3001/api/admin/archive/restore', {
      id: 24,
      type: 'order'
    }, {
      headers: {
        'Authorization': `Bearer ${staffToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response:', response.data);
  } catch (error) {
    console.log('❌ API Error:', error.response?.data || error.message);
  }
}

testAPI();