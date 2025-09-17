# VPS Deployment Guide for GKicks E-commerce

This guide will help you deploy your GKicks Next.js e-commerce application to a VPS (Virtual Private Server).

## Prerequisites

- VPS with Ubuntu 20.04+ or CentOS 8+
- Root or sudo access
- Domain name (optional but recommended)
- Basic knowledge of Linux commands

## 🚀 Quick Deployment Steps

### 1. Server Setup

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### Install Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

#### Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Install MySQL
```bash
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation
```

### 2. Database Setup

#### Create Database and User
```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE gkicks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gkicks_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON gkicks.* TO 'gkicks_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Deployment

#### Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/yourusername/gkicks-shop.git
sudo chown -R $USER:$USER gkicks-shop
cd gkicks-shop/GKICKS-SHOP-2.0
```

#### Install Dependencies
```bash
npm install
```

#### Setup Environment Variables
```bash
cp .env.example .env.production
nano .env.production
```

Update the following variables:
```env
# Database
MYSQL_HOST=localhost
MYSQL_USER=gkicks_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=gkicks
MYSQL_PORT=3306

# Application
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-here
JWT_SECRET=your-jwt-secret-here

# Email (Update with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth (Update with your credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Run Database Migrations
```bash
node setup-main-database.js
node execute-mysql-schema.js
```

#### Build Application
```bash
npm run build
```

### 4. Process Management with PM2

#### Start Application
```bash
pm2 start npm --name "gkicks" -- start
pm2 startup
pm2 save
```

### 5. Nginx Configuration

#### Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/gkicks
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle static files
    location /_next/static {
        alias /var/www/gkicks-shop/GKICKS-SHOP-2.0/.next/static;
        expires 365d;
        access_log off;
    }

    # Handle public files
    location /public {
        alias /var/www/gkicks-shop/GKICKS-SHOP-2.0/public;
        expires 30d;
        access_log off;
    }
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/gkicks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate (Optional but Recommended)

#### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Firewall Configuration

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 🔧 Alternative Deployment Methods

### Docker Deployment (Recommended for Production)

See `docker-compose.yml` and `Dockerfile` for containerized deployment.

### Manual Deployment without PM2

If you prefer not to use PM2:
```bash
# Create systemd service
sudo nano /etc/systemd/system/gkicks.service
```

Add service configuration:
```ini
[Unit]
Description=GKicks Next.js App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/gkicks-shop/GKICKS-SHOP-2.0
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gkicks
sudo systemctl start gkicks
```

## 📊 Monitoring and Maintenance

### PM2 Monitoring
```bash
pm2 status
pm2 logs gkicks
pm2 restart gkicks
```

### Database Backup
```bash
# Create backup script
sudo nano /usr/local/bin/backup-gkicks.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/gkicks"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mysqldump -u gkicks_user -p gkicks > $BACKUP_DIR/gkicks_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "gkicks_*.sql" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-gkicks.sh

# Add to crontab for daily backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-gkicks.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **Port 3001 already in use**
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Database connection failed**
   - Check MySQL service: `sudo systemctl status mysql`
   - Verify credentials in `.env.production`
   - Test connection: `mysql -u gkicks_user -p gkicks`

3. **Nginx 502 Bad Gateway**
   - Check if app is running: `pm2 status`
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

4. **Permission issues**
   ```bash
   sudo chown -R www-data:www-data /var/www/gkicks-shop
   sudo chmod -R 755 /var/www/gkicks-shop
   ```

### Logs
- Application logs: `pm2 logs gkicks`
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- System logs: `sudo journalctl -u gkicks`

## 🔄 Updates and Deployment

### Update Application
```bash
cd /var/www/gkicks-shop/GKICKS-SHOP-2.0
git pull origin main
npm install
npm run build
pm2 restart gkicks
```

### Zero-downtime Deployment
Consider using PM2 cluster mode or blue-green deployment for production.

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review application logs
- Consult Next.js and PM2 documentation

---

**Note**: Replace `yourdomain.com` with your actual domain name throughout this guide.