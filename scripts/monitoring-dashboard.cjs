#!/usr/bin/env node

/**
 * O4O Platform 통합 모니터링 대시보드
 * 모든 모니터링 시스템을 통합하여 웹 기반 대시보드 제공
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class MonitoringDashboard {
    constructor() {
        this.port = process.env.DASHBOARD_PORT || 3003;
        this.logDir = process.env.LOG_DIR || '/var/log/o4o-platform';
        this.performanceApiUrl = 'http://localhost:3005';
        
        this.dashboardData = {
            lastUpdate: null,
            systemHealth: {},
            deploymentStatus: {},
            performanceMetrics: {},
            alerts: [],
            logs: []
        };
    }

    async start() {
        console.log('📊 O4O 모니터링 대시보드 시작...');
        
        // 데이터 수집 시작
        this.startDataCollection();
        
        // HTTP 서버 시작
        this.startHttpServer();
        
        console.log(`✅ 모니터링 대시보드: http://localhost:${this.port}`);
    }

    startDataCollection() {
        // 5초마다 모든 데이터 수집
        setInterval(async () => {
            await this.collectAllData();
        }, 5000);

        // 즉시 한 번 실행
        this.collectAllData();
    }

    async collectAllData() {
        try {
            const [systemHealth, deploymentStatus, performanceMetrics, alerts, logs] = await Promise.all([
                this.getSystemHealth(),
                this.getDeploymentStatus(),
                this.getPerformanceMetrics(),
                this.getRecentAlerts(),
                this.getRecentLogs()
            ]);

            this.dashboardData = {
                lastUpdate: new Date().toISOString(),
                systemHealth,
                deploymentStatus,
                performanceMetrics,
                alerts,
                logs
            };

        } catch (error) {
            console.error('데이터 수집 오류:', error.message);
        }
    }

    async getSystemHealth() {
        return new Promise((resolve) => {
            exec('pm2 jlist', (error, stdout) => {
                if (error) {
                    resolve({ error: error.message, status: 'error' });
                    return;
                }

                try {
                    const processes = JSON.parse(stdout);
                    const apiServer = processes.find(p => p.name === 'o4o-api-server');
                    
                    if (!apiServer) {
                        resolve({ status: 'offline', error: 'API 서버를 찾을 수 없음' });
                        return;
                    }

                    resolve({
                        status: apiServer.pm2_env.status,
                        memory: Math.round(apiServer.monit.memory / 1024 / 1024), // MB
                        cpu: apiServer.monit.cpu,
                        uptime: apiServer.pm2_env.pm_uptime,
                        restarts: apiServer.pm2_env.restart_time,
                        instances: processes.filter(p => p.name === 'o4o-api-server').length,
                        lastUpdate: new Date().toISOString()
                    });
                } catch (parseError) {
                    resolve({ error: 'PM2 상태 파싱 실패', status: 'error' });
                }
            });
        });
    }

    async getDeploymentStatus() {
        try {
            const deploymentsFile = `${this.logDir}/deployments.log`;
            if (!fs.existsSync(deploymentsFile)) {
                return { status: 'unknown', message: '배포 로그 없음' };
            }

            const content = fs.readFileSync(deploymentsFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                return { status: 'unknown', message: '배포 기록 없음' };
            }

            const lastDeployment = JSON.parse(lines[lines.length - 1]);
            return {
                status: lastDeployment.status,
                timestamp: lastDeployment.timestamp,
                commit: lastDeployment.commit?.slice(0, 7) || 'N/A',
                app: lastDeployment.app || 'o4o-platform',
                message: lastDeployment.message || lastDeployment.error || '성공'
            };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    async getPerformanceMetrics() {
        try {
            const response = await this.httpRequest(`${this.performanceApiUrl}/metrics`);
            const metrics = JSON.parse(response);
            
            return {
                totalRequests: metrics.totalRequests || 0,
                successfulRequests: metrics.successfulRequests || 0,
                failedRequests: metrics.failedRequests || 0,
                averageResponseTime: metrics.averageResponseTime || 0,
                availability: metrics.availability || 0,
                uptime: metrics.uptime || 0,
                lastUpdate: metrics.lastUpdate
            };
        } catch (error) {
            return {
                error: error.message,
                totalRequests: 0,
                availability: 0
            };
        }
    }

    async getRecentAlerts() {
        try {
            const alertsFile = `${this.logDir}/notifications.log`;
            if (!fs.existsSync(alertsFile)) {
                return [];
            }

            const content = fs.readFileSync(alertsFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            return lines.slice(-10).map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            console.error('알림 로드 실패:', error.message);
            return [];
        }
    }

    async getRecentLogs() {
        try {
            const logsFile = '/var/log/pm2/o4o-api-server-combined.log';
            if (!fs.existsSync(logsFile)) {
                return [];
            }

            return new Promise((resolve) => {
                exec(`tail -20 "${logsFile}"`, (error, stdout) => {
                    if (error) {
                        resolve([]);
                        return;
                    }

                    const lines = stdout.split('\n').filter(line => line.trim());
                    resolve(lines.map(line => ({
                        message: line,
                        timestamp: new Date().toISOString()
                    })));
                });
            });
        } catch (error) {
            return [];
        }
    }

    httpRequest(url) {
        return new Promise((resolve, reject) => {
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('요청 타임아웃'));
            });
        });
    }

    startHttpServer() {
        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            const url = req.url;

            if (url === '/') {
                this.serveDashboard(res);
            } else if (url === '/api/dashboard') {
                this.serveApiData(res);
            } else if (url === '/api/health') {
                this.serveHealthCheck(res);
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
        const html = this.generateDashboardHTML();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    }

    serveApiData(res) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(this.dashboardData, null, 2));
    }

    serveHealthCheck(res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            uptime: process.uptime(),
            lastDataUpdate: this.dashboardData.lastUpdate
        }));
    }

    generateDashboardHTML() {
        const data = this.dashboardData;
        const systemHealth = data.systemHealth || {};
        const deployment = data.deploymentStatus || {};
        const performance = data.performanceMetrics || {};

        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>O4O Platform 모니터링 대시보드</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: #1a1a1a; 
            color: #fff; 
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #4CAF50; font-size: 2.5em; margin-bottom: 10px; }
        .last-update { color: #888; font-size: 0.9em; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { 
            background: #2d2d2d; 
            border-radius: 10px; 
            padding: 20px; 
            border: 1px solid #444;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .card h2 { color: #4CAF50; margin-bottom: 15px; font-size: 1.3em; }
        .status { 
            display: inline-block; 
            padding: 5px 12px; 
            border-radius: 20px; 
            font-size: 0.85em; 
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.online { background: #4CAF50; color: white; }
        .status.offline { background: #f44336; color: white; }
        .status.warning { background: #ff9800; color: white; }
        .status.error { background: #f44336; color: white; }
        .status.success { background: #4CAF50; color: white; }
        .status.failure { background: #f44336; color: white; }
        .metric { margin: 10px 0; }
        .metric-label { color: #ccc; font-size: 0.9em; }
        .metric-value { font-size: 1.1em; font-weight: bold; color: #4CAF50; }
        .logs { max-height: 300px; overflow-y: auto; background: #1a1a1a; padding: 15px; border-radius: 5px; }
        .log-entry { margin: 5px 0; font-family: monospace; font-size: 0.8em; color: #ccc; }
        .alerts { max-height: 300px; overflow-y: auto; }
        .alert { 
            margin: 10px 0; 
            padding: 10px; 
            border-radius: 5px; 
            border-left: 4px solid #4CAF50;
            background: #333;
        }
        .alert.critical { border-left-color: #f44336; }
        .alert.warning { border-left-color: #ff9800; }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #333;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: #4CAF50;
            transition: width 0.3s ease;
        }
        .refresh-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        .refresh-btn:hover { background: #45a049; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 O4O Platform 모니터링</h1>
            <div class="last-update">마지막 업데이트: ${data.lastUpdate || 'N/A'}</div>
        </div>

        <div class="grid">
            <!-- 시스템 상태 -->
            <div class="card">
                <h2>🖥️ 시스템 상태</h2>
                <div class="metric">
                    <div class="metric-label">서비스 상태</div>
                    <div class="metric-value">
                        <span class="status ${systemHealth.status || 'error'}">${systemHealth.status || 'Unknown'}</span>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">메모리 사용량</div>
                    <div class="metric-value">${systemHealth.memory || 0} MB</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min((systemHealth.memory || 0) / 20, 100)}%"></div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">CPU 사용률</div>
                    <div class="metric-value">${systemHealth.cpu || 0}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${systemHealth.cpu || 0}%"></div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">인스턴스 수</div>
                    <div class="metric-value">${systemHealth.instances || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">재시작 횟수</div>
                    <div class="metric-value">${systemHealth.restarts || 0}</div>
                </div>
            </div>

            <!-- 배포 상태 -->
            <div class="card">
                <h2>🚀 배포 상태</h2>
                <div class="metric">
                    <div class="metric-label">배포 상태</div>
                    <div class="metric-value">
                        <span class="status ${deployment.status || 'unknown'}">${deployment.status || 'Unknown'}</span>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">애플리케이션</div>
                    <div class="metric-value">${deployment.app || 'N/A'}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">커밋</div>
                    <div class="metric-value">${deployment.commit || 'N/A'}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">배포 시간</div>
                    <div class="metric-value">${deployment.timestamp ? new Date(deployment.timestamp).toLocaleString('ko-KR') : 'N/A'}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">메시지</div>
                    <div class="metric-value">${deployment.message || 'N/A'}</div>
                </div>
            </div>

            <!-- 성능 메트릭 -->
            <div class="card">
                <h2>📈 성능 메트릭</h2>
                <div class="metric">
                    <div class="metric-label">총 요청 수</div>
                    <div class="metric-value">${performance.totalRequests || 0}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">성공률</div>
                    <div class="metric-value">${performance.availability ? performance.availability.toFixed(2) : 0}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${performance.availability || 0}%"></div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">평균 응답시간</div>
                    <div class="metric-value">${performance.averageResponseTime ? performance.averageResponseTime.toFixed(2) : 0} ms</div>
                </div>
                <div class="metric">
                    <div class="metric-label">업타임</div>
                    <div class="metric-value">${performance.uptime ? performance.uptime.toFixed(2) : 0} 시간</div>
                </div>
                <div class="metric">
                    <div class="metric-label">실패 요청</div>
                    <div class="metric-value">${performance.failedRequests || 0}</div>
                </div>
            </div>

            <!-- 최근 알림 -->
            <div class="card">
                <h2>🔔 최근 알림</h2>
                <div class="alerts">
                    ${(data.alerts || []).slice(-5).reverse().map(alert => `
                        <div class="alert ${alert.level || 'info'}">
                            <strong>${alert.title || 'N/A'}</strong><br>
                            ${alert.message || 'N/A'}<br>
                            <small>${alert.timestamp ? new Date(alert.timestamp).toLocaleString('ko-KR') : 'N/A'}</small>
                        </div>
                    `).join('') || '<div class="alert">알림이 없습니다</div>'}
                </div>
            </div>

            <!-- 최근 로그 -->
            <div class="card">
                <h2>📝 최근 로그</h2>
                <div class="logs">
                    ${(data.logs || []).slice(-10).reverse().map(log => `
                        <div class="log-entry">${log.message || 'N/A'}</div>
                    `).join('') || '<div class="log-entry">로그가 없습니다</div>'}
                </div>
            </div>
        </div>
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄 새로고침</button>

    <script>
        // 자동 새로고침 (30초마다)
        setInterval(() => {
            location.reload();
        }, 30000);

        // 상태에 따른 페이지 타이틀 업데이트
        const systemStatus = '${systemHealth.status || 'unknown'}';
        const emoji = systemStatus === 'online' ? '🟢' : systemStatus === 'offline' ? '🔴' : '🟡';
        document.title = emoji + ' O4O Platform 모니터링';
    </script>
</body>
</html>`;
    }
}

// 모니터링 대시보드 시작
const dashboard = new MonitoringDashboard();
dashboard.start();

process.on('SIGINT', () => {
    console.log('\n📊 모니터링 대시보드 종료 중...');
    process.exit(0);
});

module.exports = MonitoringDashboard;