async function testSupportAPI() {
  try {
    console.log('🧪 Testing Support API endpoint...');
    
    const testData = {
      user_email: 'test@example.com',
      user_name: 'Test User',
      subject: 'Test Support Request',
      message_content: 'This is a test message to verify the API works',
      user_id: null
    };
    
    console.log('📤 Sending POST request to /api/support/conversations');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    // Use curl instead of fetch
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const curlCommand = `curl -X POST http://localhost:3000/api/support/conversations -H "Content-Type: application/json" -d "${JSON.stringify(testData).replace(/"/g, '\\"')}" -v`;
    
    console.log('🔧 Running curl command...');
    const { stdout, stderr } = await execPromise(curlCommand);
    
    console.log('📥 Response:', stdout);
    if (stderr) {
      console.log('📥 Curl info:', stderr);
    }
    
    try {
      const responseData = JSON.parse(stdout);
      console.log('📥 Parsed response:', JSON.stringify(responseData, null, 2));
      
      if (responseData.success) {
        console.log('✅ API test successful!');
        console.log('🆔 Conversation ID:', responseData.conversation?.id);
      } else {
        console.log('❌ API test failed');
        console.log('Error:', responseData.error);
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON');
      console.log('Raw response:', stdout);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testSupportAPI();