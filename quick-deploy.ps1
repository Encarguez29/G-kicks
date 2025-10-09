# Quick Resume Deployment Script for GKicks
# VPS: 72.60.211.237 | Domain: g-kicks.shop

Write-Host "=== GKicks Quick Deployment Resume ===" -ForegroundColor Cyan
Write-Host "VPS: 72.60.211.237" -ForegroundColor White
Write-Host "Domain: g-kicks.shop" -ForegroundColor White
Write-Host ""

# Check VPS connectivity
Write-Host "[1/3] Testing VPS connection..." -ForegroundColor Blue
$ping = Test-Connection -ComputerName "72.60.211.237" -Count 1 -Quiet
if ($ping) {
    Write-Host "✓ VPS is reachable" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot reach VPS" -ForegroundColor Red
    Write-Host "Please check your internet connection and VPS status" -ForegroundColor Yellow
}

Write-Host "`n[2/3] Manual SSH Deployment Steps:" -ForegroundColor Blue
Write-Host "`nConnect to your VPS and run these commands:" -ForegroundColor Yellow
Write-Host "ssh root@72.60.211.237" -ForegroundColor Gray
Write-Host ""

Write-Host "# Update system" -ForegroundColor Green
Write-Host "apt update; apt upgrade -y" -ForegroundColor Gray
Write-Host ""

Write-Host "# Install dependencies" -ForegroundColor Green
Write-Host "apt install -y nodejs npm nginx mysql-server git certbot python3-certbot-nginx" -ForegroundColor Gray
Write-Host "npm install -g pm2" -ForegroundColor Gray
Write-Host ""

Write-Host "# Clone and setup application" -ForegroundColor Green
Write-Host "git clone https://github.com/yourusername/gkicks.git /var/www/gkicks" -ForegroundColor Gray
Write-Host "cd /var/www/gkicks" -ForegroundColor Gray
Write-Host "npm install" -ForegroundColor Gray
Write-Host ""

Write-Host "# Setup environment" -ForegroundColor Green
Write-Host "cp .env.production.example .env.production" -ForegroundColor Gray
Write-Host "nano .env.production  # Edit database and other settings" -ForegroundColor Gray
Write-Host ""

Write-Host "# Setup database" -ForegroundColor Green
Write-Host "mysql_secure_installation" -ForegroundColor Gray
Write-Host "mysql -u root -p -e 'CREATE DATABASE gkicks_prod;'" -ForegroundColor Gray
Write-Host "mysql -u root -p gkicks_prod < database/complete-mysql-schema.sql" -ForegroundColor Gray
Write-Host ""

Write-Host "# Build and start application" -ForegroundColor Green
Write-Host "npm run build" -ForegroundColor Gray
Write-Host "pm2 start ecosystem.config.js --env production" -ForegroundColor Gray
Write-Host "pm2 save" -ForegroundColor Gray
Write-Host "pm2 startup" -ForegroundColor Gray
Write-Host ""

Write-Host "# Setup Nginx" -ForegroundColor Green
Write-Host "cp nginx/sites-available/gkicks.conf /etc/nginx/sites-available/" -ForegroundColor Gray
Write-Host "ln -s /etc/nginx/sites-available/gkicks.conf /etc/nginx/sites-enabled/" -ForegroundColor Gray
Write-Host "nginx -t" -ForegroundColor Gray
Write-Host "systemctl restart nginx" -ForegroundColor Gray
Write-Host ""

Write-Host "# Setup SSL" -ForegroundColor Green
Write-Host "certbot --nginx -d g-kicks.shop -d www.g-kicks.shop" -ForegroundColor Gray
Write-Host ""

Write-Host "[3/3] Post-Deployment Checklist:" -ForegroundColor Blue
Write-Host "□ DNS A records configured (@ and www -> 72.60.211.237)" -ForegroundColor White
Write-Host "□ SSL certificates generated" -ForegroundColor White
Write-Host "□ Database configured and migrated" -ForegroundColor White
Write-Host "□ Application running (pm2 status)" -ForegroundColor White
Write-Host "□ Nginx configured and running" -ForegroundColor White
Write-Host "□ Firewall configured (ufw enable)" -ForegroundColor White

Write-Host "`n🚀 Your site will be live at: https://g-kicks.shop" -ForegroundColor Green
Write-Host "📊 Admin panel: https://admin.g-kicks.shop" -ForegroundColor Green

Write-Host "`nDeployment instructions displayed. Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')