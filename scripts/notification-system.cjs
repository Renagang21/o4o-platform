#!/usr/bin/env node

/**
 * O4O Platform 실시간 알림 시스템
 * 배포 성공/실패, 시스템 상태 변화 등을 실시간으로 알림
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');

class NotificationSystem {
    constructor() {
        this.webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
        this.logDir = process.env.LOG_DIR || '/var/log/o4o-platform';
        this.lastNotificationTime = {};
        this.cooldownTime = 5 * 60 * 1000; // 5분 쿨다운
        
        // 알림 설정
        this.notificationConfig = {
            deployment: {
                success: true,
                failure: true,
                cooldown: 0 // 배포 알림은 쿨다운 없음
            },
            system: {
                highMemory: true,
                highCpu: true,
                serviceDown: true,
                cooldown: this.cooldownTime
            },
            errors: {
                critical: true,
                warning: false, // 경고는 기본적으로 비활성화
                cooldown: this.cooldownTime
            }
        };
    }

    async start() {
        console.log('🔔 O4O 알림 시스템 시작...');
        
        // 로그 디렉토리 모니터링
        this.watchLogFiles();
        
        // 주기적 시스템 상태 체크
        this.startSystemMonitoring();
        
        // 배포 상태 모니터링
        this.startDeploymentMonitoring();
        
        console.log('✅ 알림 시스템이 활성화되었습니다');
    }

    watchLogFiles() {
        const alertsFile = `${this.logDir}/alerts.log`;
        
        // alerts.log 파일 감시
        if (fs.existsSync(alertsFile)) {
            fs.watchFile(alertsFile, (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                    this.processNewAlerts();
                }
            });
        }

        // PM2 에러 로그 감시
        const pm2ErrorLog = '/var/log/pm2/o4o-api-server-error.log';
        if (fs.existsSync(pm2ErrorLog)) {
            fs.watchFile(pm2ErrorLog, (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                    this.checkCriticalErrors();
                }
            });
        }
    }

    async processNewAlerts() {
        try {
            const alertsFile = `${this.logDir}/alerts.log`;
            const content = fs.readFileSync(alertsFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) return;
            
            // 마지막 알림 파싱
            const lastAlert = JSON.parse(lines[lines.length - 1]);
            
            for (const alert of lastAlert.alerts) {
                await this.sendNotification({
                    type: 'system',
                    level: alert.type,
                    title: '🚨 시스템 알림',
                    message: alert.message,
                    timestamp: lastAlert.timestamp
                });
            }
        } catch (error) {
            console.error('알림 처리 오류:', error.message);
        }
    }

    async checkCriticalErrors() {
        try {
            const errorFile = '/var/log/pm2/o4o-api-server-error.log';
            const content = fs.readFileSync(errorFile, 'utf8');
            const lines = content.split('\n').slice(-10); // 최근 10줄 체크
            
            const criticalPatterns = [
                /FATAL/i,
                /Uncaught Exception/i,
                /ECONNREFUSED/i,
                /Cannot read property/i,
                /TypeError/i
            ];
            
            for (const line of lines) {
                if (criticalPatterns.some(pattern => pattern.test(line))) {
                    await this.sendNotification({
                        type: 'error',
                        level: 'critical',
                        title: '💥 치명적 오류 발생',
                        message: `API 서버에서 치명적 오류가 발생했습니다:\n\`\`\`${line.slice(0, 200)}\`\`\``,
                        timestamp: new Date().toISOString()
                    });
                    break; // 한 번에 하나의 오류만 알림
                }
            }
        } catch (error) {
            console.error('오류 로그 체크 실패:', error.message);
        }
    }

    startSystemMonitoring() {
        setInterval(async () => {
            try {
                const metrics = await this.getSystemMetrics();
                await this.checkSystemHealth(metrics);
            } catch (error) {
                console.error('시스템 모니터링 오류:', error.message);
            }
        }, 60000); // 1분마다
    }

    startDeploymentMonitoring() {
        // GitHub Actions 웹훅 서버 시작
        const server = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/webhook/deployment') {
                this.handleDeploymentWebhook(req, res);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        const port = process.env.WEBHOOK_PORT || 3004;
        server.listen(port, () => {
            console.log(`🎣 배포 웹훅 서버 실행 중: http://localhost:${port}/webhook/deployment`);
        });
    }

    async handleDeploymentWebhook(req, res) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                await this.processDeploymentEvent(payload);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (error) {
                console.error('웹훅 처리 오류:', error.message);
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        });
    }

    async processDeploymentEvent(payload) {
        const { status, app, commit, timestamp, error } = payload;
        
        if (status === 'success') {
            await this.sendNotification({
                type: 'deployment',
                level: 'success',
                title: '🚀 배포 성공',
                message: `${app} 애플리케이션이 성공적으로 배포되었습니다!\n**커밋**: ${commit?.slice(0, 7) || 'N/A'}`,
                timestamp: timestamp || new Date().toISOString()
            });
        } else if (status === 'failure') {
            await this.sendNotification({
                type: 'deployment',
                level: 'critical',
                title: '💥 배포 실패',
                message: `${app} 애플리케이션 배포가 실패했습니다.\n**오류**: ${error || '알 수 없는 오류'}\n**커밋**: ${commit?.slice(0, 7) || 'N/A'}`,
                timestamp: timestamp || new Date().toISOString()
            });
        }
    }

    async getSystemMetrics() {
        return new Promise((resolve) => {
            exec('pm2 jlist', (error, stdout) => {
                if (error) {
                    resolve({ error: error.message });
                    return;
                }
                
                try {
                    const processes = JSON.parse(stdout);
                    const apiServer = processes.find(p => p.name === 'o4o-api-server');
                    
                    resolve({
                        apiServer: apiServer ? {
                            status: apiServer.pm2_env.status,
                            memory: apiServer.monit.memory,
                            cpu: apiServer.monit.cpu,
                            restarts: apiServer.pm2_env.restart_time
                        } : null,
                        timestamp: new Date().toISOString()
                    });
                } catch (parseError) {
                    resolve({ error: 'PM2 상태 파싱 실패' });
                }
            });
        });
    }

    async checkSystemHealth(metrics) {
        if (!metrics.apiServer) return;

        const { status, memory, cpu, restarts } = metrics.apiServer;
        
        // API 서버 다운 체크
        if (status !== 'online') {
            await this.sendNotification({
                type: 'system',
                level: 'critical',
                title: '🔴 서비스 중단',
                message: `API 서버가 오프라인 상태입니다 (상태: ${status})`,
                timestamp: metrics.timestamp
            });
        }

        // 메모리 사용량 체크 (1.5GB 이상)
        if (memory > 1.5 * 1024 * 1024 * 1024) {
            await this.sendNotification({
                type: 'system',
                level: 'warning',
                title: '⚠️ 높은 메모리 사용량',
                message: `API 서버 메모리 사용량: ${Math.round(memory / 1024 / 1024)}MB`,
                timestamp: metrics.timestamp
            });
        }

        // CPU 사용량 체크 (90% 이상)
        if (cpu > 90) {
            await this.sendNotification({
                type: 'system',
                level: 'warning',
                title: '⚠️ 높은 CPU 사용량',
                message: `API 서버 CPU 사용량: ${cpu}%`,
                timestamp: metrics.timestamp
            });
        }

        // 빈번한 재시작 체크 (5회 이상)
        if (restarts > 5) {
            await this.sendNotification({
                type: 'system',
                level: 'warning',
                title: '🔄 빈번한 재시작',
                message: `API 서버가 ${restarts}회 재시작되었습니다`,
                timestamp: metrics.timestamp
            });
        }
    }

    async sendNotification(notification) {
        const { type, level, title, message, timestamp } = notification;
        
        // 쿨다운 체크
        const key = `${type}-${level}`;
        const now = Date.now();
        const cooldown = this.notificationConfig[type]?.cooldown || 0;
        
        if (this.lastNotificationTime[key] && (now - this.lastNotificationTime[key]) < cooldown) {
            return; // 쿨다운 중
        }
        
        this.lastNotificationTime[key] = now;
        
        // 설정 체크
        if (!this.notificationConfig[type]?.[level]) {
            return; // 비활성화된 알림
        }

        // 로컬 로그 기록
        console.log(`🔔 [${level.toUpperCase()}] ${title}: ${message}`);
        
        // 파일 로그 기록
        const logEntry = {
            timestamp,
            type,
            level,
            title,
            message
        };
        
        fs.appendFileSync(
            `${this.logDir}/notifications.log`,
            JSON.stringify(logEntry) + '\n'
        );

        // 웹훅 전송 (설정된 경우)
        if (this.webhookUrl) {
            await this.sendWebhook(notification);
        }

        // 이메일 전송 (설정된 경우)
        if (process.env.EMAIL_NOTIFICATIONS === 'true') {
            await this.sendEmail(notification);
        }
    }

    async sendWebhook(notification) {
        try {
            const { title, message, level } = notification;
            
            // Slack/Discord 형식으로 메시지 구성
            const payload = {
                text: title,
                attachments: [{
                    color: level === 'critical' ? '#ff0000' : 
                           level === 'warning' ? '#ffff00' : '#00ff00',
                    fields: [{
                        title: "메시지",
                        value: message,
                        short: false
                    }, {
                        title: "시간",
                        value: new Date().toLocaleString('ko-KR'),
                        short: true
                    }]
                }]
            };

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            };

            // Node.js 내장 https 모듈 사용
            const https = require('https');
            const url = new URL(this.webhookUrl);
            
            const req = https.request({
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: 'POST',
                headers: options.headers
            });

            req.write(options.body);
            req.end();
            
        } catch (error) {
            console.error('웹훅 전송 실패:', error.message);
        }
    }

    async sendEmail(notification) {
        // 이메일 전송 로직 (선택적 구현)
        console.log('📧 이메일 알림 (구현 예정):', notification.title);
    }
}

// 알림 시스템 시작
const notificationSystem = new NotificationSystem();
notificationSystem.start();

process.on('SIGINT', () => {
    console.log('\n🔔 알림 시스템 종료 중...');
    process.exit(0);
});

module.exports = NotificationSystem;