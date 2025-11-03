#!/bin/bash

###############################################################################
# Phase 2 Rollback Script
#
# Purpose: Safely rollback Phase 2.1 (Tracking & Commission) changes
# Usage:
#   ./scripts/rollback-phase2.sh              # Dry-run mode (default, safe)
#   ./scripts/rollback-phase2.sh --execute    # Actually execute rollback
#
# What this script does:
# 1. Verify current database state
# 2. Drop Phase 2.1 tables (referral_clicks, conversion_events, commission_policies)
# 3. Verify rollback success
# 4. Restore to Phase 1 baseline (tagged as phase1-complete)
#
# Safety Features:
# - Default dry-run mode (no changes unless --execute flag)
# - Verification before and after
# - Database backup before execution
# - Detailed logging
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=true
BACKUP_DIR="./backups/phase2-rollback"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./logs/rollback-phase2-${TIMESTAMP}.log"

# Parse arguments
if [[ "$1" == "--execute" ]]; then
  DRY_RUN=false
fi

# Create directories if needed
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

log_header() {
  echo "" | tee -a "$LOG_FILE"
  log "${BLUE}========================================${NC}"
  log "${BLUE}$1${NC}"
  log "${BLUE}========================================${NC}"
}

log_success() {
  log "${GREEN}✓ $1${NC}"
}

log_warning() {
  log "${YELLOW}⚠ $1${NC}"
}

log_error() {
  log "${RED}✗ $1${NC}"
}

# Database connection check
check_database_connection() {
  log_header "Checking Database Connection"

  if ! command -v psql &> /dev/null; then
    log_error "psql command not found. Please install PostgreSQL client."
    exit 1
  fi

  # Try to connect (assumes local development environment)
  # Adjust connection parameters as needed for your setup
  if psql -U postgres -d o4o_platform -c "SELECT 1;" &> /dev/null; then
    log_success "Database connection successful"
  else
    log_error "Cannot connect to database. Please check your connection settings."
    exit 1
  fi
}

# Verify Phase 2 tables exist
verify_phase2_tables() {
  log_header "Verifying Phase 2 Tables Exist"

  TABLES=("referral_clicks" "conversion_events" "commission_policies")

  for table in "${TABLES[@]}"; do
    if psql -U postgres -d o4o_platform -c "\dt $table" | grep -q "$table"; then
      log_success "Table '$table' exists"
    else
      log_warning "Table '$table' does not exist (already rolled back?)"
    fi
  done
}

# Create database backup
create_backup() {
  log_header "Creating Database Backup"

  if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN: Would create backup at $BACKUP_DIR/phase2-backup-${TIMESTAMP}.sql"
    return
  fi

  BACKUP_FILE="$BACKUP_DIR/phase2-backup-${TIMESTAMP}.sql"

  if pg_dump -U postgres -d o4o_platform > "$BACKUP_FILE"; then
    log_success "Backup created: $BACKUP_FILE"

    # Compress backup
    gzip "$BACKUP_FILE"
    log_success "Backup compressed: ${BACKUP_FILE}.gz"
  else
    log_error "Backup failed!"
    exit 1
  fi
}

# Drop Phase 2 tables
drop_phase2_tables() {
  log_header "Dropping Phase 2 Tables"

  # Tables in reverse order of dependencies
  TABLES=(
    "commission_policies"
    "conversion_events"
    "referral_clicks"
  )

  for table in "${TABLES[@]}"; do
    if [[ "$DRY_RUN" == true ]]; then
      log_warning "DRY RUN: Would execute: DROP TABLE IF EXISTS \"$table\" CASCADE;"
    else
      log "Dropping table: $table"
      if psql -U postgres -d o4o_platform -c "DROP TABLE IF EXISTS \"$table\" CASCADE;"; then
        log_success "Table '$table' dropped"
      else
        log_error "Failed to drop table '$table'"
        exit 1
      fi
    fi
  done
}

# Verify rollback success
verify_rollback() {
  log_header "Verifying Rollback Success"

  if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN: Would verify tables are dropped"
    return
  fi

  TABLES=("referral_clicks" "conversion_events" "commission_policies")
  ALL_DROPPED=true

  for table in "${TABLES[@]}"; do
    if psql -U postgres -d o4o_platform -c "\dt $table" | grep -q "$table"; then
      log_error "Table '$table' still exists!"
      ALL_DROPPED=false
    else
      log_success "Table '$table' successfully dropped"
    fi
  done

  if [[ "$ALL_DROPPED" == true ]]; then
    log_success "All Phase 2 tables successfully removed"
  else
    log_error "Rollback incomplete - some tables still exist"
    exit 1
  fi
}

# Verify Phase 1 tables still intact
verify_phase1_tables() {
  log_header "Verifying Phase 1 Tables Intact"

  PHASE1_TABLES=("partners" "sellers" "suppliers" "partner_commissions" "products")
  ALL_INTACT=true

  for table in "${PHASE1_TABLES[@]}"; do
    if psql -U postgres -d o4o_platform -c "\dt $table" | grep -q "$table"; then
      log_success "Phase 1 table '$table' intact"
    else
      log_error "Phase 1 table '$table' missing!"
      ALL_INTACT=false
    fi
  done

  if [[ "$ALL_INTACT" == true ]]; then
    log_success "All Phase 1 tables intact"
  else
    log_error "Phase 1 tables missing - database may be in inconsistent state!"
    exit 1
  fi
}

# Git rollback (optional - revert code changes)
git_rollback() {
  log_header "Git Rollback (Optional)"

  if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN: Would offer to git reset to phase1-complete tag"
    return
  fi

  # Check if phase1-complete tag exists
  if git rev-parse phase1-complete >/dev/null 2>&1; then
    log "Phase 1 baseline tag found: phase1-complete"

    read -p "Do you want to reset code to Phase 1 baseline? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log "Resetting to phase1-complete..."
      git reset --hard phase1-complete
      log_success "Code reset to Phase 1 baseline"
    else
      log_warning "Skipping git rollback - keeping current code"
    fi
  else
    log_warning "phase1-complete tag not found - skipping git rollback"
  fi
}

# Main execution
main() {
  log_header "Phase 2 Rollback Script"
  log "Timestamp: $TIMESTAMP"
  log "Dry Run: $DRY_RUN"

  if [[ "$DRY_RUN" == true ]]; then
    log_warning ""
    log_warning "⚠️  DRY RUN MODE - NO CHANGES WILL BE MADE"
    log_warning "⚠️  Run with --execute flag to actually perform rollback"
    log_warning ""
  else
    log_error ""
    log_error "⚠️  EXECUTE MODE - THIS WILL DELETE DATA!"
    log_error ""
    read -p "Are you sure you want to rollback Phase 2? (type 'yes' to confirm): " -r
    echo

    if [[ ! $REPLY == "yes" ]]; then
      log "Rollback cancelled"
      exit 0
    fi
  fi

  # Execute rollback steps
  check_database_connection
  verify_phase2_tables
  verify_phase1_tables
  create_backup
  drop_phase2_tables

  if [[ "$DRY_RUN" == false ]]; then
    verify_rollback
    verify_phase1_tables
    git_rollback
  fi

  log_header "Rollback Complete"

  if [[ "$DRY_RUN" == true ]]; then
    log_warning "DRY RUN completed - no changes were made"
    log "Run with --execute flag to actually perform rollback:"
    log "  ./scripts/rollback-phase2.sh --execute"
  else
    log_success "Phase 2 rollback completed successfully"
    log "Backup saved to: $BACKUP_DIR/phase2-backup-${TIMESTAMP}.sql.gz"
    log "Log saved to: $LOG_FILE"
  fi
}

# Run main
main
