#!/bin/bash
# Generate temporary package-lock.json for testing

echo "🔧 Attempting to generate package-lock.json..."

# Method 1: Try with minimal package.json
echo "Method 1: Minimal package.json approach"
cat > temp-package.json << EOF
{
  "name": "o4o-platform-temp",
  "version": "1.0.0",
  "description": "Temporary for lockfile generation",
  "engines": {
    "node": ">=22.0.0 <23.0.0",
    "npm": ">=10.9.0"
  }
}
EOF

# Try to generate with temp file
npm install --package-lock-only --prefix . --package=./temp-package.json 2>&1 | head -20

# Method 2: Docker approach (if available)
if command -v docker &> /dev/null; then
  echo "Method 2: Docker approach"
  echo "docker run --rm -v $(pwd):/app -w /app node:22.18.0-alpine npm install --package-lock-only"
else
  echo "Docker not available"
fi

# Method 3: Create minimal valid lockfile manually
echo "Method 3: Creating minimal valid package-lock.json"
cat > package-lock.json.template << 'EOF'
{
  "name": "o4o-platform",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "o4o-platform",
      "version": "1.0.0",
      "workspaces": [
        "apps/*",
        "packages/*"
      ],
      "engines": {
        "node": ">=22.0.0 <23.0.0",
        "npm": ">=10.9.0"
      }
    }
  }
}
EOF

echo "✅ Template created as package-lock.json.template"
echo "This can be used as a starting point if other methods fail"

# Cleanup
rm -f temp-package.json