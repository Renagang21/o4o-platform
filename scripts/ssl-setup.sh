#!/bin/bash

# O4O Platform SSL Setup and Management Script
# Usage: ./ssl-setup.sh [setup|verify|renew|troubleshoot]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ACTION=${1:-verify}

print_status() {
    echo -e "${GREEN}[SSL]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Setup SSL with custom ports
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Install certbot if not installed
    if ! command -v certbot &> /dev/null; then
        print_status "Installing certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Domains to setup
    DOMAINS=(
        "neture.co.kr"
        "www.neture.co.kr"
        "admin.neture.co.kr"
        "api.neture.co.kr"
    )
    
    # Setup each domain
    for domain in "${DOMAINS[@]}"; do
        print_status "Setting up SSL for $domain..."
        certbot --nginx -d "$domain" \
            --non-interactive \
            --agree-tos \
            --email admin@neture.co.kr \
            --redirect
    done
    
    # Configure custom ports (8443)
    print_status "Configuring custom HTTPS port 8443..."
    
    # Update Nginx configs for custom port
    for domain in "${DOMAINS[@]}"; do
        config_file="/etc/nginx/sites-available/$domain"
        if [[ -f "$config_file" ]]; then
            # Add listen 8443 ssl directive
            sed -i '/listen 443 ssl;/a\    listen 8443 ssl;' "$config_file"
            sed -i '/listen \[::\]:443 ssl;/a\    listen [::]:8443 ssl;' "$config_file"
        fi
    done
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    
    print_status "SSL setup completed!"
}

# Verify SSL certificates
verify_ssl() {
    print_status "Verifying SSL certificates..."
    
    DOMAINS=(
        "neture.co.kr:8443"
        "www.neture.co.kr:8443"
        "admin.neture.co.kr:8443"
        "api.neture.co.kr:443"
    )
    
    for domain in "${DOMAINS[@]}"; do
        print_info "Checking $domain..."
        
        # Extract host and port
        host="${domain%:*}"
        port="${domain##*:}"
        
        # Check certificate
        if openssl s_client -connect "$host:$port" -servername "$host" </dev/null 2>/dev/null | openssl x509 -noout -text | grep -q "CN=$host"; then
            print_status "✓ $domain - SSL certificate valid"
            
            # Check expiration
            expiry=$(echo | openssl s_client -connect "$host:$port" -servername "$host" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
            print_info "  Expires: $expiry"
        else
            print_error "✗ $domain - SSL certificate invalid or not found"
        fi
    done
}

# Renew SSL certificates
renew_ssl() {
    print_status "Renewing SSL certificates..."
    
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Test renewal
    certbot renew --dry-run
    
    # If dry run successful, do actual renewal
    if [[ $? -eq 0 ]]; then
        print_status "Performing actual renewal..."
        certbot renew
        systemctl reload nginx
        print_status "SSL certificates renewed successfully!"
    else
        print_error "Renewal dry-run failed. Please check the errors above."
        exit 1
    fi
}

# Troubleshoot SSL issues
troubleshoot_ssl() {
    print_status "Troubleshooting SSL configuration..."
    
    # Check Nginx configuration
    print_info "Checking Nginx configuration..."
    nginx -t
    
    # Check certificate files
    print_info "Checking certificate files..."
    ls -la /etc/letsencrypt/live/*/
    
    # Check port bindings
    print_info "Checking port bindings..."
    netstat -tlnp | grep -E ':(443|8443)'
    
    # Check firewall
    print_info "Checking firewall rules..."
    ufw status | grep -E '(443|8443)'
    
    # Check certificate status
    print_info "Certificate status:"
    certbot certificates
    
    # Check Nginx error logs
    print_info "Recent Nginx errors:"
    tail -20 /var/log/nginx/error.log
}

# Main execution
case "$ACTION" in
    setup)
        setup_ssl
        ;;
    verify)
        verify_ssl
        ;;
    renew)
        renew_ssl
        ;;
    troubleshoot)
        troubleshoot_ssl
        ;;
    *)
        print_error "Invalid action: $ACTION"
        echo "Usage: $0 [setup|verify|renew|troubleshoot]"
        exit 1
        ;;
esac