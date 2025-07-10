#!/bin/bash

# Database Health Check Script for Auto-Recovery
# This script performs comprehensive database health checks

echo "🗄️ Starting database health check..."

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-o4o_platform}"
DB_USER="${DB_USER:-postgres}"
PGPASSWORD="${DB_PASSWORD}"

export PGPASSWORD

# Function to run SQL query
run_sql() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null
}

# Function to check if PostgreSQL is running
check_postgres_running() {
    if pgrep -x "postgres" > /dev/null; then
        log "✅ PostgreSQL process is running"
        return 0
    else
        log "❌ PostgreSQL process is not running"
        return 1
    fi
}

# Function to check database connectivity
check_connectivity() {
    log "Checking database connectivity..."
    
    if run_sql "SELECT 1;" | grep -q "1"; then
        log "✅ Database connection successful"
        return 0
    else
        log "❌ Database connection failed"
        return 1
    fi
}

# Function to check database size
check_database_size() {
    log "Checking database size..."
    
    SIZE=$(run_sql "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    if [ -n "$SIZE" ]; then
        log "📊 Database size: $SIZE"
        return 0
    else
        log "⚠️ Could not retrieve database size"
        return 1
    fi
}

# Function to check active connections
check_connections() {
    log "Checking active connections..."
    
    CONNECTIONS=$(run_sql "SELECT count(*) FROM pg_stat_activity;")
    MAX_CONNECTIONS=$(run_sql "SELECT setting FROM pg_settings WHERE name = 'max_connections';")
    
    if [ -n "$CONNECTIONS" ] && [ -n "$MAX_CONNECTIONS" ]; then
        log "📊 Active connections: $CONNECTIONS / $MAX_CONNECTIONS"
        
        # Check if connection count is concerning
        if [ "$CONNECTIONS" -gt $((MAX_CONNECTIONS * 80 / 100)) ]; then
            log "⚠️ High connection count detected"
            return 1
        else
            log "✅ Connection count is healthy"
            return 0
        fi
    else
        log "⚠️ Could not retrieve connection information"
        return 1
    fi
}

# Function to check for long-running queries
check_long_queries() {
    log "Checking for long-running queries..."
    
    LONG_QUERIES=$(run_sql "
        SELECT count(*) 
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '5 minutes'
        AND pid != pg_backend_pid();
    ")
    
    if [ -n "$LONG_QUERIES" ]; then
        if [ "$LONG_QUERIES" -gt 0 ]; then
            log "⚠️ Found $LONG_QUERIES long-running queries"
            
            # List the long-running queries
            run_sql "
                SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
                FROM pg_stat_activity 
                WHERE state = 'active' 
                AND query_start < now() - interval '5 minutes'
                AND pid != pg_backend_pid();
            " | head -5
            
            return 1
        else
            log "✅ No long-running queries detected"
            return 0
        fi
    else
        log "⚠️ Could not check for long-running queries"
        return 1
    fi
}

# Function to check database locks
check_locks() {
    log "Checking for database locks..."
    
    LOCKS=$(run_sql "SELECT count(*) FROM pg_locks WHERE NOT granted;")
    
    if [ -n "$LOCKS" ]; then
        if [ "$LOCKS" -gt 0 ]; then
            log "⚠️ Found $LOCKS ungranted locks"
            return 1
        else
            log "✅ No problematic locks detected"
            return 0
        fi
    else
        log "⚠️ Could not check database locks"
        return 1
    fi
}

# Function to check disk space for database
check_disk_space() {
    log "Checking disk space..."
    
    DATA_DIR=$(run_sql "SELECT setting FROM pg_settings WHERE name = 'data_directory';")
    
    if [ -n "$DATA_DIR" ]; then
        DISK_USAGE=$(df "$DATA_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
        log "📊 Database disk usage: ${DISK_USAGE}%"
        
        if [ "$DISK_USAGE" -gt 90 ]; then
            log "❌ Critical disk space - ${DISK_USAGE}% used"
            return 1
        elif [ "$DISK_USAGE" -gt 80 ]; then
            log "⚠️ High disk usage - ${DISK_USAGE}% used"
            return 1
        else
            log "✅ Disk space is healthy"
            return 0
        fi
    else
        log "⚠️ Could not determine data directory"
        return 1
    fi
}

# Function to check replication status (if applicable)
check_replication() {
    log "Checking replication status..."
    
    IS_REPLICA=$(run_sql "SELECT pg_is_in_recovery();")
    
    if [ "$IS_REPLICA" = "t" ]; then
        log "📊 Database is a replica"
        
        # Check replication lag
        LAG=$(run_sql "
            SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));
        ")
        
        if [ -n "$LAG" ]; then
            LAG_INT=$(echo "$LAG" | cut -d. -f1)
            log "📊 Replication lag: ${LAG_INT} seconds"
            
            if [ "$LAG_INT" -gt 300 ]; then  # 5 minutes
                log "⚠️ High replication lag detected"
                return 1
            else
                log "✅ Replication lag is acceptable"
                return 0
            fi
        fi
    else
        log "📊 Database is primary (not a replica)"
        return 0
    fi
}

# Function to check table statistics
check_table_stats() {
    log "Checking table statistics..."
    
    TABLES=$(run_sql "
        SELECT count(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
    ")
    
    if [ -n "$TABLES" ]; then
        log "📊 Found $TABLES tables in public schema"
        
        # Check for tables that might need maintenance
        MAINTENANCE_NEEDED=$(run_sql "
            SELECT count(*) 
            FROM pg_stat_user_tables 
            WHERE n_dead_tup > 1000;
        ")
        
        if [ -n "$MAINTENANCE_NEEDED" ] && [ "$MAINTENANCE_NEEDED" -gt 0 ]; then
            log "⚠️ $MAINTENANCE_NEEDED tables may need VACUUM"
            return 1
        else
            log "✅ Table statistics look healthy"
            return 0
        fi
    else
        log "⚠️ Could not retrieve table information"
        return 1
    fi
}

# Function to perform basic performance test
check_performance() {
    log "Performing basic performance test..."
    
    START_TIME=$(date +%s%N)
    
    # Simple query performance test
    run_sql "SELECT count(*) FROM pg_stat_activity;" > /dev/null
    
    END_TIME=$(date +%s%N)
    DURATION=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds
    
    log "📊 Query response time: ${DURATION}ms"
    
    if [ "$DURATION" -gt 1000 ]; then  # 1 second
        log "⚠️ Slow query response time"
        return 1
    else
        log "✅ Query performance is good"
        return 0
    fi
}

# Main health check execution
main() {
    log "Starting comprehensive database health check"
    
    HEALTH_SCORE=0
    TOTAL_CHECKS=9
    
    # Run all health checks
    check_postgres_running && ((HEALTH_SCORE++))
    check_connectivity && ((HEALTH_SCORE++))
    check_database_size && ((HEALTH_SCORE++))
    check_connections && ((HEALTH_SCORE++))
    check_long_queries && ((HEALTH_SCORE++))
    check_locks && ((HEALTH_SCORE++))
    check_disk_space && ((HEALTH_SCORE++))
    check_replication && ((HEALTH_SCORE++))
    check_table_stats && ((HEALTH_SCORE++))
    check_performance && ((HEALTH_SCORE++))
    
    # Calculate health percentage
    HEALTH_PERCENTAGE=$(( HEALTH_SCORE * 100 / TOTAL_CHECKS ))
    
    log "Database health check completed"
    log "Health score: $HEALTH_SCORE/$TOTAL_CHECKS ($HEALTH_PERCENTAGE%)"
    
    # Return appropriate exit code
    if [ "$HEALTH_PERCENTAGE" -ge 80 ]; then
        log "✅ Database is healthy"
        exit 0
    elif [ "$HEALTH_PERCENTAGE" -ge 60 ]; then
        log "⚠️ Database has some issues but is functional"
        exit 1
    else
        log "❌ Database has serious health issues"
        exit 2
    fi
}

# Run the main function
main