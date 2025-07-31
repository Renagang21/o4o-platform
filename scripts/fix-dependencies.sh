#!/bin/bash

# Fix O4O Platform Dependency Issues
# This script updates dependencies to match the documented versions

echo "🔧 Fixing O4O Platform dependencies..."

# Update root package.json
echo "📦 Updating root dependencies..."
npm install concurrently@^7.6.0 --save-dev

# Update main-site dependencies
echo "📦 Updating main-site dependencies..."
cd apps/main-site
npm install @types/react@^19.1.2 @types/react-dom@^19.1.2 --save-dev
npm install socket.io-client@^4.7.4 --save

# Update admin-dashboard dependencies  
echo "📦 Updating admin-dashboard dependencies..."
cd ../admin-dashboard
npm install @types/react@^19.1.2 @types/react-dom@^19.1.2 --save-dev
npm install socket.io-client@^4.7.4 --save

# Update packages/ui dependencies
echo "📦 Updating packages/ui dependencies..."
cd ../../packages/ui
npm install @types/react@^19.1.2 @types/react-dom@^19.1.2 --save-dev

# Return to root
cd ../..

echo "✅ Dependency fixes complete!"
echo "📋 Next steps:"
echo "  1. Run 'npm install' to install all dependencies"
echo "  2. Run 'npm run build:packages' to build shared packages"
echo "  3. Run 'npm run type-check' to verify TypeScript"
echo "  4. Run 'npm run lint' to check code quality"