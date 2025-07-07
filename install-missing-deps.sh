#!/bin/bash
# Install missing dependencies

echo "=== Installing Missing Dependencies ==="
echo ""

cd ~/projects/o4o-platform/apps/api-server

# Install missing runtime dependencies
echo "1. Installing runtime dependencies..."
npm install cookie-parser compression express-session ioredis node-cron

# Install missing type definitions
echo ""
echo "2. Installing type definitions..."
npm install --save-dev @types/cookie-parser @types/compression @types/express-session @types/node-cron

# Check if all installations were successful
echo ""
echo "3. Verifying installations..."
echo "cookie-parser:"
npm list cookie-parser

echo ""
echo "compression:"
npm list compression

echo ""
echo "ioredis:"
npm list ioredis

echo ""
echo "node-cron:"
npm list node-cron

echo ""
echo "=== Dependency installation complete ==="