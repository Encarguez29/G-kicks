module.exports = {
  apps: [
    {
      name: 'gkicks-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/gkicks-shop/GKICKS-SHOP-3.0',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logging
      log_file: '/var/log/gkicks/combined.log',
      out_file: '/var/log/gkicks/out.log',
      error_file: '/var/log/gkicks/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart configuration
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Advanced PM2 features
      instance_var: 'INSTANCE_ID',
      merge_logs: true,
      
      // Environment variables from file
      env_file: '.env.production',
    },
    {
      name: 'gkicks-admin-server',
      script: 'admin-server.js',
      cwd: '/var/www/gkicks-shop/GKICKS-SHOP-3.0',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logging
      log_file: '/var/log/gkicks/admin-combined.log',
      out_file: '/var/log/gkicks/admin-out.log',
      error_file: '/var/log/gkicks/admin-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Environment variables from file
      env_file: '.env.production',
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/gkicks-shop.git',
      path: '/var/www/gkicks-shop',
      'pre-deploy-local': '',
      'post-deploy': 'cd GKICKS-SHOP-3.0 && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    staging: {
      user: 'deploy',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/yourusername/gkicks-shop.git',
      path: '/var/www/gkicks-shop-staging',
      'post-deploy': 'cd GKICKS-SHOP-3.0 && npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 3002
      }
    }
  }
};

// PM2 Commands Reference:
// 
// Start applications:
// pm2 start ecosystem.config.js --env production
// 
// Reload applications (zero-downtime):
// pm2 reload ecosystem.config.js --env production
// 
// Stop applications:
// pm2 stop ecosystem.config.js
// 
// Delete applications:
// pm2 delete ecosystem.config.js
// 
// Monitor applications:
// pm2 monit
// 
// View logs:
// pm2 logs
// pm2 logs gkicks-app
// 
// Application status:
// pm2 status
// pm2 info gkicks-app
// 
// Save PM2 configuration:
// pm2 save
// 
// Setup PM2 startup script:
// pm2 startup
// 
// Deploy to production:
// pm2 deploy production setup
// pm2 deploy production
// 
// Deploy to staging:
// pm2 deploy staging setup
// pm2 deploy staging