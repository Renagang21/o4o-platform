#!/bin/bash

# Local Development Environment Sync Script
# Usage: ./scripts/sync-local.sh

set -e

echo "🔄 Syncing local development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Git Pull
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git pull origin main

# 2. Check if .env exists
if [ ! -f "apps/api-server/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from example...${NC}"
    cp apps/api-server/.env.example apps/api-server/.env
    echo -e "${RED}❗ Please update apps/api-server/.env with your database credentials${NC}"
    exit 1
fi

# 3. Load environment variables
source apps/api-server/.env

# 4. Create menu_locations table
echo -e "${YELLOW}🗄️  Setting up menu_locations table...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME << 'EOF'
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create menu_locations table
CREATE TABLE IF NOT EXISTS menu_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    order_num INT DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS IDX_menu_locations_key ON menu_locations(key);

-- Insert default menu locations
INSERT INTO menu_locations (key, name, description, is_active, order_num)
VALUES
    ('primary', 'Primary Navigation', 'Main navigation menu', true, 1),
    ('footer', 'Footer Menu', 'Footer navigation menu', true, 2),
    ('mobile', 'Mobile Menu', 'Mobile navigation menu', true, 3),
    ('sidebar', 'Sidebar Menu', 'Sidebar navigation menu', true, 4),
    ('social', 'Social Menu', 'Social media links menu', true, 5),
    ('top-bar', 'Top Bar Menu', 'Top bar navigation menu', true, 6)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- Show current menu locations
SELECT key, name, is_active, order_num FROM menu_locations ORDER BY order_num;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database setup completed${NC}"
else
    echo -e "${RED}❌ Database setup failed${NC}"
    exit 1
fi

# 5. Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd apps/api-server
npm install

# 6. Build the project
echo -e "${YELLOW}🔨 Building API server...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 7. Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    npm install -g pm2
fi

# 8. Restart or start PM2 process
echo -e "${YELLOW}🚀 Starting/Restarting API server...${NC}"
if pm2 list | grep -q "o4o-api-local"; then
    pm2 restart o4o-api-local
    echo -e "${GREEN}✅ API server restarted${NC}"
else
    # Start new PM2 process
    NODE_ENV=development \
    JWT_SECRET=dev-jwt-secret-change-in-production \
    JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production \
    pm2 start dist/main.js --name o4o-api-local
    echo -e "${GREEN}✅ API server started${NC}"
fi

# 9. Show PM2 status
pm2 status o4o-api-local

echo -e "${GREEN}✨ Local environment sync completed!${NC}"
echo -e "${YELLOW}📝 API Server is running at: http://localhost:4000${NC}"
echo -e "${YELLOW}📝 Use 'pm2 logs o4o-api-local' to view logs${NC}"