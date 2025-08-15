#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Tail } = require('tail');
const readline = require('readline');

class LogAggregator {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.aggregatedLogFile = path.join(this.logDir, 'aggregated.log');
    this.errorSummaryFile = path.join(this.logDir, 'error-summary.json');
    this.metricsFile = path.join(this.logDir, 'metrics-summary.json');
    
    this.logPatterns = {
      error: /\[ERROR\]|\[CRITICAL\]|Error:|Exception:|Failed/i,
      warning: /\[WARN\]|\[WARNING\]/i,
      slow: /\[SLOW\]/i,
      database: /\[DB\]|database|query|connection/i,
      api: /\[API\]|request|response|endpoint/i
    };
    
    this.errorStats = {
      total: 0,
      byType: {},
      byTime: {},
      topErrors: []
    };
    
    this.metrics = {
      requestCount: 0,
      errorRate: 0,
      avgResponseTime: 0,
      slowQueries: []
    };
  }

  start() {
    console.log('Starting Log Aggregator...');
    
    // Monitor PM2 log files
    this.monitorLogs();
    
    // Periodic analysis
    setInterval(() => this.analyzeLogsAndGenerateReport(), 60000); // Every minute
    
    // Real-time error tracking
    this.setupErrorTracking();
  }

  monitorLogs() {
    const logFiles = [
      'api-server-error.log',
      'api-server-out.log',
      'pm2-server-monit-out.log',
      'response-metrics.json'
    ];

    logFiles.forEach(file => {
      const filePath = path.join(this.logDir, file);
      
      if (fs.existsSync(filePath)) {
        const tail = new Tail(filePath, {
          follow: true,
          logger: console
        });

        tail.on('line', (data) => {
          this.processLogLine(data, file);
        });

        tail.on('error', (error) => {
          console.error(`Error tailing ${file}:`, error);
        });

        console.log(`Monitoring: ${file}`);
      }
    });
  }

  processLogLine(line, source) {
    const timestamp = new Date().toISOString();
    
    // Aggregate all logs
    const aggregatedEntry = {
      timestamp,
      source,
      message: line
    };
    
    fs.appendFileSync(this.aggregatedLogFile, JSON.stringify(aggregatedEntry) + '\n');
    
    // Classify and analyze
    if (this.logPatterns.error.test(line)) {
      this.handleError(line, source);
    } else if (this.logPatterns.warning.test(line)) {
      this.handleWarning(line, source);
    } else if (this.logPatterns.slow.test(line)) {
      this.handleSlowOperation(line, source);
    }
    
    // Update metrics
    if (source.includes('metrics')) {
      try {
        const metric = JSON.parse(line);
        this.updateMetrics(metric);
      } catch (e) {
        // Not JSON metrics
      }
    }
  }

  handleError(line, source) {
    this.errorStats.total++;
    
    // Extract error type
    const errorType = this.extractErrorType(line);
    
    if (!this.errorStats.byType[errorType]) {
      this.errorStats.byType[errorType] = 0;
    }
    this.errorStats.byType[errorType]++;
    
    // Track by hour
    const hour = new Date().toISOString().slice(0, 13);
    if (!this.errorStats.byTime[hour]) {
      this.errorStats.byTime[hour] = 0;
    }
    this.errorStats.byTime[hour]++;
    
    // Update top errors
    this.updateTopErrors(errorType, line);
    
    // Real-time alert for critical errors
    if (line.includes('[CRITICAL]') || line.includes('FATAL')) {
      this.sendCriticalAlert(line, source);
    }
  }

  handleWarning(line, source) {
    // Log warnings for analysis
    const warningEntry = {
      timestamp: new Date().toISOString(),
      source,
      message: line
    };
    
    // Could implement warning-specific logic here
  }

  handleSlowOperation(line, source) {
    const slowOp = {
      timestamp: new Date().toISOString(),
      source,
      message: line
    };
    
    this.metrics.slowQueries.push(slowOp);
    
    // Keep only last 100 slow operations
    if (this.metrics.slowQueries.length > 100) {
      this.metrics.slowQueries.shift();
    }
  }

  extractErrorType(line) {
    // Common error patterns
    const patterns = [
      { regex: /TypeError:.*/, type: 'TypeError' },
      { regex: /ReferenceError:.*/, type: 'ReferenceError' },
      { regex: /SyntaxError:.*/, type: 'SyntaxError' },
      { regex: /Database.*Error/, type: 'DatabaseError' },
      { regex: /Connection.*failed/, type: 'ConnectionError' },
      { regex: /Authentication.*failed/, type: 'AuthError' },
      { regex: /Timeout/, type: 'TimeoutError' }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        return pattern.type;
      }
    }
    
    return 'UnknownError';
  }

  updateTopErrors(errorType, line) {
    const existingError = this.errorStats.topErrors.find(e => e.type === errorType);
    
    if (existingError) {
      existingError.count++;
      existingError.lastSeen = new Date().toISOString();
      existingError.samples.push(line.substring(0, 200));
      if (existingError.samples.length > 3) {
        existingError.samples.shift();
      }
    } else {
      this.errorStats.topErrors.push({
        type: errorType,
        count: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        samples: [line.substring(0, 200)]
      });
    }
    
    // Sort by count and keep top 10
    this.errorStats.topErrors.sort((a, b) => b.count - a.count);
    this.errorStats.topErrors = this.errorStats.topErrors.slice(0, 10);
  }

  updateMetrics(metric) {
    if (metric.responseTime) {
      // Update average response time
      this.metrics.requestCount++;
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (this.metrics.requestCount - 1) + metric.responseTime) / 
        this.metrics.requestCount;
    }
  }

  setupErrorTracking() {
    // Track error rate per minute
    setInterval(() => {
      const now = new Date();
      const minuteAgo = new Date(now - 60000);
      
      // Calculate error rate
      const recentErrors = Object.entries(this.errorStats.byTime)
        .filter(([time]) => new Date(time) > minuteAgo)
        .reduce((sum, [, count]) => sum + count, 0);
      
      this.metrics.errorRate = recentErrors;
      
      // Alert if error rate is high
      if (recentErrors > 50) {
        this.sendHighErrorRateAlert(recentErrors);
      }
    }, 60000);
  }

  analyzeLogsAndGenerateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.errorStats.total,
        errorRate: this.metrics.errorRate,
        avgResponseTime: this.metrics.avgResponseTime.toFixed(2),
        requestCount: this.metrics.requestCount,
        slowOperations: this.metrics.slowQueries.length
      },
      errorBreakdown: this.errorStats.byType,
      topErrors: this.errorStats.topErrors,
      recentSlowOperations: this.metrics.slowQueries.slice(-10)
    };
    
    // Save report
    fs.writeFileSync(this.errorSummaryFile, JSON.stringify(report, null, 2));
    
    // Save metrics
    fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    
    console.log('Report generated:', {
      errors: report.summary.totalErrors,
      errorRate: report.summary.errorRate,
      avgResponseTime: report.summary.avgResponseTime + 'ms'
    });
  }

  sendCriticalAlert(message, source) {
    console.error(`[CRITICAL ALERT] from ${source}:`, message);
    // TODO: Implement actual alerting (email, webhook, etc.)
  }

  sendHighErrorRateAlert(errorCount) {
    console.error(`[HIGH ERROR RATE] ${errorCount} errors in the last minute`);
    // TODO: Implement actual alerting
  }
}

// Check if tail module is installed
try {
  require.resolve('tail');
} catch(e) {
  console.log('Installing required dependency: tail');
  require('child_process').execSync('npm install tail', { stdio: 'inherit' });
}

// Start the aggregator
const aggregator = new LogAggregator();
aggregator.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down log aggregator...');
  process.exit(0);
});