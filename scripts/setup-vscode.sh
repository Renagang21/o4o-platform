#!/bin/bash

echo "🔧 VS Code Extension Setup Script"
echo "================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Essential extensions for development
declare -a essential_extensions=(
  # Git & Source Control (중요!)
  "eamodio.gitlens"
  "mhutchie.git-graph"
  
  # TypeScript/JavaScript
  "dbaeumer.vscode-eslint"
  "esbenp.prettier-vscode"
  "ms-vscode.vscode-typescript-next"
  
  # Productivity
  "christian-kohler.path-intellisense"
  "formulahendry.auto-rename-tag"
  "streetsidesoftware.code-spell-checker"
  "gruntfuggly.todo-tree"
  
  # File Support
  "mikestead.dotenv"
  "redhat.vscode-yaml"
  "yzhang.markdown-all-in-one"
)

# Optional but recommended
declare -a optional_extensions=(
  "pkief.material-icon-theme"
  "ritwickdey.liveserver"
  "christian-kohler.npm-intellisense"
  "dsznajder.es7-react-js-snippets"
)

echo "📋 Checking current extensions..."
current_extensions=$(code --list-extensions 2>/dev/null)

if [ -z "$current_extensions" ]; then
  echo -e "${YELLOW}⚠️  VS Code CLI not available or no extensions installed${NC}"
else
  echo "Current extensions:"
  echo "$current_extensions" | while read ext; do
    echo "  - $ext"
  done
  echo ""
fi

echo "🗑️  Uninstalling problematic extensions..."
# Uninstall potentially problematic extensions
problematic_extensions=(
  "vscode.git"  # Built-in git might conflict
  "vscode.github"  # If causing issues
)

for ext in "${problematic_extensions[@]}"; do
  if echo "$current_extensions" | grep -q "^$ext$"; then
    echo "  Removing: $ext"
    code --uninstall-extension "$ext" 2>/dev/null
  fi
done

echo ""
echo "📦 Installing essential extensions..."
echo ""

install_count=0
skip_count=0

for extension in "${essential_extensions[@]}"; do
  if echo "$current_extensions" | grep -q "^$extension$"; then
    echo -e "  ${GREEN}✓${NC} $extension (already installed)"
    ((skip_count++))
  else
    echo -e "  ${YELLOW}↓${NC} Installing $extension..."
    if code --install-extension "$extension" --force 2>/dev/null; then
      echo -e "  ${GREEN}✓${NC} $extension installed successfully"
      ((install_count++))
    else
      echo -e "  ${RED}✗${NC} Failed to install $extension"
    fi
  fi
done

echo ""
echo "📦 Optional extensions (install if needed):"
for extension in "${optional_extensions[@]}"; do
  echo "  code --install-extension $extension"
done

echo ""
echo "🔧 Fixing Git configuration..."

# Reset git config for VS Code
git config --global --unset-all credential.helper 2>/dev/null
git config --global credential.helper store

# Ensure git is properly configured
if [ -z "$(git config --global user.email)" ]; then
  echo "Setting git user email..."
  git config --global user.email "user@example.com"
fi

if [ -z "$(git config --global user.name)" ]; then
  echo "Setting git user name..."
  git config --global user.name "User"
fi

echo ""
echo "📝 Creating VS Code settings..."

# Create VS Code settings for better Git integration
cat > .vscode/settings.json << 'EOF'
{
  "git.enabled": true,
  "git.autorefresh": true,
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,
  "git.postCommitCommand": "sync",
  
  "scm.defaultViewMode": "tree",
  "scm.alwaysShowProviders": true,
  
  "gitlens.hovers.currentLine.over": "line",
  "gitlens.codeLens.enabled": true,
  "gitlens.statusBar.enabled": true,
  
  "eslint.enable": true,
  "eslint.autoFixOnSave": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  
  "prettier.enable": true,
  "prettier.singleQuote": true,
  "prettier.semi": true,
  
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": false,
    "**/dist": true,
    "**/.next": true
  },
  
  "todo-tree.general.tags": [
    "TODO",
    "FIXME",
    "BUG",
    "HACK",
    "NOTE"
  ]
}
EOF

echo -e "${GREEN}✓${NC} VS Code settings created"

echo ""
echo "================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Summary:"
echo "  - Installed: $install_count extensions"
echo "  - Skipped: $skip_count extensions (already installed)"
echo ""
echo "⚠️  IMPORTANT: Please restart VS Code for changes to take effect"
echo ""
echo "To manually refresh Source Control:"
echo "  1. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)"
echo "  2. Type 'Developer: Reload Window'"
echo "  3. Or restart VS Code completely"
echo ""

# Check if git status works
echo "Testing git status:"
git status --short
echo ""

echo "If Source Control still doesn't work:"
echo "  1. Check View → Source Control (Ctrl+Shift+G)"
echo "  2. Click the '...' menu in Source Control"
echo "  3. Select 'Refresh'"