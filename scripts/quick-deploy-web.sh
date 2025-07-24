#!/bin/bash

# Quick Web Apps Deployment Script
# Deploys main site and admin dashboard in under 30 minutes

set -e

echo "🚀 Quick Web Apps Deployment"
echo "==========================="
echo "Targets: www.neture.co.kr, admin.neture.co.kr"
echo "Start time: $(date)"
echo ""

# Variables
WEB_HOST="neture.co.kr"
WEB_USER="ubuntu"

# Step 1: Check local builds
echo "📦 Step 1: Checking local builds..."

if [ -d "apps/main-site/dist" ]; then
    echo "✅ Main site is built"
else
    echo "❌ Main site not built. Building now..."
    cd apps/main-site
    npm run build
    cd ../..
fi

if [ -d "apps/admin-dashboard/dist" ]; then
    echo "✅ Admin dashboard is built"
else
    echo "❌ Admin dashboard not built. Building now..."
    cd apps/admin-dashboard
    npm run build
    cd ../..
fi

# Step 2: Prepare deployment
echo ""
echo "📦 Step 2: Preparing deployment package..."

# Create deployment structure
rm -rf /tmp/web-deploy
mkdir -p /tmp/web-deploy/{main-site,admin-dashboard,nginx}

# Copy built files
cp -r apps/main-site/dist/* /tmp/web-deploy/main-site/
cp -r apps/admin-dashboard/dist/* /tmp/web-deploy/admin-dashboard/
cp -r nginx/sites-available/{neture.co.kr,admin.neture.co.kr} /tmp/web-deploy/nginx/

# Create deployment script
cat > /tmp/web-deploy/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Setting up web applications..."

# Create directories
sudo mkdir -p /var/www/neture.co.kr
sudo mkdir -p /var/www/admin.neture.co.kr
sudo chown -R ubuntu:ubuntu /var/www

# Copy files
echo "Copying main site files..."
cp -r main-site/* /var/www/neture.co.kr/

echo "Copying admin dashboard files..."
cp -r admin-dashboard/* /var/www/admin.neture.co.kr/

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2 serve
fi

# Stop existing processes
pm2 stop o4o-main-site 2>/dev/null || true
pm2 stop o4o-admin-dashboard 2>/dev/null || true

# Start services with PM2
echo "Starting main site..."
pm2 serve /var/www/neture.co.kr 3000 --name o4o-main-site --spa

echo "Starting admin dashboard..."
pm2 serve /var/www/admin.neture.co.kr 3001 --name o4o-admin-dashboard --spa

# Save PM2 configuration
pm2 save
pm2 startup || true

# Configure Nginx
echo "Configuring Nginx..."
sudo cp nginx/neture.co.kr /etc/nginx/sites-available/
sudo cp nginx/admin.neture.co.kr /etc/nginx/sites-available/

# Enable sites
sudo ln -sf /etc/nginx/sites-available/neture.co.kr /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Web applications deployed!"
EOF

chmod +x /tmp/web-deploy/deploy.sh

# Step 3: Upload to server
echo ""
echo "🚀 Step 3: Uploading to $WEB_HOST..."

# Create tarball for faster transfer
cd /tmp/web-deploy
tar czf web-deploy.tar.gz *
scp web-deploy.tar.gz $WEB_USER@$WEB_HOST:/tmp/

# Extract and deploy on server
echo ""
echo "🔧 Step 4: Deploying on server..."
ssh $WEB_USER@$WEB_HOST << 'EOF'
cd /tmp
rm -rf web-deploy
mkdir web-deploy
cd web-deploy
tar xzf ../web-deploy.tar.gz
./deploy.sh
cd /
rm -rf /tmp/web-deploy*
EOF

# Step 5: Verify deployment
echo ""
echo "🔍 Step 5: Verifying deployment..."
sleep 3

# Check PM2 processes
echo "PM2 Status:"
ssh $WEB_USER@$WEB_HOST "pm2 list"

# Check services
echo ""
echo "Service checks:"

# Main site
if ssh $WEB_USER@$WEB_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" | grep -q "200"; then
    echo "✅ Main site (port 3000) is running"
else
    echo "❌ Main site not responding"
fi

# Admin dashboard
if ssh $WEB_USER@$WEB_HOST "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001" | grep -q "200"; then
    echo "✅ Admin dashboard (port 3001) is running"
else
    echo "❌ Admin dashboard not responding"
fi

# Public URLs
echo ""
echo "Public URL checks:"

if curl -s -o /dev/null -w "%{http_code}" http://www.neture.co.kr | grep -q "200\|301"; then
    echo "✅ www.neture.co.kr is accessible"
else
    echo "⚠️  www.neture.co.kr not accessible (might need SSL)"
fi

if curl -s -o /dev/null -w "%{http_code}" http://admin.neture.co.kr | grep -q "200\|301"; then
    echo "✅ admin.neture.co.kr is accessible"
else
    echo "⚠️  admin.neture.co.kr not accessible (might need SSL)"
fi

# Cleanup
rm -rf /tmp/web-deploy

echo ""
echo "🎉 Web Applications Deployment Complete!"
echo "======================================="
echo "Main Site:"
echo "  Internal: http://localhost:3000"
echo "  Public: http://www.neture.co.kr"
echo ""
echo "Admin Dashboard:"
echo "  Internal: http://localhost:3001"
echo "  Public: http://admin.neture.co.kr"
echo ""
echo "Next steps:"
echo "1. Test in browser"
echo "2. Set up SSL certificates:"
echo "   sudo certbot --nginx -d www.neture.co.kr -d neture.co.kr"
echo "   sudo certbot --nginx -d admin.neture.co.kr"
echo ""
echo "Completed at: $(date)"