#!/bin/bash

# Server memory optimization script for low-memory environments
# Run this on the server to optimize Node.js and npm for limited memory

set -e

echo "🔧 Optimizing server for low memory environment..."

# Create swap file if not exists (2GB)
if [ ! -f /swapfile ]; then
    echo "Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap file created"
else
    echo "ℹ️  Swap file already exists"
fi

# Configure npm for low memory
echo "Configuring npm..."
npm config set jobs 1
npm config set maxsockets 3
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
echo "✅ npm configured for low memory"

# Create .npmrc with memory settings
cat > ~/.npmrc << 'EOF'
jobs=1
maxsockets=3
fetch-retries=5
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
EOF

# Configure Node.js memory limits
echo "Setting Node.js memory limits..."
cat > ~/set-node-options.sh << 'EOF'
#!/bin/bash
export NODE_OPTIONS="--max-old-space-size=1024"
export NODE_ENV=production
EOF
chmod +x ~/set-node-options.sh

# Add to .bashrc if not already there
if ! grep -q "set-node-options.sh" ~/.bashrc; then
    echo "source ~/set-node-options.sh" >> ~/.bashrc
fi

# Configure PM2 for low memory
echo "Configuring PM2..."
pm2 set pm2:max_memory_restart 500M
pm2 set pm2:min_uptime 10000
pm2 set pm2:max_restarts 10

# Create PM2 ecosystem file with memory limits
cat > ~/o4o-platform/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'api-server',
    script: './apps/api-server/dist/server.js',
    cwd: '/home/ubuntu/o4o-platform',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    merge_logs: true,
    time: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Clean npm cache and unused packages
echo "Cleaning up..."
npm cache clean --force
sudo apt-get autoremove -y
sudo apt-get clean

# Show memory status
echo ""
echo "📊 Current memory status:"
free -h
echo ""
echo "💾 Swap status:"
swapon --show
echo ""
echo "✅ Server optimization complete!"
echo ""
echo "🔄 Please run: source ~/.bashrc"
echo "   or logout and login again to apply changes"