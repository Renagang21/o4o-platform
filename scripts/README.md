# Scripts Directory

Essential utility scripts for the O4O Platform.

## 🎯 Core Scripts

### Installation & Dependencies
**`install.sh`** - Unified installation script
```bash
./scripts/install.sh quick     # Fast installation
./scripts/install.sh split     # Sequential installation
./scripts/install.sh parallel  # Parallel installation (default)
./scripts/install.sh blocks    # Block packages only
./scripts/install.sh ci        # CI/CD optimized
```

### Deployment & Build
**`deploy.sh`** - Unified deployment script
```bash
./scripts/deploy.sh build      # Build for current environment
./scripts/deploy.sh start      # Start PM2 services
./scripts/deploy.sh stop       # Stop PM2 services
./scripts/deploy.sh restart    # Restart PM2 services
./scripts/deploy.sh clean      # Clean caches and builds
./scripts/deploy.sh deploy     # Full deployment process
```

### Development
**`development/dev.sh`** - Development utilities
```bash
./scripts/development/dev.sh lint        # Run ESLint
./scripts/development/dev.sh type-check  # TypeScript check
./scripts/development/dev.sh test        # Run tests
./scripts/development/dev.sh build       # Build all
```

### Utilities
- **`clean-before-build.sh`** - Pre-build cache cleaning
- **`validate-deploy-env.sh`** - Environment validation
- **`ssh-key-converter.py`** - SSH key format converter

## 📊 Script Count
- **Before**: 70+ scripts across multiple folders
- **After**: 6 essential scripts
- **Reduction**: 91% fewer scripts

## 🗑️ Removed
- 53 archive scripts
- 9 deployment scripts  
- 1 testing script
- Multiple redundant install/build scripts

---
*Last updated: August 2025*