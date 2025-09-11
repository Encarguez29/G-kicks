// Test to check what JWT_SECRET the server is using
const jwt = require('jsonwebtoken');

// Test with the .env JWT_SECRET
const envSecret = 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';

// Test with the fallback secret
const fallbackSecret = 'fallback-secret';

// Create a test token with user ID 1
const testPayload = {
    userId: '1',
    email: 'gkcksdmn@gmail.com',
    role: 'admin'
};

console.log('🔍 Testing JWT secrets...');

// Create tokens with both secrets
const tokenWithEnvSecret = jwt.sign(testPayload, envSecret, { expiresIn: '1h' });
const tokenWithFallbackSecret = jwt.sign(testPayload, fallbackSecret, { expiresIn: '1h' });

console.log('\n🔐 Token with .env secret:', tokenWithEnvSecret.substring(0, 50) + '...');
console.log('🔐 Token with fallback secret:', tokenWithFallbackSecret.substring(0, 50) + '...');

// Test both tokens against the /api/auth/me endpoint
async function testTokens() {
    const BASE_URL = 'http://localhost:3001';
    
    console.log('\n🧪 Testing token with .env secret...');
    try {
        const response1 = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenWithEnvSecret}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Response status:', response1.status);
        const data1 = await response1.json();
        console.log('📊 Response data:', JSON.stringify(data1, null, 2));
    } catch (error) {
        console.error('❌ Error with .env secret:', error.message);
    }
    
    console.log('\n🧪 Testing token with fallback secret...');
    try {
        const response2 = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenWithFallbackSecret}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Response status:', response2.status);
        const data2 = await response2.json();
        console.log('📊 Response data:', JSON.stringify(data2, null, 2));
    } catch (error) {
        console.error('❌ Error with fallback secret:', error.message);
    }
}

testTokens().catch(console.error);