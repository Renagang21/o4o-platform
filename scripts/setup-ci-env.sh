#!/bin/bash
# Setup CI environment for proper workspace resolution

set -e

echo "🔧 Setting up CI environment..."

# Ensure npm workspaces are properly installed
echo "📦 Installing all dependencies with workspaces..."
npm ci

# Force workspace linking
echo "🔗 Ensuring workspace links..."
npm ls @o4o/types @o4o/utils @o4o/ui @o4o/auth-client @o4o/auth-context || true

# Create symlinks if needed (for CI environments that don't handle file: dependencies well)
echo "🔗 Creating manual symlinks for packages..."
for pkg in types utils ui auth-client auth-context; do
  for app in api-server main-site admin-dashboard; do
    if [ -d "apps/$app/node_modules/@o4o" ]; then
      if [ ! -L "apps/$app/node_modules/@o4o/$pkg" ]; then
        echo "  Creating symlink for @o4o/$pkg in $app"
        rm -rf "apps/$app/node_modules/@o4o/$pkg"
        ln -s "../../../../packages/$pkg" "apps/$app/node_modules/@o4o/$pkg"
      fi
    fi
  done
done

echo "✅ CI environment setup complete!"