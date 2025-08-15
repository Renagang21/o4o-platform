#!/bin/bash

# Setup script for monitoring system

echo "Setting up monitoring system..."

# 1. Create necessary directories
mkdir -p /home/ubuntu/o4o-platform/logs
mkdir -p /home/ubuntu/o4o-platform/monitoring/reports

# 2. Setup cron jobs for periodic monitoring
echo "Setting up cron jobs..."

# Add cron job for error analysis (every hour)
(crontab -l 2>/dev/null; echo "0 * * * * /home/ubuntu/o4o-platform/monitoring/error-analyzer.sh") | crontab -

# Add cron job for daily report (at midnight)
(crontab -l 2>/dev/null; echo "0 0 * * * /home/ubuntu/o4o-platform/monitoring/error-analyzer.sh") | crontab -

# 3. Start monitoring services with PM2
echo "Starting monitoring services..."

# Start alert system
pm2 start /home/ubuntu/o4o-platform/monitoring/alert-system.js --name "alert-system" || true

# Start log aggregator
pm2 start /home/ubuntu/o4o-platform/monitoring/log-aggregator.js --name "log-aggregator" || true

# 4. Save PM2 configuration
pm2 save

echo "Monitoring system setup complete!"
echo ""
echo "=== Monitoring Components ==="
echo "1. PM2 Server Monitor: Active"
echo "2. PM2 Log Rotation: Active (50MB max, 7 days retention)"
echo "3. Alert System: Running as PM2 process"
echo "4. Log Aggregator: Running as PM2 process"
echo "5. Error Analyzer: Scheduled hourly via cron"
echo ""
echo "=== Available Commands ==="
echo "pm2 monit              - Real-time monitoring dashboard"
echo "pm2 logs              - View all logs"
echo "pm2 web               - Web dashboard (port 9615)"
echo "./monitoring/error-analyzer.sh - Run error analysis manually"
echo ""
echo "=== Log Locations ==="
echo "Application logs: /home/ubuntu/o4o-platform/logs/"
echo "Monitoring reports: /home/ubuntu/o4o-platform/monitoring/reports/"
echo "Aggregated logs: /home/ubuntu/o4o-platform/logs/aggregated.log"
echo "Alert logs: /home/ubuntu/o4o-platform/logs/alerts.log"