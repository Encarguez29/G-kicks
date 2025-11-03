const jwt = require('jsonwebtoken');

async function testOrderCreation() {
    try {
        console.log('🔍 Testing Order Creation API...');
        
        // Generate a test JWT token
        const jwtSecret = process.env.JWT_SECRET || 'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication';
        const token = jwt.sign(
            { 
                userId: '1', 
                email: 'test@example.com',
                role: 'user'
            }, 
            jwtSecret, 
            { expiresIn: '1h' }
        );
        
        console.log('🔐 Generated JWT token');
        
        // Test order data - using the correct API format with valid variant
        const orderData = {
            items: [
                {
                    product_id: 19,
                    product_name: 'Jordan 4 Retro SB',
                    price: 11895.00,
                    quantity: 1,
                    size: '7',
                    color: 'Pine Green'
                }
            ],
            total: 11895.00,
            customer_email: 'test@example.com',
            shipping_address: JSON.stringify({
                firstName: 'Test',
                lastName: 'User',
                address: '123 Test Street',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
                country: 'Test Country',
                phone: '1234567890'
            }),
            payment_method: 'bank_transfer',
            payment_reference: 'TEST123456',
            payment_screenshot: null,
            status: 'pending'
        };
        
        console.log('📦 Order data prepared');
        console.log('🔗 Making request to http://localhost:3001/api/orders');
        
        const response = await fetch('http://localhost:3001/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        
        console.log(`📊 Response status: ${response.status}`);
        console.log(`📊 Response status text: ${response.statusText}`);
        
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText);
        
        if (!response.ok) {
            console.error(`❌ API Error: ${response.status} - ${response.statusText}`);
            console.error('❌ Response body:', responseText);
            return;
        }
        
        const result = JSON.parse(responseText);
        console.log('✅ Order created successfully:', result);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('❌ Full error:', error);
    }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testOrderCreation();