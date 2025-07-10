#!/bin/bash

# Common-Core Auth System Verification Script

echo "========================================="
echo "Common-Core Auth System Status Check"
echo "========================================="

# Check PostgreSQL
echo -e "\n1. PostgreSQL Status:"
sudo systemctl status postgresql --no-pager | grep -E "Active:|Main PID:" || echo "PostgreSQL not running"

# Check database
echo -e "\n2. Database Check:"
sudo -u postgres psql -c "\l" | grep common_core_auth || echo "Database 'common_core_auth' not found"

# Check if repository exists
echo -e "\n3. Repository Check:"
if [ -d "/home/ubuntu/common-core" ]; then
    echo "✓ Repository exists at /home/ubuntu/common-core"
    cd /home/ubuntu/common-core
    echo "Current branch: $(git branch --show-current)"
    echo "Last commit: $(git log -1 --oneline)"
else
    echo "✗ Repository not found"
fi

# Check Node.js version
echo -e "\n4. Node.js Version:"
node --version || echo "Node.js not installed"

# Check PM2 process
echo -e "\n5. PM2 Process Status:"
pm2 describe common-core-auth || echo "Process 'common-core-auth' not found"

# Check if service is listening on port 5000
echo -e "\n6. Port 5000 Status:"
sudo netstat -tlnp | grep :5000 || sudo lsof -i :5000 || echo "Nothing listening on port 5000"

# Check service health
echo -e "\n7. Service Health Check:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5000/health || echo "Service not responding"

# Check logs
echo -e "\n8. Recent Logs (last 20 lines):"
pm2 logs common-core-auth --lines 20 --nostream || echo "No logs available"

# Check environment variables
echo -e "\n9. Environment File Check:"
if [ -f "/home/ubuntu/common-core/auth/backend/.env" ]; then
    echo "✓ .env file exists"
    echo "Configured OAuth providers:"
    grep -E "GOOGLE_CLIENT_ID|GITHUB_CLIENT_ID" /home/ubuntu/common-core/auth/backend/.env | sed 's/=.*/=***/' || echo "No OAuth providers configured"
else
    echo "✗ .env file not found"
fi

echo -e "\n========================================="
echo "Status check completed!"
echo "========================================="