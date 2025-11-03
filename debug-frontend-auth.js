// Debug script to test frontend authentication flow
// Run this in browser console or as a standalone test

async function debugFrontendAuth() {
  console.log('🔍 DEBUGGING FRONTEND AUTHENTICATION FLOW');
  console.log('==========================================');
  
  // Step 1: Check current localStorage
  console.log('\n1️⃣ Checking current localStorage...');
  const currentToken = localStorage.getItem('auth_token');
  console.log('Current auth_token in localStorage:', currentToken ? '✅ EXISTS' : '❌ NOT FOUND');
  if (currentToken) {
    console.log('Token preview:', currentToken.substring(0, 50) + '...');
  }
  
  // Step 2: Test login API
  console.log('\n2️⃣ Testing login API...');
  try {
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gkcksdmn@gmail.com',
        password: 'admingkicks2.0'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful!');
      console.log('Response contains token:', !!loginData.token);
      console.log('User data:', loginData.user);
      
      // Step 3: Store token in localStorage (simulating frontend behavior)
      if (loginData.token) {
        console.log('\n3️⃣ Storing token in localStorage...');
        localStorage.setItem('auth_token', loginData.token);
        console.log('✅ Token stored in localStorage');
        
        // Verify storage
        const storedToken = localStorage.getItem('auth_token');
        console.log('Verification - token stored:', !!storedToken);
      }
      
      // Step 4: Test delete API with stored token
      console.log('\n4️⃣ Testing delete API with stored token...');
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        const deleteResponse = await fetch('/api/admin/archive/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: 81, // Test with Order #81
            type: 'order'
          })
        });
        
        console.log('Delete response status:', deleteResponse.status);
        const deleteResult = await deleteResponse.text();
        console.log('Delete response:', deleteResult);
        
        if (deleteResponse.ok) {
          console.log('✅ Delete API works with frontend token!');
        } else {
          console.log('❌ Delete API failed');
        }
      } else {
        console.log('❌ No token available for delete test');
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('❌ Login failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Error during authentication test:', error);
  }
  
  console.log('\n🏁 Authentication debug complete!');
}

// For browser console usage
if (typeof window !== 'undefined') {
  window.debugFrontendAuth = debugFrontendAuth;
  console.log('💡 Run debugFrontendAuth() in the browser console to test authentication');
}

// For Node.js usage
if (typeof module !== 'undefined') {
  module.exports = { debugFrontendAuth };
}

// Auto-run if in Node.js environment
if (typeof window === 'undefined') {
  // Add fetch polyfill for Node.js
  const fetch = require('node-fetch');
  global.fetch = fetch;
  
  // Mock localStorage for Node.js
  global.localStorage = {
    storage: {},
    getItem: function(key) {
      return this.storage[key] || null;
    },
    setItem: function(key, value) {
      this.storage[key] = value;
    }
  };
  
  debugFrontendAuth();
}