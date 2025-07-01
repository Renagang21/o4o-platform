# TipTap Version Update and Node.js Upgrade Guide

## Overview
This document describes the process of resolving TipTap version mismatches and upgrading Node.js from version 18.19.1 to 20.x for the o4o-platform project.

## Issues Identified

### 1. TipTap Version Mismatch
- **Problem**: Core TipTap packages were at version 2.14.1 while extension packages were at version 2.22.x
- **Impact**: Potential compatibility issues and limited access to advanced features

### 2. Node.js Version Requirement
- **Problem**: Project requires Node.js 20.x but system had Node.js 18.19.1
- **Impact**: Package compatibility warnings and potential runtime issues

## Resolution Steps

### Step 1: TipTap Version Update

#### Version Mismatches Found:
1. **Core packages** (version 2.14.1):
   - `@tiptap/core`: ^2.14.1
   - `@tiptap/react`: ^2.14.1
   - `@tiptap/starter-kit`: ^2.14.1

2. **Extension packages** (version 2.22.0):
   - `@tiptap/extension-color`: ^2.22.0
   - `@tiptap/extension-highlight`: ^2.22.0
   - `@tiptap/extension-image`: ^2.22.0
   - `@tiptap/extension-link`: ^2.22.0
   - `@tiptap/extension-table`: ^2.22.0
   - `@tiptap/extension-table-cell`: ^2.22.0
   - `@tiptap/extension-table-header`: ^2.22.0
   - `@tiptap/extension-table-row`: ^2.22.0
   - `@tiptap/extension-text-align`: ^2.22.0
   - `@tiptap/extension-text-style`: ^2.22.0

3. **Suggestion package** (version 2.22.3):
   - `@tiptap/suggestion`: ^2.22.3

#### Resolution:
Updated all core packages to version 2.22.0 to match the extension packages:
```json
"@tiptap/core": "^2.22.0",
"@tiptap/react": "^2.22.0",
"@tiptap/starter-kit": "^2.22.0",
```

### Step 2: Node.js Upgrade

#### Installation Process:
1. **Install NVM (Node Version Manager)**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. **Fix NPM Configuration Conflict**:
   - Backed up existing `.npmrc` file to resolve NVM compatibility issues:
   ```bash
   mv ~/.npmrc ~/.npmrc.backup
   ```

3. **Install and Use Node.js 20**:
   ```bash
   # Load NVM
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   
   # Install Node.js 20
   nvm install 20
   
   # Use Node.js 20
   nvm use 20
   ```

### Step 3: Update Dependencies
After upgrading Node.js, reinstall all dependencies:
```bash
npm install
```

## Verification

### Check Versions:
```bash
# Check Node.js version
node -v  # Should output: v20.19.3

# Check npm version
npm -v   # Should output: 10.8.2
```

### Test Development Server:
```bash
npm run dev
```

## Important Notes

1. **NVM Usage**: Since NVM was used for the Node.js installation, you need to run `nvm use 20` in each new terminal session or add it to your shell profile.

2. **WSL Environment**: This upgrade was performed in a WSL Ubuntu environment as per project requirements (no Docker).

3. **Package Compatibility**: All TipTap packages are now at compatible versions (2.22.x), ensuring full feature availability.

4. **Project Requirements**: The project now meets the Node.js 20.x requirement specified in package.json engine constraints.

## Troubleshooting

### If Node.js reverts to old version:
```bash
# Add to ~/.bashrc or ~/.zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### If npm install fails:
1. Clear npm cache: `npm cache clean --force`
2. Remove node_modules: `rm -rf node_modules`
3. Reinstall: `npm install`

## References
- [TipTap Documentation](https://tiptap.dev/)
- [NVM Repository](https://github.com/nvm-sh/nvm)
- [Node.js 20 Release Notes](https://nodejs.org/en/blog/release/v20.0.0)