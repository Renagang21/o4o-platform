#!/bin/bash
# Security audit fallback when package-lock.json is missing

echo "🔒 Security Audit Fallback"
echo "========================="
echo ""
echo "⚠️  npm audit requires package-lock.json"
echo "Running alternative security checks..."
echo ""

# Check for known vulnerable packages
VULNERABLE_PACKAGES=(
  "lodash@<4.17.21"
  "axios@<0.21.1"
  "minimist@<1.2.6"
  "node-fetch@<2.6.7"
  "glob-parent@<5.1.2"
  "trim-newlines@<3.0.1"
  "path-parse@<1.0.7"
)

echo "Checking for known vulnerable versions..."
for pkg in "${VULNERABLE_PACKAGES[@]}"; do
  PKG_NAME="${pkg%@*}"
  PKG_VERSION="${pkg#*@}"
  
  # Check in node_modules
  if [ -d "node_modules/$PKG_NAME" ]; then
    INSTALLED_VERSION=$(node -p "require('./node_modules/$PKG_NAME/package.json').version" 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "- $PKG_NAME: $INSTALLED_VERSION (required: $PKG_VERSION)"
    fi
  fi
done

echo ""
echo "Checking outdated packages..."
# List packages that might need updates
npm outdated --depth=0 2>/dev/null || echo "Cannot check outdated packages without lock file"

echo ""
echo "Security Recommendations:"
echo "1. Generate package-lock.json ASAP"
echo "2. Run 'npm audit' after lock file generation"
echo "3. Consider using 'npm-check-updates' for systematic updates"
echo "4. Review direct dependencies in package.json"

# Create security report
cat > security-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "fallback",
  "message": "Full audit unavailable without package-lock.json",
  "recommendations": [
    "Generate package-lock.json",
    "Run npm audit",
    "Update vulnerable packages",
    "Enable Dependabot or similar"
  ]
}
EOF

echo ""
echo "✅ Security report created: security-report.json"