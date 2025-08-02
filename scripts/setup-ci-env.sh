#!/bin/bash
# Setup CI environment for proper workspace resolution

set -e

echo "🔧 Setting up CI environment..."

# Ensure npm workspaces are properly installed
echo "📦 Installing all dependencies with workspaces..."
if [ -f "package-lock.json" ]; then
  npm ci
else
  echo "⚠️  No package-lock.json found, using npm install instead"
  npm install --no-save
fi

# Skip individual package installs - workspaces handle this
echo "✅ Workspace dependencies installed"

# Force workspace linking
echo "🔗 Ensuring workspace links..."
npm ls @o4o/types @o4o/utils @o4o/ui @o4o/auth-client @o4o/auth-context || true

# Create symlinks if needed (for CI environments that don't handle file: dependencies well)
echo "🔗 Creating manual symlinks for packages..."

# First, ensure package node_modules directories exist
for pkg in types utils ui auth-client auth-context; do
  mkdir -p "packages/$pkg/node_modules/@o4o"
done

# Create inter-package symlinks
echo "  Linking auth-client to auth-context..."
if [ ! -L "packages/auth-context/node_modules/@o4o/auth-client" ]; then
  rm -rf "packages/auth-context/node_modules/@o4o/auth-client"
  ln -s "../../../auth-client" "packages/auth-context/node_modules/@o4o/auth-client"
fi

if [ ! -L "packages/auth-context/node_modules/@o4o/types" ]; then
  rm -rf "packages/auth-context/node_modules/@o4o/types"
  ln -s "../../../types" "packages/auth-context/node_modules/@o4o/types"
fi

# Create app-level symlinks
for pkg in types utils ui auth-client auth-context; do
  for app in api-server main-site admin-dashboard; do
    if [ -d "apps/$app" ]; then
      mkdir -p "apps/$app/node_modules/@o4o"
      if [ ! -L "apps/$app/node_modules/@o4o/$pkg" ]; then
        echo "  Creating symlink for @o4o/$pkg in $app"
        rm -rf "apps/$app/node_modules/@o4o/$pkg"
        ln -s "../../../../packages/$pkg" "apps/$app/node_modules/@o4o/$pkg"
      fi
    fi
  done
done

# Verify symlinks
echo "🔍 Verifying symlinks..."
ls -la packages/auth-context/node_modules/@o4o/ || true
ls -la apps/main-site/node_modules/@o4o/ || true

echo "✅ CI environment setup complete!"