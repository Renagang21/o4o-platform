#!/bin/bash

# Error Log Analyzer Script
# Analyzes PM2 logs for patterns and generates reports

LOG_DIR="/home/ubuntu/o4o-platform/logs"
REPORT_DIR="/home/ubuntu/o4o-platform/monitoring/reports"
ALERT_LOG="$LOG_DIR/alerts.log"

# Create report directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Function to analyze error patterns
analyze_errors() {
    echo "=== Error Analysis Report ===" > "$REPORT_DIR/error-analysis.txt"
    echo "Generated: $(date)" >> "$REPORT_DIR/error-analysis.txt"
    echo "" >> "$REPORT_DIR/error-analysis.txt"
    
    # Count total errors
    if [ -f "$LOG_DIR/api-server-error.log" ]; then
        ERROR_COUNT=$(wc -l < "$LOG_DIR/api-server-error.log")
        echo "Total Error Lines: $ERROR_COUNT" >> "$REPORT_DIR/error-analysis.txt"
        echo "" >> "$REPORT_DIR/error-analysis.txt"
        
        # Top 10 most common errors
        echo "=== Top 10 Error Patterns ===" >> "$REPORT_DIR/error-analysis.txt"
        grep -E "Error:|Exception:|Failed" "$LOG_DIR/api-server-error.log" | \
            sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}.*: //' | \
            sort | uniq -c | sort -rn | head -10 >> "$REPORT_DIR/error-analysis.txt"
        echo "" >> "$REPORT_DIR/error-analysis.txt"
        
        # Database errors
        echo "=== Database Errors ===" >> "$REPORT_DIR/error-analysis.txt"
        grep -E "database|Database|connection|Connection" "$LOG_DIR/api-server-error.log" | \
            wc -l | xargs echo "Count:" >> "$REPORT_DIR/error-analysis.txt"
        echo "" >> "$REPORT_DIR/error-analysis.txt"
        
        # Authentication errors
        echo "=== Authentication Errors ===" >> "$REPORT_DIR/error-analysis.txt"
        grep -E "auth|Auth|authentication|Authentication|unauthorized|Unauthorized" "$LOG_DIR/api-server-error.log" | \
            wc -l | xargs echo "Count:" >> "$REPORT_DIR/error-analysis.txt"
    fi
}

# Function to check critical conditions
check_critical() {
    CRITICAL_FOUND=false
    ALERT_MESSAGE=""
    
    # Check for out of memory errors
    if grep -q "JavaScript heap out of memory" "$LOG_DIR/api-server-error.log" 2>/dev/null; then
        CRITICAL_FOUND=true
        ALERT_MESSAGE="$ALERT_MESSAGE\n[CRITICAL] Out of memory errors detected!"
    fi
    
    # Check for database connection failures
    if grep -q "FATAL.*connection" "$LOG_DIR/api-server-error.log" 2>/dev/null; then
        CRITICAL_FOUND=true
        ALERT_MESSAGE="$ALERT_MESSAGE\n[CRITICAL] Database connection failures detected!"
    fi
    
    # Check error rate in last hour
    if [ -f "$LOG_DIR/api-server-error.log" ]; then
        RECENT_ERRORS=$(tail -n 1000 "$LOG_DIR/api-server-error.log" | grep -c "ERROR")
        if [ "$RECENT_ERRORS" -gt 100 ]; then
            CRITICAL_FOUND=true
            ALERT_MESSAGE="$ALERT_MESSAGE\n[WARNING] High error rate: $RECENT_ERRORS errors in recent logs"
        fi
    fi
    
    if [ "$CRITICAL_FOUND" = true ]; then
        echo -e "$ALERT_MESSAGE" >> "$ALERT_LOG"
        echo -e "$ALERT_MESSAGE"
    fi
}

# Function to generate daily summary
generate_summary() {
    SUMMARY_FILE="$REPORT_DIR/daily-summary-$(date +%Y%m%d).json"
    
    ERROR_COUNT=0
    if [ -f "$LOG_DIR/api-server-error.log" ]; then
        ERROR_COUNT=$(wc -l < "$LOG_DIR/api-server-error.log")
    fi
    
    REQUEST_COUNT=0
    if [ -f "$LOG_DIR/api-server-out.log" ]; then
        REQUEST_COUNT=$(grep -c "GET\|POST\|PUT\|DELETE" "$LOG_DIR/api-server-out.log" 2>/dev/null || echo 0)
    fi
    
    cat > "$SUMMARY_FILE" <<EOF
{
  "date": "$(date +%Y-%m-%d)",
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "total_errors": $ERROR_COUNT,
    "total_requests": $REQUEST_COUNT,
    "error_rate": $(echo "scale=2; $ERROR_COUNT / ($REQUEST_COUNT + 1) * 100" | bc)%,
    "uptime": "$(pm2 show api-server | grep uptime | awk '{print $3}')",
    "restarts": "$(pm2 show api-server | grep restarts | awk '{print $3}')"
  },
  "health_status": "$([ $ERROR_COUNT -lt 100 ] && echo "healthy" || echo "degraded")"
}
EOF
    
    echo "Summary saved to: $SUMMARY_FILE"
}

# Function to clean old logs
cleanup_old_logs() {
    # Remove logs older than 7 days
    find "$LOG_DIR" -name "*.log.*" -mtime +7 -delete
    find "$REPORT_DIR" -name "*.txt" -mtime +30 -delete
    find "$REPORT_DIR" -name "*.json" -mtime +30 -delete
    
    echo "Old logs cleaned up"
}

# Main execution
echo "Starting error log analysis..."
analyze_errors
check_critical
generate_summary
cleanup_old_logs
echo "Analysis complete!"

# Show report
echo ""
echo "=== Quick Summary ==="
tail -n 20 "$REPORT_DIR/error-analysis.txt"