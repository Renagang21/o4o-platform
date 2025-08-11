#!/bin/bash

# Setup script for AWS Lightsail monitoring and optimization
# Addresses common Lightsail issues: CPU burst, memory, idle timeout

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Create swap file (Critical for Lightsail)
setup_swap() {
    print_status "Checking swap configuration..."
    
    SWAP_SIZE=$(free | grep Swap | awk '{print $2}')
    if [ "$SWAP_SIZE" -eq 0 ]; then
        print_warning "No swap detected. Creating 2GB swap file..."
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        
        # Optimize swappiness for web server
        echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
        sudo sysctl -p
        
        print_status "✓ Swap file created and configured"
    else
        print_status "✓ Swap already configured"
    fi
}

# 2. Optimize nginx configuration
optimize_nginx() {
    print_status "Optimizing nginx configuration..."
    
    # Backup existing config
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d)
    
    # Create optimized config
    cat << 'EOF' | sudo tee /etc/nginx/sites-available/lightsail-optimized.conf
# Optimized nginx config for AWS Lightsail
server {
    listen 80;
    server_name neture.co.kr www.neture.co.kr;
    
    # Main site
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings to prevent idle disconnect
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Keep-alive settings
        proxy_set_header Connection "";
        proxy_buffering off;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

server {
    listen 80;
    server_name admin.neture.co.kr;
    
    # Admin dashboard
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

server {
    listen 80;
    server_name api.neture.co.kr;
    
    # API server
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings for API
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
    
    # Update main nginx.conf for keep-alive
    sudo sed -i '/http {/a \    keepalive_timeout 120s;\n    keepalive_requests 100;' /etc/nginx/nginx.conf
    
    # Test configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        print_status "✓ Nginx optimized and reloaded"
    else
        print_error "Nginx configuration error. Restoring backup..."
        sudo cp /etc/nginx/nginx.conf.backup.$(date +%Y%m%d) /etc/nginx/nginx.conf
    fi
}

# 3. Setup systemd service for monitoring
setup_monitoring_service() {
    print_status "Setting up monitoring service..."
    
    # Make monitor script executable
    chmod +x /home/ubuntu/o4o-platform/scripts/lightsail-keep-alive.sh
    
    # Create systemd service
    cat << 'EOF' | sudo tee /etc/systemd/system/lightsail-monitor.service
[Unit]
Description=AWS Lightsail Keep-Alive Monitor
After=network.target nginx.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/o4o-platform
ExecStart=/home/ubuntu/o4o-platform/scripts/lightsail-keep-alive.sh
Restart=always
RestartSec=10
StandardOutput=append:/var/log/lightsail-monitor.log
StandardError=append:/var/log/lightsail-monitor.error.log

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable lightsail-monitor.service
    sudo systemctl start lightsail-monitor.service
    
    print_status "✓ Monitoring service installed and started"
}

# 4. Setup cron jobs for maintenance
setup_cron_jobs() {
    print_status "Setting up maintenance cron jobs..."
    
    # Add cron jobs
    (crontab -l 2>/dev/null || true; echo "# Lightsail maintenance jobs") | crontab -
    (crontab -l; echo "0 5 * * * sudo systemctl restart nginx # Daily nginx restart at 5am") | crontab -
    (crontab -l; echo "*/30 * * * * curl -s http://localhost/health > /dev/null # Health check every 30 min") | crontab -
    (crontab -l; echo "0 */6 * * * pm2 flush # Clear PM2 logs every 6 hours") | crontab -
    
    print_status "✓ Cron jobs configured"
}

# 5. Optimize system settings
optimize_system() {
    print_status "Optimizing system settings..."
    
    # Increase file descriptors
    echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
    echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    
    # Optimize network settings
    cat << 'EOF' | sudo tee -a /etc/sysctl.conf
# Network optimizations for web server
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
EOF
    
    sudo sysctl -p
    
    print_status "✓ System settings optimized"
}

# 6. Setup CloudWatch monitoring (optional)
setup_cloudwatch() {
    print_status "Setting up CloudWatch monitoring..."
    
    # Check if AWS CLI is installed
    if command -v aws &> /dev/null; then
        # Create CloudWatch alarm for high CPU
        aws cloudwatch put-metric-alarm \
            --alarm-name "Lightsail-HighCPU" \
            --alarm-description "Alarm when CPU exceeds 80%" \
            --metric-name CPUUtilization \
            --namespace AWS/Lightsail \
            --statistic Average \
            --period 300 \
            --threshold 80 \
            --comparison-operator GreaterThanThreshold \
            --evaluation-periods 2 \
            2>/dev/null || print_warning "CloudWatch alarm creation failed (may already exist)"
        
        print_status "✓ CloudWatch monitoring configured"
    else
        print_warning "AWS CLI not installed. Skipping CloudWatch setup"
    fi
}

# Main execution
main() {
    print_status "========================================="
    print_status "AWS Lightsail Optimization Setup"
    print_status "========================================="
    
    setup_swap
    optimize_nginx
    setup_monitoring_service
    setup_cron_jobs
    optimize_system
    setup_cloudwatch
    
    print_status "========================================="
    print_status "✓ Setup complete!"
    print_status "========================================="
    print_status ""
    print_status "Next steps:"
    print_status "1. Check monitor status: sudo systemctl status lightsail-monitor"
    print_status "2. View logs: tail -f /var/log/lightsail-monitor.log"
    print_status "3. Test health endpoint: curl http://localhost/health"
    print_status ""
    print_status "The system is now optimized for AWS Lightsail!"
}

# Run main function
main