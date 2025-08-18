#!/bin/bash

# O4O Platform - Protected Files Backup Script
# Automatically backs up CLAUDE.md and .env files before git operations

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Timestamp for backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to print colored output
print_info() {
    echo -e "${BLUE}[BACKUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory if it doesn't exist
BACKUP_DIR=".backup/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup CLAUDE.md
if [ -f "CLAUDE.md" ]; then
    cp CLAUDE.md "$BACKUP_DIR/CLAUDE.md"
    print_success "Backed up CLAUDE.md to $BACKUP_DIR/"
else
    print_warning "CLAUDE.md not found"
fi

# Backup root .env
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env"
    print_success "Backed up .env to $BACKUP_DIR/"
fi

# Backup all .env files in apps
for env_file in apps/*/.env apps/*/.env.local apps/*/.env.production; do
    if [ -f "$env_file" ]; then
        # Create subdirectory structure in backup
        dir_path=$(dirname "$env_file")
        mkdir -p "$BACKUP_DIR/$dir_path"
        cp "$env_file" "$BACKUP_DIR/$env_file"
        print_success "Backed up $env_file"
    fi
done

# Backup all .env files in packages
for env_file in packages/*/.env packages/*/.env.local packages/*/.env.production; do
    if [ -f "$env_file" ]; then
        # Create subdirectory structure in backup
        dir_path=$(dirname "$env_file")
        mkdir -p "$BACKUP_DIR/$dir_path"
        cp "$env_file" "$BACKUP_DIR/$env_file"
        print_success "Backed up $env_file"
    fi
done

# Create restore script
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Restore script for protected files

echo "Restoring protected files from this backup..."

# Restore CLAUDE.md
if [ -f "CLAUDE.md" ]; then
    cp CLAUDE.md ../../CLAUDE.md
    echo "Restored CLAUDE.md"
fi

# Restore .env files
for env_file in $(find . -name ".env*" -type f); do
    target_path="../../${env_file#./}"
    cp "$env_file" "$target_path"
    echo "Restored $target_path"
done

echo "Restore complete!"
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# Show backup summary
print_info "==================================="
print_info "Backup completed: $BACKUP_DIR"
print_info "To restore: cd $BACKUP_DIR && ./restore.sh"
print_info "===================================