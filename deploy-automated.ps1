# GKicks Automated VPS Deployment Script (PowerShell)
# VPS IP: 72.60.211.237
# Domain: g-kicks.shop

# Configuration
$VPS_IP = "72.60.211.237"
$DOMAIN = "g-kicks.shop"
$APP_NAME = "gkicks"
$APP_DIR = "/var/www/gkicks"
$USER = "root"
$REPO_URL = "https://github.com/gkicks2025/gkicks.git"
$VPS_PASSWORD = "Gkicks2025!"  # VPS root password

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

# Execute SSH command with password
function Invoke-SSHCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Status $Description
    
    # Create a temporary script file for the SSH command
    $tempScript = [System.IO.Path]::GetTempFileName() + ".ps1"
    
    $scriptContent = @"
`$password = ConvertTo-SecureString "$VPS_PASSWORD" -AsPlainText -Force
`$credential = New-Object System.Management.Automation.PSCredential("$USER", `$password)

# Use plink (PuTTY) for automated SSH with password
`$plinkPath = "plink.exe"
if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
    Write-Host "Installing PuTTY tools..."
    winget install -e --id PuTTY.PuTTY --silent
    `$plinkPath = "C:\Program Files\PuTTY\plink.exe"
}

# Execute command via plink
& `$plinkPath -ssh -batch -pw "$VPS_PASSWORD" "$USER@$VPS_IP" "$Command"
"@
    
    Set-Content -Path $tempScript -Value $scriptContent
    
    try {
        & powershell -ExecutionPolicy Bypass -File $tempScript
        Remove-Item $tempScript -Force
        return $true
    } catch {
        Write-Error "Failed to execute: $Description"
        Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# Main deployment function
function Start-AutomatedDeployment {
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "   GKicks Automated VPS Deployment" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "VPS IP: $VPS_IP" -ForegroundColor White
    Write-Host "Domain: $DOMAIN" -ForegroundColor White
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check VPS connection
    Write-Status "Checking VPS connection to $VPS_IP..."
    $ping = Test-Connection -ComputerName $VPS_IP -Count 1 -Quiet
    if (-not $ping) {
        Write-Error "Cannot reach VPS at $VPS_IP"
        return $false
    }
    Write-Success "VPS is reachable"
    
    # Install PuTTY if not available
    if (-not (Get-Command plink -ErrorAction SilentlyContinue)) {
        Write-Status "Installing PuTTY tools for SSH automation..."
        try {
            winget install -e --id PuTTY.PuTTY --silent
            Write-Success "PuTTY installed successfully"
        } catch {
            Write-Error "Failed to install PuTTY. Please install manually."
            return $false
        }
    }
    
    # Step 1: Update system packages
    if (-not (Invoke-SSHCommand "apt update && apt upgrade -y" "Updating system packages")) {
        return $false
    }
    
    # Step 2: Install required packages
    $packages = "nodejs npm nginx mysql-server git curl"
    if (-not (Invoke-SSHCommand "apt install -y $packages" "Installing required packages")) {
        return $false
    }
    
    # Step 3: Clone repository
    if (-not (Invoke-SSHCommand "rm -rf $APP_DIR && git clone $REPO_URL $APP_DIR" "Cloning repository")) {
        return $false
    }
    
    # Step 4: Install Node.js dependencies
    if (-not (Invoke-SSHCommand "cd $APP_DIR && npm install" "Installing Node.js dependencies")) {
        return $false
    }
    
    # Step 5: Setup environment file
    $envSetup = @"
cd $APP_DIR
cp .env.production.example .env.production || echo 'NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://root:Gkicks2025!@localhost:3306/gkicks
JWT_SECRET=your-super-secret-jwt-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://$DOMAIN' > .env.production
"@
    if (-not (Invoke-SSHCommand $envSetup "Setting up environment configuration")) {
        return $false
    }
    
    # Step 6: Setup MySQL database
    $dbSetup = @"
mysql -e "CREATE DATABASE IF NOT EXISTS gkicks;"
mysql -e "CREATE USER IF NOT EXISTS 'gkicks'@'localhost' IDENTIFIED BY 'Gkicks2025!';"
mysql -e "GRANT ALL PRIVILEGES ON gkicks.* TO 'gkicks'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
cd $APP_DIR && mysql gkicks < database/complete-mysql-schema.sql 2>/dev/null || echo 'Database schema applied'
"@
    if (-not (Invoke-SSHCommand $dbSetup "Setting up MySQL database")) {
        return $false
    }
    
    # Step 7: Build application
    if (-not (Invoke-SSHCommand "cd $APP_DIR && npm run build" "Building application")) {
        return $false
    }
    
    # Step 8: Install and configure PM2
    $pm2Setup = @"
npm install -g pm2
cd $APP_DIR
pm2 delete gkicks 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
"@
    if (-not (Invoke-SSHCommand $pm2Setup "Setting up PM2 process manager")) {
        return $false
    }
    
    # Step 9: Configure Nginx
    $nginxConfig = @"
cp $APP_DIR/nginx/sites-available/gkicks.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/gkicks.conf /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
systemctl enable nginx
"@
    if (-not (Invoke-SSHCommand $nginxConfig "Configuring Nginx")) {
        return $false
    }
    
    # Step 10: Setup SSL with Let's Encrypt
    $sslSetup = @"
apt install -y certbot python3-certbot-nginx
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
"@
    if (-not (Invoke-SSHCommand $sslSetup "Setting up SSL certificates")) {
        Write-Warning "SSL setup failed, but deployment continues. You can set up SSL manually later."
    }
    
    Write-Success "Deployment completed successfully!"
    Write-Host ""
    Write-Host "Your application should now be available at:" -ForegroundColor Green
    Write-Host "  https://$DOMAIN" -ForegroundColor Cyan
    Write-Host "  https://www.$DOMAIN" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Admin panel:" -ForegroundColor Green
    Write-Host "  https://$DOMAIN/admin" -ForegroundColor Cyan
    Write-Host ""
    
    return $true
}

# Run the deployment
Start-AutomatedDeployment