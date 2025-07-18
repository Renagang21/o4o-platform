#!/bin/bash
# Validate deployment environment before proceeding

echo "🔍 Validating deployment environment..."
echo "======================================"

# Check Node.js version
echo -n "Node.js version: "
node --version
if ! node --version | grep -q "v20"; then
  echo "⚠️  Warning: Expected Node.js v20.x"
fi

# Check npm version
echo -n "npm version: "
npm --version

# Check if we're in the correct directory
echo -n "Current directory: "
pwd

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found in current directory"
  exit 1
fi

# Check workspace configuration
echo ""
echo "📦 Workspace Configuration:"
if [ -f "package.json" ] && grep -q '"workspaces"' package.json; then
  echo "✅ Workspaces configured"
  echo "Workspaces:"
  node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).workspaces.join(', '))"
else
  echo "❌ No workspaces found in package.json"
fi

# Check if all packages exist
echo ""
echo "📁 Package directories:"
for pkg in types utils ui auth-client auth-context; do
  if [ -d "packages/$pkg" ]; then
    echo "✅ packages/$pkg exists"
  else
    echo "❌ packages/$pkg missing"
  fi
done

# Check if all apps exist
echo ""
echo "📁 Application directories:"
for app in api-server main-site admin-dashboard; do
  if [ -d "apps/$app" ]; then
    echo "✅ apps/$app exists"
  else
    echo "❌ apps/$app missing"
  fi
done

# Check if scripts exist
echo ""
echo "📜 Required scripts:"
for script in build-packages.sh setup-ci-env.sh debug-ssh-key.sh; do
  if [ -f "scripts/$script" ]; then
    echo "✅ scripts/$script exists"
  else
    echo "❌ scripts/$script missing"
  fi
done

echo ""
echo "======================================"
echo "✅ Environment validation complete"