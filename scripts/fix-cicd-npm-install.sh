#!/bin/bash

# Script to replace npm ci with npm install in all CI/CD workflows
# As per CLAUDE.md instructions

echo "🔧 Fixing CI/CD workflows to use npm install instead of npm ci..."

# Find all workflow files and replace npm ci with npm install
find .github/workflows -name "*.yml" -type f -exec sed -i 's/npm ci/npm install/g' {} \;

echo "✅ CI/CD workflows updated!"

# Show the changes
echo ""
echo "📋 Updated files:"
grep -l "npm install" .github/workflows/*.yml | while read file; do
    echo "  - $file"
done