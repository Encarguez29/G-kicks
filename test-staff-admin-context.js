const mysql = require('mysql2/promise')
require('dotenv').config()

async function testStaffAdminContext() {
  console.log('🧪 Testing Staff Admin Context Authentication...')
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gkicks_shop'
  })

  try {
    // Test the same query that admin check-status API uses
    const email = 'gkicksstaff@gmail.com'
    console.log(`\n🔍 Testing admin status check for: ${email}`)
    
    const [adminUsers] = await connection.execute(
      'SELECT id, username, email, role, permissions, is_active, created_at FROM admin_users WHERE email = ? AND is_active = 1',
      [email]
    )
    
    if (adminUsers.length > 0) {
      const adminUser = adminUsers[0]
      console.log('✅ Admin user found in admin_users table:')
      console.log('   - ID:', adminUser.id)
      console.log('   - Email:', adminUser.email)
      console.log('   - Role:', adminUser.role)
      console.log('   - Permissions:', adminUser.permissions)
      console.log('   - Is Active:', adminUser.is_active)
      
      let permissions = {}
      try {
        permissions = adminUser.permissions ? JSON.parse(adminUser.permissions) : {}
        console.log('   - Parsed Permissions:', permissions)
      } catch (e) {
        console.log('   - Permission parsing error:', e.message)
      }
      
      // Simulate the API response
      const userData = {
        id: adminUser.id.toString(),
        email: adminUser.email,
        role: adminUser.role,
        permissions: permissions,
        is_active: adminUser.is_active,
        created_at: adminUser.created_at
      }
      
      console.log('\n📋 API Response would be:')
      console.log(JSON.stringify({
        message: 'Admin status confirmed',
        user: userData
      }, null, 2))
      
      // Test staff access logic
      console.log('\n🔐 Testing staff access logic:')
      console.log('   - Is Staff?', userData.role === 'staff')
      console.log('   - Has Orders Permission?', permissions.orders === true)
      console.log('   - Has POS Permission?', permissions.pos === true)
      
    } else {
      console.log('❌ No admin user found for this email')
      
      // Check fallback in users table
      const [users] = await connection.execute(
        'SELECT id, email, is_admin, created_at FROM users WHERE email = ? AND is_admin = 1',
        [email]
      )
      
      if (users.length > 0) {
        console.log('✅ Found in users table as legacy admin')
        console.log('   - User:', users[0])
      } else {
        console.log('❌ Not found in users table either')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await connection.end()
  }
}

testStaffAdminContext().catch(console.error)