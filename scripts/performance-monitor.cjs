#!/usr/bin/env node

/**
 * O4O Platform API 성능 모니터링 시스템
 * API 응답 시간, 에러율, 처리량 등을 실시간 모니터링
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
    constructor() {
        this.apiEndpoints = [
            'https://api.neture.co.kr/api/health',
            'https://api.neture.co.kr/api/status',
            'https://api.neture.co.kr/api/users/profile',
            'https://api.neture.co.kr/api/products',
            'https://api.neture.co.kr/api/posts'
        ];
        
        this.logDir = process.env.LOG_DIR || '/var/log/o4o-platform';
        this.performanceData = [];
        this.maxDataPoints = 288; // 24시간 (5분 간격)
        
        this.thresholds = {
            responseTime: 2000, // 2초
            errorRate: 5, // 5%
            availability: 99 // 99%
        };
        
        this.monitoringInterval = 5 * 60 * 1000; // 5분마다
        this.healthCheckInterval = 30 * 1000; // 30초마다 헬스체크
        
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            uptimeStart: Date.now()
        };
    }

    async start() {
        console.log('📊 O4O API 성능 모니터링 시작...');
        
        // 로그 디렉토리 생성
        this.ensureLogDirectory();
        
        // 기존 데이터 로드
        this.loadPerformanceData();
        
        // 주기적 성능 체크
        this.startPerformanceMonitoring();
        
        // 빠른 헬스체크
        this.startHealthChecks();
        
        // 성능 리포트 생성
        this.startReportGeneration();
        
        // HTTP 서버 시작 (메트릭 API)
        this.startMetricsServer();
        
        console.log('✅ 성능 모니터링이 활성화되었습니다');
    }

    ensureLogDirectory() {
        const perfDir = `${this.logDir}/performance`;
        if (!fs.existsSync(perfDir)) {
            fs.mkdirSync(perfDir, { recursive: true });
        }
    }

    loadPerformanceData() {
        try {
            const dataFile = `${this.logDir}/performance/historical-data.json`;
            if (fs.existsSync(dataFile)) {
                const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                this.performanceData = data.slice(-this.maxDataPoints);
                console.log(`📈 기존 성능 데이터 ${this.performanceData.length}개 로드됨`);
            }
        } catch (error) {
            console.error('성능 데이터 로드 실패:', error.message);
            this.performanceData = [];
        }
    }

    savePerformanceData() {
        try {
            const dataFile = `${this.logDir}/performance/historical-data.json`;
            fs.writeFileSync(dataFile, JSON.stringify(this.performanceData, null, 2));
        } catch (error) {
            console.error('성능 데이터 저장 실패:', error.message);
        }
    }

    startPerformanceMonitoring() {
        // 즉시 실행
        this.performFullCheck();
        
        // 주기적 실행
        setInterval(() => {
            this.performFullCheck();
        }, this.monitoringInterval);
    }

    startHealthChecks() {
        setInterval(async () => {
            try {
                const healthResult = await this.checkEndpoint('https://api.neture.co.kr/api/health');
                this.updateQuickStats(healthResult);
            } catch (error) {
                console.error('헬스체크 실패:', error.message);
                this.updateQuickStats({ success: false, responseTime: 0, error: error.message });
            }
        }, this.healthCheckInterval);
    }

    startReportGeneration() {
        // 매시간 리포트 생성
        setInterval(() => {
            this.generateHourlyReport();
        }, 60 * 60 * 1000);
        
        // 일일 리포트 생성 (자정)
        this.scheduleReportGeneration();
    }

    scheduleReportGeneration() {
        const now = new Date();
        const nextMidnight = new Date(now);
        nextMidnight.setDate(now.getDate() + 1);
        nextMidnight.setHours(0, 0, 0, 0);
        
        const timeToMidnight = nextMidnight.getTime() - now.getTime();
        
        setTimeout(() => {
            this.generateDailyReport();
            // 다음 날 리포트 스케줄링
            setInterval(() => {
                this.generateDailyReport();
            }, 24 * 60 * 60 * 1000);
        }, timeToMidnight);
    }

    async performFullCheck() {
        console.log('🔍 전체 성능 체크 수행 중...');
        
        const results = [];
        const timestamp = new Date().toISOString();
        
        for (const endpoint of this.apiEndpoints) {
            try {
                const result = await this.checkEndpoint(endpoint);
                results.push({
                    endpoint,
                    ...result,
                    timestamp
                });
                
                this.updateQuickStats(result);
                
            } catch (error) {
                console.error(`엔드포인트 체크 실패 ${endpoint}:`, error.message);
                results.push({
                    endpoint,
                    success: false,
                    responseTime: 0,
                    error: error.message,
                    timestamp
                });
                
                this.updateQuickStats({ success: false, responseTime: 0, error: error.message });
            }
        }
        
        // 전체 결과 분석
        const summary = this.analyzeBatch(results);
        
        // 데이터 저장
        this.performanceData.push(summary);
        if (this.performanceData.length > this.maxDataPoints) {
            this.performanceData.shift();
        }
        
        this.savePerformanceData();
        this.saveCurrentMetrics(summary);
        
        // 임계값 체크 및 알림
        this.checkThresholds(summary);
        
        console.log(`✅ 성능 체크 완료: 평균 응답시간 ${summary.averageResponseTime}ms, 성공률 ${summary.successRate}%`);
    }

    async checkEndpoint(url) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const protocol = url.startsWith('https://') ? https : http;
            
            const timeout = setTimeout(() => {
                reject(new Error('요청 타임아웃'));
            }, 10000); // 10초 타임아웃
            
            const req = protocol.get(url, (res) => {
                clearTimeout(timeout);
                
                let data = '';
                res.on('data', chunk => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 300,
                        responseTime,
                        statusCode: res.statusCode,
                        contentLength: data.length,
                        timestamp: new Date().toISOString()
                    });
                });
            });
            
            req.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('요청 타임아웃'));
            });
        });
    }

    updateQuickStats(result) {
        this.stats.totalRequests++;
        
        if (result.success) {
            this.stats.successfulRequests++;
            
            // 이동 평균 계산
            const weight = Math.min(this.stats.successfulRequests, 100);
            this.stats.averageResponseTime = 
                ((this.stats.averageResponseTime * (weight - 1)) + result.responseTime) / weight;
        } else {
            this.stats.failedRequests++;
        }
    }

    analyzeBatch(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        const averageResponseTime = successful.length > 0 
            ? successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length 
            : 0;
        
        const successRate = (successful.length / results.length) * 100;
        
        return {
            timestamp: new Date().toISOString(),
            totalChecks: results.length,
            successfulChecks: successful.length,
            failedChecks: failed.length,
            successRate: parseFloat(successRate.toFixed(2)),
            averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
            maxResponseTime: successful.length > 0 ? Math.max(...successful.map(r => r.responseTime)) : 0,
            minResponseTime: successful.length > 0 ? Math.min(...successful.map(r => r.responseTime)) : 0,
            endpoints: results,
            uptime: this.calculateUptime()
        };
    }

    calculateUptime() {
        const uptimeMs = Date.now() - this.stats.uptimeStart;
        const uptimeHours = uptimeMs / (1000 * 60 * 60);
        return parseFloat(uptimeHours.toFixed(2));
    }

    saveCurrentMetrics(summary) {
        const metricsFile = `${this.logDir}/performance/current-metrics.json`;
        const currentStats = {
            ...this.stats,
            lastUpdate: new Date().toISOString(),
            latestSummary: summary,
            availability: (this.stats.successfulRequests / this.stats.totalRequests) * 100
        };
        
        fs.writeFileSync(metricsFile, JSON.stringify(currentStats, null, 2));
    }

    checkThresholds(summary) {
        const alerts = [];
        
        // 응답 시간 체크
        if (summary.averageResponseTime > this.thresholds.responseTime) {
            alerts.push({
                type: 'performance',
                level: 'warning',
                message: `평균 응답 시간이 임계값을 초과했습니다: ${summary.averageResponseTime}ms (임계값: ${this.thresholds.responseTime}ms)`
            });
        }
        
        // 에러율 체크
        const errorRate = 100 - summary.successRate;
        if (errorRate > this.thresholds.errorRate) {
            alerts.push({
                type: 'availability',
                level: 'critical',
                message: `에러율이 임계값을 초과했습니다: ${errorRate.toFixed(2)}% (임계값: ${this.thresholds.errorRate}%)`
            });
        }
        
        // 가용성 체크
        const availability = (this.stats.successfulRequests / this.stats.totalRequests) * 100;
        if (availability < this.thresholds.availability) {
            alerts.push({
                type: 'availability',
                level: 'critical',
                message: `서비스 가용성이 임계값 미만입니다: ${availability.toFixed(2)}% (임계값: ${this.thresholds.availability}%)`
            });
        }
        
        // 알림 전송
        if (alerts.length > 0) {
            this.sendPerformanceAlerts(alerts);
        }
    }

    sendPerformanceAlerts(alerts) {
        const alertFile = `${this.logDir}/performance/alerts.log`;
        const alertEntry = {
            timestamp: new Date().toISOString(),
            alerts
        };
        
        fs.appendFileSync(alertFile, JSON.stringify(alertEntry) + '\n');
        
        alerts.forEach(alert => {
            console.log(`🚨 [${alert.level.toUpperCase()}] ${alert.type}: ${alert.message}`);
        });
    }

    generateHourlyReport() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        const hourlyData = this.performanceData.filter(data => 
            new Date(data.timestamp) >= oneHourAgo
        );
        
        if (hourlyData.length === 0) return;
        
        const report = this.generateReport(hourlyData, 'hourly');
        const reportFile = `${this.logDir}/performance/hourly-report-${now.getHours()}.json`;
        
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`📊 시간별 리포트 생성: ${reportFile}`);
    }

    generateDailyReport() {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const dailyData = this.performanceData.filter(data => 
            new Date(data.timestamp) >= oneDayAgo
        );
        
        if (dailyData.length === 0) return;
        
        const report = this.generateReport(dailyData, 'daily');
        const reportFile = `${this.logDir}/performance/daily-report-${now.toISOString().split('T')[0]}.json`;
        
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`📊 일일 리포트 생성: ${reportFile}`);
    }

    generateReport(data, period) {
        const totalChecks = data.reduce((sum, d) => sum + d.totalChecks, 0);
        const successfulChecks = data.reduce((sum, d) => sum + d.successfulChecks, 0);
        const failedChecks = data.reduce((sum, d) => sum + d.failedChecks, 0);
        
        const avgResponseTime = data.reduce((sum, d) => sum + d.averageResponseTime, 0) / data.length;
        const maxResponseTime = Math.max(...data.map(d => d.maxResponseTime));
        const minResponseTime = Math.min(...data.map(d => d.minResponseTime));
        
        return {
            period,
            startTime: data[0]?.timestamp,
            endTime: data[data.length - 1]?.timestamp,
            summary: {
                totalChecks,
                successfulChecks,
                failedChecks,
                successRate: (successfulChecks / totalChecks) * 100,
                averageResponseTime: parseFloat(avgResponseTime.toFixed(2)),
                maxResponseTime,
                minResponseTime
            },
            dataPoints: data.length,
            generatedAt: new Date().toISOString()
        };
    }

    startMetricsServer() {
        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            
            if (req.url === '/metrics') {
                this.serveMetrics(res);
            } else if (req.url === '/performance') {
                this.servePerformanceData(res);
            } else if (req.url === '/health') {
                this.serveHealthCheck(res);
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not Found' }));
            }
        });
        
        const port = process.env.METRICS_PORT || 3005;
        server.listen(port, () => {
            console.log(`📊 성능 메트릭 API 서버: http://localhost:${port}`);
            console.log(`  - /metrics: 현재 메트릭`);
            console.log(`  - /performance: 성능 데이터`);
            console.log(`  - /health: 헬스체크`);
        });
    }

    serveMetrics(res) {
        try {
            const metricsFile = `${this.logDir}/performance/current-metrics.json`;
            let metrics = this.stats;
            
            if (fs.existsSync(metricsFile)) {
                metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
            }
            
            res.writeHead(200);
            res.end(JSON.stringify(metrics, null, 2));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    servePerformanceData(res) {
        try {
            const limit = parseInt(req.url.split('limit=')[1]) || 50;
            const data = this.performanceData.slice(-limit);
            
            res.writeHead(200);
            res.end(JSON.stringify(data, null, 2));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    serveHealthCheck(res) {
        const health = {
            status: 'ok',
            uptime: this.calculateUptime(),
            lastCheck: this.performanceData[this.performanceData.length - 1]?.timestamp,
            dataPoints: this.performanceData.length
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(health, null, 2));
    }
}

// 성능 모니터 시작
const monitor = new PerformanceMonitor();
monitor.start();

process.on('SIGINT', () => {
    console.log('\n📊 성능 모니터링 종료 중...');
    process.exit(0);
});

module.exports = PerformanceMonitor;