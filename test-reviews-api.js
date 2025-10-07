#!/usr/bin/env node

const http = require('http');

async function testReviewsAPI() {
  console.log('🧪 Testing Reviews API...');
  
  // Test with product ID 18 (we know there are reviews for this product)
  const productId = 18;
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/reviews?productId=${productId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📊 Status Code: ${res.statusCode}`);
        console.log(`📋 Response Headers:`, res.headers);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ Response Data:`, JSON.stringify(jsonData, null, 2));
          resolve(jsonData);
        } catch (error) {
          console.log(`📝 Raw Response:`, data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request Error:`, error);
      reject(error);
    });

    req.end();
  });
}

// Also test if the server is running
async function checkServer() {
  console.log('🔍 Checking if server is running...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log('✅ Server is running on port 3000');
      resolve(true);
    });

    req.on('error', (error) => {
      console.log('❌ Server is not running or not accessible:', error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ Server request timed out');
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('🚫 Cannot test API - server is not running');
    return;
  }
  
  await testReviewsAPI();
}

main().catch(console.error);