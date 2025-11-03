#!/bin/bash

###############################################################################
# Phase 1 Rollback Script (Dry-run Mode)
#
# Purpose: Rollback dropshipping entity tables to pre-Phase 1 state
# Usage: ./scripts/rollback-phase1.sh [--execute]
#
# Without --execute flag: Shows what would be done (dry-run)
# With --execute flag: Actually performs the rollback
###############################################################################

DRY_RUN=true

if [ "$1" == "--execute" ]; then
    DRY_RUN=false
    echo "⚠️  EXECUTE MODE: Changes will be applied"
else
    echo "🔍 DRY-RUN MODE: No changes will be made"
    echo "   Add --execute flag to actually perform rollback"
fi

echo ""
echo "======================================================================"
echo "  Phase 1 Rollback Script"
echo "======================================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "apps/api-server/package.json" ]; then
    echo "❌ Error: Must be run from project root directory"
    exit 1
fi

# Check database connection
echo "📡 Checking database connection..."
cd apps/api-server

if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] Would check database connection"
else
    node -e "
        require('dotenv').config();
        const pg = require('pg');
        const client = new pg.Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        client.connect()
            .then(() => { console.log('✅ Database connection successful'); client.end(); })
            .catch((err) => { console.error('❌ Database connection failed:', err.message); process.exit(1); });
    " || exit 1
fi

echo ""
echo "Step 1: Backup current data"
echo "----------------------------------------------------------------------"

if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] Would backup:"
    echo "     - partners table → backup_partners_$(date +%Y%m%d_%H%M%S)"
    echo "     - sellers table → backup_sellers_$(date +%Y%m%d_%H%M%S)"
    echo "     - suppliers table → backup_suppliers_$(date +%Y%m%d_%H%M%S)"
    echo "     - partner_commissions table → backup_partner_commissions_$(date +%Y%m%d_%H%M%S)"
else
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    node -e "
        require('dotenv').config();
        const pg = require('pg');
        const client = new pg.Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        async function backup() {
            await client.connect();

            await client.query('CREATE TABLE IF NOT EXISTS backup_partners_$TIMESTAMP AS SELECT * FROM partners');
            await client.query('CREATE TABLE IF NOT EXISTS backup_sellers_$TIMESTAMP AS SELECT * FROM sellers');
            await client.query('CREATE TABLE IF NOT EXISTS backup_suppliers_$TIMESTAMP AS SELECT * FROM suppliers');
            await client.query('CREATE TABLE IF NOT EXISTS backup_partner_commissions_$TIMESTAMP AS SELECT * FROM partner_commissions');

            console.log('✅ Backup completed');
            await client.end();
        }

        backup().catch(err => { console.error('❌ Backup failed:', err.message); process.exit(1); });
    " || exit 1
fi

echo ""
echo "Step 2: Remove migration records"
echo "----------------------------------------------------------------------"

if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] Would delete from typeorm_migrations:"
    echo "     - BaselineDropshippingEntities1900000000000"
    echo "     - CreateDropshippingEntities1800000000000"
else
    node -e "
        require('dotenv').config();
        const pg = require('pg');
        const client = new pg.Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        async function removeMigrations() {
            await client.connect();

            await client.query('DELETE FROM typeorm_migrations WHERE timestamp IN (1800000000000, 1900000000000)');

            console.log('✅ Migration records removed');
            await client.end();
        }

        removeMigrations().catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });
    " || exit 1
fi

echo ""
echo "Step 3: Drop entity tables"
echo "----------------------------------------------------------------------"

if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] Would drop tables (in order):"
    echo "     1. partner_commissions (FK dependency)"
    echo "     2. partners (FK dependency)"
    echo "     3. sellers"
    echo "     4. suppliers"
else
    node -e "
        require('dotenv').config();
        const pg = require('pg');
        const client = new pg.Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        async function dropTables() {
            await client.connect();

            await client.query('DROP TABLE IF EXISTS partner_commissions CASCADE');
            await client.query('DROP TABLE IF EXISTS partners CASCADE');
            await client.query('DROP TABLE IF EXISTS sellers CASCADE');
            await client.query('DROP TABLE IF EXISTS suppliers CASCADE');

            console.log('✅ Tables dropped');
            await client.end();
        }

        dropTables().catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });
    " || exit 1
fi

echo ""
echo "Step 4: Restart API server"
echo "----------------------------------------------------------------------"

if [ "$DRY_RUN" = true ]; then
    echo "   [DRY-RUN] Would restart: pm2 restart o4o-api-server"
else
    pm2 restart o4o-api-server
    echo "✅ API server restarted"
fi

echo ""
echo "======================================================================"
if [ "$DRY_RUN" = true ]; then
    echo "  ✅ Dry-run completed successfully"
    echo "  💡 Run with --execute flag to perform actual rollback"
else
    echo "  ✅ Rollback completed successfully"
    echo "  💾 Backup tables created with timestamp suffix"
    echo "  🔄 To restore: Rename backup tables back to original names"
fi
echo "======================================================================"
