const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gkicks'
};

async function createUserSettingsTable() {
  let connection;
  
  try {
    console.log('🔗 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('📋 Creating user_settings table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_setting (user_id, setting_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ user_settings table created successfully!');
    
    // Create admin_settings table for admin-specific settings
    console.log('📋 Creating admin_settings table...');
    
    const createAdminTableQuery = `
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_user_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_admin_setting (admin_user_id, setting_key),
        FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
        INDEX idx_admin_user_id (admin_user_id),
        INDEX idx_admin_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await connection.execute(createAdminTableQuery);
    console.log('✅ admin_settings table created successfully!');
    
    // Insert some default settings for existing users
    console.log('📝 Setting up default settings for existing users...');
    
    const defaultUserSettings = [
      { key: 'notifications', value: { pushNotifications: true, emailUpdates: false } },
      { key: 'appearance', value: { theme: 'light' } }
    ];
    
    // Get all existing users
    const [users] = await connection.execute('SELECT id FROM users WHERE is_active = 1');
    
    for (const user of users) {
      for (const setting of defaultUserSettings) {
        await connection.execute(
          `INSERT IGNORE INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)`,
          [user.id, setting.key, JSON.stringify(setting.value)]
        );
      }
    }
    
    console.log(`✅ Default settings created for ${users.length} users!`);
    
    // Get all existing admin users
    const [adminUsers] = await connection.execute('SELECT id FROM admin_users WHERE is_active = 1');
    
    const defaultAdminSettings = [
      { key: 'admin_preferences', value: { disabledButtons: {}, lastClickedStatus: {} } },
      { key: 'admin_appearance', value: { theme: 'light' } }
    ];
    
    for (const adminUser of adminUsers) {
      for (const setting of defaultAdminSettings) {
        await connection.execute(
          `INSERT IGNORE INTO admin_settings (admin_user_id, setting_key, setting_value) VALUES (?, ?, ?)`,
          [adminUser.id, setting.key, JSON.stringify(setting.value)]
        );
      }
    }
    
    console.log(`✅ Default admin settings created for ${adminUsers.length} admin users!`);
    
    console.log('\n🎉 User settings tables setup completed successfully!');
    console.log('\nTables created:');
    console.log('- user_settings: For regular user preferences');
    console.log('- admin_settings: For admin-specific configurations');
    
  } catch (error) {
    console.error('❌ Error creating user settings tables:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createUserSettingsTable();