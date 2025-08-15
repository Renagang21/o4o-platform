#!/usr/bin/env node

const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');

// Alert configuration
const ALERT_CONFIG = {
  memory_threshold_mb: 500,
  cpu_threshold_percent: 80,
  restart_limit: 5,
  error_rate_threshold: 10, // errors per minute
  response_time_threshold_ms: 1000,
  check_interval_ms: 30000 // 30 seconds
};

// Alert state tracking
const alertState = {
  lastAlertTime: {},
  alertCooldown: 300000, // 5 minutes between same alerts
  errorCounts: {}
};

// Log file for alerts
const ALERT_LOG = path.join(__dirname, '../logs/alerts.log');

function logAlert(severity, message, details = {}) {
  const timestamp = new Date().toISOString();
  const alertEntry = {
    timestamp,
    severity,
    message,
    details
  };
  
  // Console output
  console.log(`[${severity}] ${timestamp}: ${message}`);
  if (Object.keys(details).length > 0) {
    console.log('Details:', JSON.stringify(details, null, 2));
  }
  
  // Write to file
  fs.appendFileSync(ALERT_LOG, JSON.stringify(alertEntry) + '\n');
  
  // TODO: Add webhook/email notifications here
  if (severity === 'CRITICAL') {
    // sendCriticalAlert(message, details);
  }
}

function checkProcessHealth(process) {
  const alerts = [];
  
  // Check memory usage
  const memoryMB = process.monit.memory / (1024 * 1024);
  if (memoryMB > ALERT_CONFIG.memory_threshold_mb) {
    alerts.push({
      type: 'MEMORY',
      severity: 'WARNING',
      message: `Process ${process.name} memory usage: ${memoryMB.toFixed(2)}MB (threshold: ${ALERT_CONFIG.memory_threshold_mb}MB)`
    });
  }
  
  // Check CPU usage
  if (process.monit.cpu > ALERT_CONFIG.cpu_threshold_percent) {
    alerts.push({
      type: 'CPU',
      severity: 'WARNING',
      message: `Process ${process.name} CPU usage: ${process.monit.cpu}% (threshold: ${ALERT_CONFIG.cpu_threshold_percent}%)`
    });
  }
  
  // Check restart count
  if (process.pm2_env.restart_time > ALERT_CONFIG.restart_limit) {
    alerts.push({
      type: 'RESTART',
      severity: 'CRITICAL',
      message: `Process ${process.name} has restarted ${process.pm2_env.restart_time} times (limit: ${ALERT_CONFIG.restart_limit})`
    });
  }
  
  // Check process status
  if (process.pm2_env.status === 'errored' || process.pm2_env.status === 'stopped') {
    alerts.push({
      type: 'STATUS',
      severity: 'CRITICAL',
      message: `Process ${process.name} is ${process.pm2_env.status}`
    });
  }
  
  return alerts;
}

function shouldSendAlert(alertType, processName) {
  const alertKey = `${processName}-${alertType}`;
  const lastAlert = alertState.lastAlertTime[alertKey];
  const now = Date.now();
  
  if (!lastAlert || (now - lastAlert) > alertState.alertCooldown) {
    alertState.lastAlertTime[alertKey] = now;
    return true;
  }
  
  return false;
}

function startMonitoring() {
  pm2.connect(function(err) {
    if (err) {
      console.error('Failed to connect to PM2:', err);
      process.exit(2);
    }
    
    console.log('PM2 Alert System started');
    console.log('Configuration:', ALERT_CONFIG);
    
    // Check processes periodically
    setInterval(() => {
      pm2.list((err, processDescriptionList) => {
        if (err) {
          console.error('Failed to get process list:', err);
          return;
        }
        
        processDescriptionList.forEach(process => {
          const alerts = checkProcessHealth(process);
          
          alerts.forEach(alert => {
            if (shouldSendAlert(alert.type, process.name)) {
              logAlert(alert.severity, alert.message, {
                process: process.name,
                pid: process.pid,
                status: process.pm2_env.status,
                uptime: process.pm2_env.pm_uptime,
                memory: process.monit.memory,
                cpu: process.monit.cpu
              });
            }
          });
        });
      });
    }, ALERT_CONFIG.check_interval_ms);
    
    // Monitor PM2 bus for events
    pm2.launchBus((err, bus) => {
      if (err) {
        console.error('Failed to launch PM2 bus:', err);
        return;
      }
      
      bus.on('process:event', (packet) => {
        if (packet.event === 'exit' && packet.manually === false) {
          logAlert('CRITICAL', `Process ${packet.process.name} crashed unexpectedly`, {
            exit_code: packet.process.exit_code,
            pm_id: packet.process.pm_id
          });
        }
      });
      
      bus.on('log:err', (packet) => {
        const processName = packet.process.name;
        
        // Track error rate
        if (!alertState.errorCounts[processName]) {
          alertState.errorCounts[processName] = [];
        }
        
        const now = Date.now();
        alertState.errorCounts[processName].push(now);
        
        // Remove old errors (older than 1 minute)
        alertState.errorCounts[processName] = alertState.errorCounts[processName]
          .filter(time => now - time < 60000);
        
        // Check error rate
        if (alertState.errorCounts[processName].length > ALERT_CONFIG.error_rate_threshold) {
          if (shouldSendAlert('ERROR_RATE', processName)) {
            logAlert('WARNING', `High error rate for ${processName}: ${alertState.errorCounts[processName].length} errors in last minute`, {
              error_count: alertState.errorCounts[processName].length,
              threshold: ALERT_CONFIG.error_rate_threshold
            });
          }
        }
      });
    });
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down alert system...');
  pm2.disconnect();
  process.exit(0);
});

// Start monitoring
startMonitoring();