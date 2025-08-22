#!/bin/bash

# Setup automated backup for O4O Platform
# This script creates systemd timer for scheduled backups

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 Setting up O4O Platform Backup Automation"
echo "==========================================="
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root or with sudo${NC}"
    exit 1
fi

# Create systemd service file
cat > /etc/systemd/system/o4o-backup.service << EOF
[Unit]
Description=O4O Platform Backup Service
After=network.target postgresql.service

[Service]
Type=oneshot
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/o4o-platform
Environment="BACKUP_DIR=/backup/o4o-platform"
Environment="DB_NAME=o4o_platform"
Environment="DB_USERNAME=postgres"
Environment="DB_PASSWORD=${DB_PASSWORD:-your_password_here}"
Environment="DB_HOST=localhost"
Environment="RETENTION_DAYS=7"
ExecStart=/home/ubuntu/o4o-platform/scripts/backup.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd timer file
cat > /etc/systemd/system/o4o-backup.timer << EOF
[Unit]
Description=O4O Platform Backup Timer
Requires=o4o-backup.service

[Timer]
# Run daily at 2:00 AM
OnCalendar=daily
AccuracySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Create backup monitoring service
cat > /etc/systemd/system/o4o-backup-monitor.service << EOF
[Unit]
Description=O4O Platform Backup Monitoring Service
After=network.target

[Service]
Type=oneshot
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/o4o-platform
Environment="BACKUP_DIR=/backup/o4o-platform"
Environment="ALERT_EMAIL=admin@neture.co.kr"
ExecStart=/home/ubuntu/o4o-platform/scripts/backup-monitoring.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create backup monitoring timer
cat > /etc/systemd/system/o4o-backup-monitor.timer << EOF
[Unit]
Description=O4O Platform Backup Monitoring Timer
Requires=o4o-backup-monitor.service

[Timer]
# Run every 6 hours
OnCalendar=0,6,12,18:00:00
AccuracySec=10m
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Create backup directories
mkdir -p /backup/o4o-platform/{db,files,logs}
chown -R ubuntu:ubuntu /backup/o4o-platform

# Make scripts executable
chmod +x /home/ubuntu/o4o-platform/scripts/backup.sh
chmod +x /home/ubuntu/o4o-platform/scripts/restore.sh
chmod +x /home/ubuntu/o4o-platform/scripts/backup-monitoring.sh

# Reload systemd
systemctl daemon-reload

# Enable and start timers
systemctl enable o4o-backup.timer
systemctl enable o4o-backup-monitor.timer
systemctl start o4o-backup.timer
systemctl start o4o-backup-monitor.timer

echo ""
echo -e "${GREEN}✅ Backup automation setup complete!${NC}"
echo ""
echo "Backup Schedule:"
echo "- Daily backups at 2:00 AM"
echo "- Monitoring checks every 6 hours"
echo ""
echo "Useful commands:"
echo "- Check backup timer status: systemctl status o4o-backup.timer"
echo "- Check monitoring timer: systemctl status o4o-backup-monitor.timer"
echo "- List all timers: systemctl list-timers"
echo "- Run backup manually: systemctl start o4o-backup.service"
echo "- Check backup logs: journalctl -u o4o-backup.service"
echo ""
echo "⚠️  IMPORTANT: Update DB_PASSWORD in /etc/systemd/system/o4o-backup.service"