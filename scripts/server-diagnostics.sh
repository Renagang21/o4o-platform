#!/bin/bash

# Server-side diagnostics for web deployments
# Run this on the web server to diagnose deployment issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== O4O Platform Server Diagnostics ===${NC}"
echo "Running on: $(hostname)"
echo "Date: $(date)"
echo ""

# 1. Check Nginx status
echo -e "${YELLOW}1. Nginx Status:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
    nginx -v
else
    echo -e "${RED}❌ Nginx is not running${NC}"
    sudo systemctl status nginx --no-pager || true
fi

# 2. Check Nginx configuration
echo -e "\n${YELLOW}2. Nginx Configuration:${NC}"
if sudo nginx -t 2>&1; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
fi

# 3. Check site configurations
echo -e "\n${YELLOW}3. Site Configurations:${NC}"
for site in neture.co.kr admin.neture.co.kr; do
    if [ -f "/etc/nginx/sites-enabled/$site" ]; then
        echo -e "${GREEN}✅ $site config is enabled${NC}"
        
        # Check document root
        DOC_ROOT=$(grep -E "^\s*root" /etc/nginx/sites-enabled/$site | head -1 | awk '{print $2}' | tr -d ';')
        echo "  Document root: $DOC_ROOT"
        
        if [ -d "$DOC_ROOT" ]; then
            echo -e "  ${GREEN}✅ Document root exists${NC}"
            
            # Check for index.html
            if [ -f "$DOC_ROOT/index.html" ]; then
                echo -e "  ${GREEN}✅ index.html exists${NC}"
                echo "  File size: $(ls -lh $DOC_ROOT/index.html | awk '{print $5}')"
            else
                echo -e "  ${RED}❌ index.html not found${NC}"
            fi
            
            # Check permissions
            OWNER=$(stat -c '%U:%G' $DOC_ROOT)
            if [ "$OWNER" = "www-data:www-data" ]; then
                echo -e "  ${GREEN}✅ Correct ownership (www-data)${NC}"
            else
                echo -e "  ${YELLOW}⚠️ Ownership is $OWNER (should be www-data:www-data)${NC}"
            fi
            
            # List files
            echo "  Files in document root:"
            ls -la $DOC_ROOT | head -10
        else
            echo -e "  ${RED}❌ Document root does not exist${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ $site config not found in sites-enabled${NC}"
    fi
    echo ""
done

# 4. Check SSL certificates
echo -e "${YELLOW}4. SSL Certificates:${NC}"
for domain in neture.co.kr admin.neture.co.kr; do
    CERT_PATH="/etc/letsencrypt/live/$domain/fullchain.pem"
    if [ -f "$CERT_PATH" ]; then
        echo -e "${GREEN}✅ Certificate exists for $domain${NC}"
        
        # Check expiry
        EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
        echo "  Expires: $EXPIRY"
        
        # Check if expired
        if openssl x509 -checkend 0 -noout -in "$CERT_PATH"; then
            echo -e "  ${GREEN}✅ Certificate is valid${NC}"
        else
            echo -e "  ${RED}❌ Certificate has expired${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ No certificate found for $domain${NC}"
    fi
done

# 5. Check ports
echo -e "\n${YELLOW}5. Port Status:${NC}"
for port in 80 443; do
    if sudo ss -tlnp | grep -q ":$port "; then
        echo -e "${GREEN}✅ Port $port is listening${NC}"
        sudo ss -tlnp | grep ":$port " | head -1
    else
        echo -e "${RED}❌ Port $port is not listening${NC}"
    fi
done

# 6. Check firewall
echo -e "\n${YELLOW}6. Firewall Status:${NC}"
if command -v ufw &> /dev/null; then
    sudo ufw status | grep -E "(80|443|22)" || echo "No HTTP/HTTPS rules found"
else
    echo "UFW not installed"
fi

# 7. Check disk space
echo -e "\n${YELLOW}7. Disk Space:${NC}"
df -h | grep -E "(/$|/var)" || df -h

# 8. Check recent Nginx errors
echo -e "\n${YELLOW}8. Recent Nginx Errors:${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Last 10 error log entries:"
    sudo tail -10 /var/log/nginx/error.log
else
    echo "No error log found"
fi

# 9. Test local connectivity
echo -e "\n${YELLOW}9. Local Connectivity Test:${NC}"
for site in neture.co.kr admin.neture.co.kr; do
    echo -n "Testing $site locally: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $site" http://localhost || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
    else
        echo -e "${RED}❌ HTTP $HTTP_CODE${NC}"
    fi
done

# 10. Check processes
echo -e "\n${YELLOW}10. Web-related Processes:${NC}"
ps aux | grep -E "(nginx|apache|node|pm2)" | grep -v grep || echo "No web processes found"

echo -e "\n${BLUE}=== Diagnostics Complete ===${NC}"

# Recommendations
echo -e "\n${YELLOW}Recommendations:${NC}"
if ! systemctl is-active --quiet nginx; then
    echo "1. Start Nginx: sudo systemctl start nginx"
fi

if [ ! -f "/var/www/neture.co.kr/index.html" ]; then
    echo "2. Check deployment - index.html is missing"
fi

if ! sudo nginx -t &>/dev/null; then
    echo "3. Fix Nginx configuration errors"
fi

echo -e "\n${YELLOW}Quick fixes to try:${NC}"
echo "1. Reload Nginx: sudo systemctl reload nginx"
echo "2. Check logs: sudo tail -f /var/log/nginx/error.log"
echo "3. Fix permissions: sudo chown -R www-data:www-data /var/www/"
echo "4. Test config: sudo nginx -t"