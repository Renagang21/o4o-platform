#!/bin/bash

# Health check script for deployed sites
# Usage: ./check-deployment.sh [site-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to main site
SITE=${1:-main}

case $SITE in
  main)
    URL="https://neture.co.kr"
    SERVER_IP="13.125.144.8"
    DEPLOY_PATH="/var/www/neture.co.kr"
    ;;
  admin)
    URL="https://admin.neture.co.kr"
    SERVER_IP="13.125.144.8"
    DEPLOY_PATH="/var/www/admin.neture.co.kr"
    ;;
  api)
    URL="https://api.neture.co.kr"
    SERVER_IP="43.202.242.215"
    DEPLOY_PATH="/home/ubuntu/o4o-platform/apps/api-server"
    ;;
  *)
    echo "Unknown site: $SITE"
    echo "Usage: $0 [main|admin|api]"
    exit 1
    ;;
esac

echo "🔍 Checking deployment for: $URL"
echo "================================"

# 1. DNS Check
echo -e "\n${YELLOW}1. DNS Resolution:${NC}"
DNS_RESULT=$(dig +short $(echo $URL | sed 's|https://||') | tail -1)
if [ -n "$DNS_RESULT" ]; then
  echo -e "${GREEN}✅ DNS resolves to: $DNS_RESULT${NC}"
  if [ "$DNS_RESULT" = "$SERVER_IP" ]; then
    echo -e "${GREEN}✅ DNS points to correct server${NC}"
  else
    echo -e "${RED}❌ DNS does not point to expected server ($SERVER_IP)${NC}"
  fi
else
  echo -e "${RED}❌ DNS resolution failed${NC}"
fi

# 2. Server Connectivity
echo -e "\n${YELLOW}2. Server Connectivity:${NC}"
if ping -c 1 -W 2 $SERVER_IP > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Server is reachable${NC}"
else
  echo -e "${RED}❌ Cannot reach server${NC}"
fi

# 3. HTTP/HTTPS Check
echo -e "\n${YELLOW}3. HTTP/HTTPS Status:${NC}"

# Check HTTP redirect
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L http://$(echo $URL | sed 's|https://||') 2>/dev/null || echo "000")
echo "HTTP Status: $HTTP_STATUS"

# Check HTTPS
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL 2>/dev/null || echo "000")
echo "HTTPS Status: $HTTPS_STATUS"

if [ "$HTTPS_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Site is accessible${NC}"
else
  echo -e "${RED}❌ Site is not accessible (HTTP $HTTPS_STATUS)${NC}"
fi

# 4. SSL Certificate
echo -e "\n${YELLOW}4. SSL Certificate:${NC}"
SSL_CHECK=$(echo | openssl s_client -connect $(echo $URL | sed 's|https://||'):443 -servername $(echo $URL | sed 's|https://||') 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ -n "$SSL_CHECK" ]; then
  echo -e "${GREEN}✅ SSL certificate is valid${NC}"
  echo "$SSL_CHECK"
else
  echo -e "${RED}❌ SSL certificate check failed${NC}"
fi

# 5. Response Time
echo -e "\n${YELLOW}5. Response Time:${NC}"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' $URL 2>/dev/null || echo "N/A")
if [ "$RESPONSE_TIME" != "N/A" ]; then
  echo -e "${GREEN}✅ Response time: ${RESPONSE_TIME}s${NC}"
else
  echo -e "${RED}❌ Could not measure response time${NC}"
fi

# 6. Content Check
echo -e "\n${YELLOW}6. Content Verification:${NC}"
CONTENT=$(curl -s $URL 2>/dev/null || echo "")
if [ -n "$CONTENT" ]; then
  # Check for specific content based on site
  case $SITE in
    main)
      if echo "$CONTENT" | grep -q "O4O Platform"; then
        echo -e "${GREEN}✅ Content contains expected text${NC}"
      else
        echo -e "${YELLOW}⚠️ Content does not contain expected text${NC}"
      fi
      ;;
    admin)
      if echo "$CONTENT" | grep -q "Admin Dashboard"; then
        echo -e "${GREEN}✅ Content contains expected text${NC}"
      else
        echo -e "${YELLOW}⚠️ Content does not contain expected text${NC}"
      fi
      ;;
    api)
      if echo "$CONTENT" | grep -q "healthy"; then
        echo -e "${GREEN}✅ API health check passed${NC}"
      else
        echo -e "${YELLOW}⚠️ API health check failed${NC}"
      fi
      ;;
  esac
  
  echo "First 200 characters of response:"
  echo "$CONTENT" | head -c 200
  echo "..."
else
  echo -e "${RED}❌ No content received${NC}"
fi

# 7. Check common issues
echo -e "\n${YELLOW}7. Common Issues Check:${NC}"

# Check for 000 error (connection failed)
if [ "$HTTPS_STATUS" = "000" ]; then
  echo -e "${RED}❌ Connection failed - possible causes:${NC}"
  echo "  - Domain not pointing to server"
  echo "  - Nginx not running or misconfigured"
  echo "  - Firewall blocking port 443"
  echo "  - SSL certificate issues"
fi

# Check for 502/503 errors
if [ "$HTTPS_STATUS" = "502" ] || [ "$HTTPS_STATUS" = "503" ]; then
  echo -e "${RED}❌ Backend service error - possible causes:${NC}"
  echo "  - Application not running"
  echo "  - Nginx upstream configuration incorrect"
  echo "  - Application port mismatch"
fi

# Check for 404 errors
if [ "$HTTPS_STATUS" = "404" ]; then
  echo -e "${RED}❌ Content not found - possible causes:${NC}"
  echo "  - Files not deployed to correct location"
  echo "  - Nginx document root misconfigured"
  echo "  - index.html missing"
fi

echo -e "\n${YELLOW}Summary:${NC}"
if [ "$HTTPS_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Deployment appears to be working correctly${NC}"
else
  echo -e "${RED}❌ Deployment has issues that need to be resolved${NC}"
  echo "Run server diagnostics with: ssh ubuntu@$SERVER_IP"
fi