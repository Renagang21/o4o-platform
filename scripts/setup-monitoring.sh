#!/bin/bash

# ============================================
# O4O Platform 모니터링 시스템 설정
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 로그 디렉토리 설정
LOG_DIR="/var/log/o4o-platform"
PM2_LOG_DIR="/var/log/pm2"
MONITORING_DIR="/home/ubuntu/o4o-monitoring"

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo -e "${PURPLE}🔍 O4O Platform 모니터링 시스템 설정${NC}"
echo "================================================"

# 1. 로그 디렉토리 생성
log_info "로그 디렉토리 설정 중..."
sudo mkdir -p "$LOG_DIR" "$PM2_LOG_DIR" "$MONITORING_DIR"
sudo chown -R $USER:$USER "$LOG_DIR" "$MONITORING_DIR"
sudo chmod 755 "$LOG_DIR" "$PM2_LOG_DIR" "$MONITORING_DIR"

# 2. 로그 로테이션 설정
log_info "로그 로테이션 설정 중..."
sudo tee /etc/logrotate.d/o4o-platform > /dev/null << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

$PM2_LOG_DIR/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 3. PM2 로그 수집기 설정
log_info "PM2 로그 수집기 생성 중..."
cat > "$MONITORING_DIR/log-collector.js" << 'EOF'
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class LogCollector {
    constructor() {
        this.logDir = '/var/log/o4o-platform';
        this.pm2LogDir = '/var/log/pm2';
        this.collectionInterval = 60000; // 1분마다
        this.maxLogSize = 50 * 1024 * 1024; // 50MB
    }

    async start() {
        console.log('🔍 O4O 로그 수집기 시작...');
        
        // 디렉토리 확인/생성
        this.ensureDirectories();
        
        // 로그 수집 시작
        this.collectLogs();
        setInterval(() => this.collectLogs(), this.collectionInterval);
        
        // 로그 분석 시작
        this.analyzeLogs();
        setInterval(() => this.analyzeLogs(), this.collectionInterval * 5); // 5분마다
    }

    ensureDirectories() {
        [this.logDir, `${this.logDir}/errors`, `${this.logDir}/performance`].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async collectLogs() {
        try {
            // PM2 로그 상태 수집
            const pm2Status = await this.getPM2Status();
            const timestamp = new Date().toISOString();
            
            // 통합 로그 파일에 기록
            const logEntry = {
                timestamp,
                pm2Status,
                systemMetrics: await this.getSystemMetrics()
            };

            fs.appendFileSync(
                `${this.logDir}/combined.log`,
                JSON.stringify(logEntry) + '\n'
            );

            // 오류 로그 필터링
            this.filterErrorLogs();
            
        } catch (error) {
            console.error('로그 수집 오류:', error.message);
        }
    }

    async getPM2Status() {
        return new Promise((resolve) => {
            exec('pm2 jlist', (error, stdout) => {
                if (error) {
                    resolve({ error: error.message });
                    return;
                }
                
                try {
                    const processes = JSON.parse(stdout);
                    resolve({
                        processes: processes.map(p => ({
                            name: p.name,
                            status: p.pm2_env.status,
                            cpu: p.monit.cpu,
                            memory: p.monit.memory,
                            restarts: p.pm2_env.restart_time,
                            uptime: Date.now() - p.pm2_env.pm_uptime
                        }))
                    });
                } catch (parseError) {
                    resolve({ error: 'PM2 상태 파싱 실패' });
                }
            });
        });
    }

    async getSystemMetrics() {
        const os = require('os');
        return {
            cpuUsage: os.loadavg(),
            memoryUsage: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            uptime: os.uptime()
        };
    }

    filterErrorLogs() {
        const errorPatterns = [
            /ERROR/i,
            /FATAL/i,
            /WARN/i,
            /Failed/i,
            /Exception/i,
            /timeout/i
        ];

        // PM2 에러 로그 검사
        const pm2ErrorFile = `${this.pm2LogDir}/o4o-api-server-error.log`;
        if (fs.existsSync(pm2ErrorFile)) {
            const content = fs.readFileSync(pm2ErrorFile, 'utf8');
            const lines = content.split('\n').slice(-100); // 최근 100줄

            const errors = lines.filter(line => 
                errorPatterns.some(pattern => pattern.test(line))
            );

            if (errors.length > 0) {
                const errorLog = {
                    timestamp: new Date().toISOString(),
                    source: 'pm2-error',
                    errors: errors
                };

                fs.appendFileSync(
                    `${this.logDir}/errors/filtered-errors.log`,
                    JSON.stringify(errorLog) + '\n'
                );
            }
        }
    }

    async analyzeLogs() {
        try {
            // 성능 메트릭 분석
            const perfMetrics = await this.analyzePerformance();
            
            fs.writeFileSync(
                `${this.logDir}/performance/metrics.json`,
                JSON.stringify(perfMetrics, null, 2)
            );

            // 알림이 필요한 상황 체크
            this.checkAlerts(perfMetrics);
            
        } catch (error) {
            console.error('로그 분석 오류:', error.message);
        }
    }

    async analyzePerformance() {
        const pm2Status = await this.getPM2Status();
        const systemMetrics = await this.getSystemMetrics();
        
        return {
            timestamp: new Date().toISOString(),
            apiServer: {
                status: pm2Status.processes?.find(p => p.name === 'o4o-api-server')?.status || 'unknown',
                memory: pm2Status.processes?.find(p => p.name === 'o4o-api-server')?.memory || 0,
                cpu: pm2Status.processes?.find(p => p.name === 'o4o-api-server')?.cpu || 0,
                restarts: pm2Status.processes?.find(p => p.name === 'o4o-api-server')?.restarts || 0
            },
            system: {
                memoryUsagePercent: ((systemMetrics.memoryUsage.used / systemMetrics.memoryUsage.total) * 100).toFixed(2),
                cpuLoad: systemMetrics.cpuUsage[0],
                uptime: systemMetrics.uptime
            }
        };
    }

    checkAlerts(metrics) {
        const alerts = [];
        
        // API 서버 상태 체크
        if (metrics.apiServer.status !== 'online') {
            alerts.push({
                type: 'critical',
                message: `API 서버가 오프라인 상태입니다: ${metrics.apiServer.status}`
            });
        }

        // 메모리 사용량 체크 (80% 이상)
        if (parseFloat(metrics.system.memoryUsagePercent) > 80) {
            alerts.push({
                type: 'warning',
                message: `메모리 사용량이 높습니다: ${metrics.system.memoryUsagePercent}%`
            });
        }

        // CPU 부하 체크 (5.0 이상)
        if (metrics.system.cpuLoad > 5.0) {
            alerts.push({
                type: 'warning',
                message: `CPU 부하가 높습니다: ${metrics.system.cpuLoad}`
            });
        }

        // 재시작 횟수 체크 (1시간에 3회 이상)
        if (metrics.apiServer.restarts > 3) {
            alerts.push({
                type: 'warning',
                message: `API 서버 재시작이 빈번합니다: ${metrics.apiServer.restarts}회`
            });
        }

        if (alerts.length > 0) {
            this.sendAlerts(alerts);
        }
    }

    sendAlerts(alerts) {
        const alertFile = `${this.logDir}/alerts.log`;
        const alertEntry = {
            timestamp: new Date().toISOString(),
            alerts
        };

        fs.appendFileSync(alertFile, JSON.stringify(alertEntry) + '\n');
        
        // 콘솔에도 출력
        console.log('🚨 알림 발생:');
        alerts.forEach(alert => {
            console.log(`${alert.type.toUpperCase()}: ${alert.message}`);
        });
    }
}

// 로그 수집기 시작
const collector = new LogCollector();
collector.start();

process.on('SIGINT', () => {
    console.log('\n🔍 로그 수집기 종료 중...');
    process.exit(0);
});
EOF

# 4. 모니터링 대시보드 생성
log_info "모니터링 대시보드 생성 중..."
cat > "$MONITORING_DIR/dashboard.js" << 'EOF'
const fs = require('fs');
const http = require('http');
const path = require('path');

class MonitoringDashboard {
    constructor() {
        this.port = 3003;
        this.logDir = '/var/log/o4o-platform';
    }

    start() {
        const server = http.createServer((req, res) => {
            if (req.url === '/') {
                this.serveDashboard(res);
            } else if (req.url === '/api/status') {
                this.serveStatus(res);
            } else if (req.url === '/api/logs') {
                this.serveLogs(res);
            } else if (req.url === '/api/performance') {
                this.servePerformance(res);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        server.listen(this.port, () => {
            console.log(`📊 모니터링 대시보드: http://localhost:${this.port}`);
        });
    }

    serveDashboard(res) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>O4O Platform 모니터링</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-online { color: #28a745; }
        .status-offline { color: #dc3545; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #e9ecef; border-radius: 5px; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .alert-critical { background: #f8d7da; border: 1px solid #f5c6cb; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .refresh-btn { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 O4O Platform 모니터링 대시보드</h1>
        
        <div class="card">
            <h2>시스템 상태</h2>
            <button class="refresh-btn" onclick="refreshData()">새로고침</button>
            <div id="status-container">로딩 중...</div>
        </div>

        <div class="card">
            <h2>성능 메트릭</h2>
            <div id="performance-container">로딩 중...</div>
        </div>

        <div class="card">
            <h2>최근 로그</h2>
            <div id="logs-container">로딩 중...</div>
        </div>
    </div>

    <script>
        async function fetchData(endpoint) {
            try {
                const response = await fetch(endpoint);
                return await response.json();
            } catch (error) {
                return { error: error.message };
            }
        }

        async function refreshData() {
            // 상태 정보 로드
            const status = await fetchData('/api/status');
            document.getElementById('status-container').innerHTML = renderStatus(status);

            // 성능 메트릭 로드
            const performance = await fetchData('/api/performance');
            document.getElementById('performance-container').innerHTML = renderPerformance(performance);

            // 로그 로드
            const logs = await fetchData('/api/logs');
            document.getElementById('logs-container').innerHTML = renderLogs(logs);
        }

        function renderStatus(data) {
            if (data.error) return \`<div class="alert alert-critical">오류: \${data.error}</div>\`;
            
            return \`
                <div class="metric">
                    <strong>API 서버:</strong> 
                    <span class="status-\${data.apiServer?.status === 'online' ? 'online' : 'offline'}">
                        \${data.apiServer?.status || '알 수 없음'}
                    </span>
                </div>
                <div class="metric">
                    <strong>메모리 사용량:</strong> \${data.system?.memoryUsagePercent || 0}%
                </div>
                <div class="metric">
                    <strong>CPU 부하:</strong> \${data.system?.cpuLoad || 0}
                </div>
                <div class="metric">
                    <strong>가동 시간:</strong> \${Math.floor((data.system?.uptime || 0) / 3600)}시간
                </div>
            \`;
        }

        function renderPerformance(data) {
            if (data.error) return \`<div class="alert alert-critical">오류: \${data.error}</div>\`;
            
            return \`
                <table>
                    <tr><th>메트릭</th><th>값</th><th>상태</th></tr>
                    <tr>
                        <td>API 서버 메모리</td>
                        <td>\${Math.round((data.apiServer?.memory || 0) / 1024 / 1024)}MB</td>
                        <td>\${(data.apiServer?.memory || 0) > 1024*1024*1024 ? '⚠️' : '✅'}</td>
                    </tr>
                    <tr>
                        <td>API 서버 CPU</td>
                        <td>\${data.apiServer?.cpu || 0}%</td>
                        <td>\${(data.apiServer?.cpu || 0) > 80 ? '⚠️' : '✅'}</td>
                    </tr>
                    <tr>
                        <td>재시작 횟수</td>
                        <td>\${data.apiServer?.restarts || 0}회</td>
                        <td>\${(data.apiServer?.restarts || 0) > 3 ? '⚠️' : '✅'}</td>
                    </tr>
                </table>
            \`;
        }

        function renderLogs(data) {
            if (data.error) return \`<div class="alert alert-critical">오류: \${data.error}</div>\`;
            
            if (!data.logs || data.logs.length === 0) {
                return '<p>최근 로그가 없습니다.</p>';
            }
            
            return data.logs.map(log => \`
                <div style="margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 3px;">
                    <small>\${log.timestamp}</small><br>
                    <code>\${log.message}</code>
                </div>
            \`).join('');
        }

        // 자동 새로고침 (30초마다)
        setInterval(refreshData, 30000);
        
        // 페이지 로드 시 초기 데이터 로드
        refreshData();
    </script>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    serveStatus(res) {
        try {
            const perfFile = `${this.logDir}/performance/metrics.json`;
            let data = { error: '데이터 없음' };
            
            if (fs.existsSync(perfFile)) {
                data = JSON.parse(fs.readFileSync(perfFile, 'utf8'));
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    serveLogs(res) {
        try {
            const logFile = `${this.logDir}/combined.log`;
            let logs = [];
            
            if (fs.existsSync(logFile)) {
                const content = fs.readFileSync(logFile, 'utf8');
                const lines = content.split('\n').filter(line => line.trim()).slice(-20);
                
                logs = lines.map(line => {
                    try {
                        const data = JSON.parse(line);
                        return {
                            timestamp: data.timestamp,
                            message: JSON.stringify(data, null, 2)
                        };
                    } catch {
                        return {
                            timestamp: new Date().toISOString(),
                            message: line
                        };
                    }
                });
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ logs }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    servePerformance(res) {
        this.serveStatus(res); // 같은 데이터 사용
    }
}

const dashboard = new MonitoringDashboard();
dashboard.start();
EOF

# 5. PM2 모니터링 프로세스 설정
log_info "PM2 모니터링 프로세스 설정 중..."
cat > "$MONITORING_DIR/ecosystem.monitoring.cjs" << EOF
module.exports = {
  apps: [
    {
      name: 'o4o-log-collector',
      script: '$MONITORING_DIR/log-collector.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'o4o-dashboard',
      script: '$MONITORING_DIR/dashboard.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    }
  ]
};
EOF

# 6. 시스템 서비스 등록
log_info "시스템 서비스 등록 중..."
sudo tee /etc/systemd/system/o4o-monitoring.service > /dev/null << EOF
[Unit]
Description=O4O Platform Monitoring Service
After=network.target

[Service]
Type=forking
User=$USER
WorkingDirectory=$MONITORING_DIR
ExecStart=/usr/bin/pm2 start ecosystem.monitoring.cjs
ExecReload=/usr/bin/pm2 reload ecosystem.monitoring.cjs
ExecStop=/usr/bin/pm2 delete ecosystem.monitoring.cjs
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable o4o-monitoring

log_success "모니터링 시스템 설정 완료!"
echo ""
echo "================================================"
echo "🔍 모니터링 시스템 정보:"
echo "  대시보드: http://localhost:3003"
echo "  로그 디렉토리: $LOG_DIR"
echo "  모니터링 디렉토리: $MONITORING_DIR"
echo ""
echo "시작하려면:"
echo "  sudo systemctl start o4o-monitoring"
echo ""
echo "또는 직접 실행:"
echo "  cd $MONITORING_DIR"
echo "  pm2 start ecosystem.monitoring.cjs"
echo "================================================"