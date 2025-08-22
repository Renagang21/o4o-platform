#!/bin/bash

# Fix PostCSS configuration for all apps
echo "🔧 Fixing PostCSS configuration for Tailwind CSS v4..."

# Find all postcss.config.js files and update them
for config in apps/*/postcss.config.js; do
  if [ -f "$config" ]; then
    echo "Updating $config..."
    cat > "$config" << 'EOF'
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
EOF
  fi
done

echo "✅ PostCSS configuration updated for all apps"