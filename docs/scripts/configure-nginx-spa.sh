#!/bin/bash

# 🔧 Nginx Configuration for React SPA
# Configures Nginx to properly serve React Router applications

echo "🔧 Configuring Nginx for React SPA routing..."

# Create Nginx configuration for React SPA
cat > /tmp/nginx-spa.conf << 'EOF'
server {
    listen 80;
    server_name neture.co.kr www.neture.co.kr;
    root /var/www/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Handle React Router (SPA) - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API proxy (if needed)
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate no_last_modified no_etag auth;
    gzip_types
        text/css
        text/javascript
        text/xml
        text/plain
        text/x-component
        application/javascript
        application/x-javascript
        application/json
        application/xml
        application/rss+xml
        application/atom+xml
        font/truetype
        font/opentype
        application/vnd.ms-fontobject
        image/svg+xml;

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /index.html;
}
EOF

# Upload and apply Nginx configuration
scp /tmp/nginx-spa.conf ubuntu@13.125.144.8:/tmp/nginx-spa.conf

ssh ubuntu@13.125.144.8 << 'EOF'
echo "📋 Applying Nginx configuration..."

# Backup existing configuration
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Apply new configuration
sudo cp /tmp/nginx-spa.conf /etc/nginx/sites-available/default

# Test Nginx configuration
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    echo "✅ Nginx configured and restarted successfully"
    echo "🌐 React SPA routing should now work properly"
else
    echo "❌ Nginx configuration error. Restoring backup..."
    sudo cp /etc/nginx/sites-available/default.backup.* /etc/nginx/sites-available/default
    sudo systemctl restart nginx
    exit 1
fi

# Clean up
rm -f /tmp/nginx-spa.conf
EOF

# Clean up local temp file
rm -f /tmp/nginx-spa.conf

echo "🎉 Nginx SPA configuration completed!"
echo "✅ Features enabled:"
echo "   - React Router support (SPA)"
echo "   - Static asset caching"
echo "   - Gzip compression"
echo "   - Security headers"
echo "   - API proxy (port 4000)"
echo "   - Health check endpoint"