#!/bin/bash

# Fix cache issue for Admin Dashboard deployment
# This script adds cache-control headers and version tracking

echo "🔧 Fixing cache issues for Admin Dashboard..."

# 1. Create version file with timestamp
VERSION=$(date +%s)
echo "{\"version\": \"$VERSION\", \"buildTime\": \"$(date)\"}" > apps/admin-dashboard/dist/version.json

# 2. Add meta tags to index.html for cache control
if [ -f "apps/admin-dashboard/dist/index.html" ]; then
    # Backup original
    cp apps/admin-dashboard/dist/index.html apps/admin-dashboard/dist/index.html.backup
    
    # Add cache-control meta tags after <head>
    sed -i '/<head>/a\
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\
    <meta http-equiv="Pragma" content="no-cache">\
    <meta http-equiv="Expires" content="0">\
    <meta name="build-version" content="'$VERSION'">' apps/admin-dashboard/dist/index.html
    
    echo "✅ Added cache-control meta tags to index.html"
fi

# 3. Create .htaccess for Apache (if using Apache)
cat > apps/admin-dashboard/dist/.htaccess << 'EOF'
# Disable caching for HTML files
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires 0
</FilesMatch>

# Enable long-term caching for hashed assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
EOF

echo "✅ Created .htaccess with cache control rules"

# 4. Create nginx cache configuration (if using Nginx)
cat > apps/admin-dashboard/dist/nginx-cache.conf << 'EOF'
# For HTML files - no cache
location ~* \.(html)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires 0;
}

# For hashed assets - long cache
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
EOF

echo "✅ Created nginx-cache.conf with cache control rules"

# 5. Create cache-buster HTML with forced reload
cat > apps/admin-dashboard/dist/force-reload.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Updating...</title>
    <script>
        // Force clear cache and reload
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names)
                    caches.delete(name);
            });
        }
        
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Force reload with cache bypass
        setTimeout(() => {
            window.location.href = window.location.origin + '?v=' + Date.now();
        }, 1000);
    </script>
</head>
<body>
    <h1>Clearing cache and updating to latest version...</h1>
</body>
</html>
EOF

echo "✅ Created force-reload.html helper page"

echo ""
echo "📝 Instructions for webserver:"
echo "1. If using Apache, the .htaccess file will handle cache headers automatically"
echo "2. If using Nginx, include the nginx-cache.conf in your server block"
echo "3. Users can visit /force-reload.html to force clear their cache"
echo "4. The version.json file tracks the current build version"
echo ""
echo "🎯 Quick fix for current users:"
echo "   Tell them to visit: https://admin.neture.co.kr/force-reload.html"
echo "   Or press: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"