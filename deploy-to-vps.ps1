# GKicks VPS Deployment Script (PowerShell)
# VPS IP: 72.60.211.237
# Domain: g-kicks.shop

# Configuration
$VPS_IP = "72.60.211.237"
$DOMAIN = "g-kicks.shop"
$APP_NAME = "gkicks"
$APP_DIR = "/var/www/gkicks"
$USER = "root"  # Change this to your VPS user
$REPO_URL = "https://github.com/gkicks2025/gkicks.git"  # Update with your repo

# Colors for output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we can connect to VPS
function Test-VPSConnection {
    Write-Status "Checking VPS connection to $VPS_IP..."
    $ping = Test-Connection -ComputerName $VPS_IP -Count 1 -Quiet
    if ($ping) {
        Write-Success "VPS is reachable"
        return $true
    } else {
        Write-Error "Cannot reach VPS at $VPS_IP"
        return $false
    }
}

# Check if SSH is available
function Test-SSHAvailable {
    try {
        $sshVersion = ssh -V 2>&1
        Write-Success "SSH is available: $sshVersion"
        return $true
    } catch {
        Write-Error "SSH is not available. Please install OpenSSH or use WSL."
        Write-Warning "You can install OpenSSH from Windows Features or use Git Bash."
        return $false
    }
}

# Deploy to VPS using SCP and SSH
function Deploy-ToVPS {
    Write-Status "Starting deployment to VPS..."
    
    try {
        # Create deployment directory on VPS
        Write-Status "Creating deployment directory on VPS..."
        ssh "${USER}@${VPS_IP}" "mkdir -p /tmp/gkicks-deployment"
        
        # Copy deployment files to VPS
        Write-Status "Copying deployment files to VPS..."
        scp -r . "${USER}@${VPS_IP}:/tmp/gkicks-deployment/"
        
        # Execute deployment on VPS
        Write-Status "Executing deployment script on VPS..."
        ssh "${USER}@${VPS_IP}" @"
cd /tmp/gkicks-deployment
chmod +x deploy.sh
./deploy.sh
"@
        
        Write-Success "Deployment completed!"
        return $true
    } catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        return $false
    }
}

# Alternative: Manual deployment instructions
function Show-ManualDeployment {
    Write-Warning "Manual Deployment Instructions:"
    Write-Host ""
    Write-Host "Since automated deployment failed, please follow these manual steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Connect to your VPS:" -ForegroundColor White
    Write-Host "   ssh root@$VPS_IP" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Install required packages:" -ForegroundColor White
    Write-Host "   apt update && apt install -y nodejs npm nginx mysql-server git" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Clone your repository:" -ForegroundColor White
    Write-Host "   git clone $REPO_URL /var/www/gkicks" -ForegroundColor Gray
    Write-Host "   cd /var/www/gkicks" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Install dependencies:" -ForegroundColor White
    Write-Host "   npm install" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Setup environment:" -ForegroundColor White
    Write-Host "   cp .env.production.example .env.production" -ForegroundColor Gray
    Write-Host "   nano .env.production  # Edit with your settings" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. Setup database:" -ForegroundColor White
    Write-Host "   mysql -u root -p < database/complete-mysql-schema.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "7. Build and start:" -ForegroundColor White
    Write-Host "   npm run build" -ForegroundColor Gray
    Write-Host "   npm install -g pm2" -ForegroundColor Gray
    Write-Host "   pm2 start ecosystem.config.js --env production" -ForegroundColor Gray
    Write-Host ""
    Write-Host "8. Configure Nginx:" -ForegroundColor White
    Write-Host "   cp nginx/sites-available/gkicks.conf /etc/nginx/sites-available/" -ForegroundColor Gray
    Write-Host "   ln -s /etc/nginx/sites-available/gkicks.conf /etc/nginx/sites-enabled/" -ForegroundColor Gray
    Write-Host "   nginx -t && systemctl restart nginx" -ForegroundColor Gray
    Write-Host ""
    Write-Host "9. Setup SSL:" -ForegroundColor White
    Write-Host "   apt install -y certbot python3-certbot-nginx" -ForegroundColor Gray
    Write-Host "   certbot --nginx -d $DOMAIN -d www.$DOMAIN" -ForegroundColor Gray
}

# Show DNS setup instructions
function Show-DNSSetup {
    Write-Status "DNS Configuration Required:"
    Write-Host "Please configure your domain DNS settings:" -ForegroundColor Cyan
    Write-Host "Domain: $DOMAIN" -ForegroundColor White
    Write-Host "A Record: @ -> $VPS_IP" -ForegroundColor Gray
    Write-Host "A Record: www -> $VPS_IP" -ForegroundColor Gray
    Write-Host "A Record: admin -> $VPS_IP (optional for admin subdomain)" -ForegroundColor Gray
    Write-Host ""
}

# Main deployment function
function Main {
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "   GKicks VPS Deployment Script" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "VPS IP: $VPS_IP" -ForegroundColor White
    Write-Host "Domain: $DOMAIN" -ForegroundColor White
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check VPS connection
    if (-not (Test-VPSConnection)) {
        return
    }
    
    # Show DNS setup instructions
    Show-DNSSetup
    
    # Check if SSH is available
    if (-not (Test-SSHAvailable)) {
        Show-ManualDeployment
        return
    }
    
    # Confirm deployment
    $response = Read-Host "Do you want to proceed with automated deployment? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        if (Deploy-ToVPS) {
            Write-Host ""
            Write-Success "Deployment Summary:"
            Write-Host "• VPS IP: $VPS_IP" -ForegroundColor White
            Write-Host "• Domain: $DOMAIN" -ForegroundColor White
            Write-Host "• Application URL: https://$DOMAIN" -ForegroundColor White
            Write-Host "• Admin Panel: https://admin.$DOMAIN (if configured)" -ForegroundColor White
            Write-Host ""
            Write-Warning "Next Steps:"
            Write-Host "1. Configure your domain DNS to point to $VPS_IP" -ForegroundColor Gray
            Write-Host "2. Wait for DNS propagation (5-30 minutes)" -ForegroundColor Gray
            Write-Host "3. SSL certificates will be automatically generated" -ForegroundColor Gray
            Write-Host "4. Monitor logs: ssh $USER@$VPS_IP 'pm2 logs'" -ForegroundColor Gray
        } else {
            Write-Warning "Automated deployment failed. Showing manual instructions..."
            Show-ManualDeployment
        }
    } else {
        Write-Warning "Deployment cancelled. Showing manual instructions..."
        Show-ManualDeployment
    }
}

# Run main function
Main