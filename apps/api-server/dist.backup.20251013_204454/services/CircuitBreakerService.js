"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakerService = exports.CircuitBreakerService = exports.CircuitState = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const Alert_1 = require("../entities/Alert");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    constructor(id, serviceName, config) {
        this.id = id;
        this.serviceName = serviceName;
        this.config = config;
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.totalRequests = 0;
        this.stateChangeTime = new Date();
        this.requestWindow = [];
        this.halfOpenTests = 0;
    }
    async execute(operation) {
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                this.stateChangeTime = new Date();
                this.halfOpenTests = 0;
            }
            else {
                throw new Error(`Circuit breaker ${this.id} is OPEN - rejecting request`);
            }
        }
        const call = {
            circuitId: this.id,
            startTime: new Date(),
            success: false,
            responseTime: 0
        };
        try {
            const result = await this.executeWithTimeout(operation);
            call.endTime = new Date();
            call.responseTime = call.endTime.getTime() - call.startTime.getTime();
            call.success = true;
            this.onSuccess(call);
            return result;
        }
        catch (error) {
            call.endTime = new Date();
            call.responseTime = call.endTime.getTime() - call.startTime.getTime();
            call.error = error instanceof Error ? error.message : 'Unknown error';
            this.onFailure(call);
            throw error;
        }
        finally {
            this.recordCall(call);
        }
    }
    async executeWithTimeout(operation) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Operation timeout after ${this.config.slowCallThreshold}ms`));
            }, this.config.slowCallThreshold);
            operation()
                .then(result => {
                clearTimeout(timeout);
                resolve(result);
            })
                .catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    onSuccess(call) {
        this.successCount++;
        this.totalRequests++;
        this.lastSuccessTime = call.endTime;
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenTests++;
            if (this.halfOpenTests >= this.config.successThreshold) {
                this.reset();
            }
        }
    }
    onFailure(call) {
        this.failureCount++;
        this.totalRequests++;
        this.lastFailureTime = call.endTime;
        if (this.state === CircuitState.HALF_OPEN) {
            this.trip();
        }
        else if (this.shouldTrip()) {
            this.trip();
        }
    }
    shouldTrip() {
        if (this.totalRequests < this.config.requestVolumeThreshold) {
            return false;
        }
        const errorRate = (this.failureCount / this.totalRequests) * 100;
        const recentRequests = this.getRecentRequests();
        const slowCallRate = this.getSlowCallRate(recentRequests);
        return (this.failureCount >= this.config.failureThreshold ||
            errorRate >= this.config.errorThreshold ||
            slowCallRate >= this.config.slowCallRateThreshold);
    }
    shouldAttemptReset() {
        if (!this.lastFailureTime)
            return true;
        const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
        return timeSinceLastFailure >= this.config.recoveryTimeout;
    }
    trip() {
        this.state = CircuitState.OPEN;
        this.stateChangeTime = new Date();
        this.halfOpenTests = 0;
    }
    reset() {
        this.state = CircuitState.CLOSED;
        this.stateChangeTime = new Date();
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenTests = 0;
    }
    recordCall(call) {
        this.requestWindow.push(call);
        // Keep only recent requests (last 5 minutes)
        const cutoff = new Date(Date.now() - 5 * 60 * 1000);
        this.requestWindow = this.requestWindow.filter((req) => req.startTime >= cutoff);
    }
    getRecentRequests() {
        const cutoff = new Date(Date.now() - 60 * 1000); // Last minute
        return this.requestWindow.filter((req) => req.startTime >= cutoff);
    }
    getSlowCallRate(requests) {
        if (requests.length === 0)
            return 0;
        const slowCalls = requests.filter((req) => req.responseTime > this.config.slowCallThreshold);
        return (slowCalls.length / requests.length) * 100;
    }
    getStats() {
        const recentRequests = this.getRecentRequests();
        const errorRate = this.totalRequests > 0 ? (this.failureCount / this.totalRequests) * 100 : 0;
        const averageResponseTime = recentRequests.length > 0
            ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
            : 0;
        return {
            circuitId: this.id,
            serviceName: this.serviceName,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            totalRequests: this.totalRequests,
            errorRate,
            averageResponseTime,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            stateChangeTime: this.stateChangeTime,
            timeInCurrentState: Date.now() - this.stateChangeTime.getTime()
        };
    }
    reset_manual() {
        this.reset();
    }
    force_open() {
        this.trip();
    }
}
class CircuitBreakerService {
    constructor() {
        this.circuits = new Map();
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.defaultConfig = {
            failureThreshold: 5,
            recoveryTimeout: 60000, // 1 minute
            successThreshold: 3,
            requestVolumeThreshold: 10,
            errorThreshold: 50, // 50%
            slowCallThreshold: 5000, // 5 seconds
            slowCallRateThreshold: 50, // 50%
            maxRetries: 3
        };
    }
    async initialize() {
        // Initialize default circuits for critical services
        await this.createDefaultCircuits();
        // Start monitoring
        await this.startMonitoring();
    }
    async shutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.circuits.clear();
    }
    // Circuit management
    createCircuit(id, serviceName, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const circuit = new CircuitBreaker(id, serviceName, finalConfig);
        this.circuits.set(id, circuit);
        return circuit;
    }
    getCircuit(id) {
        return this.circuits.get(id);
    }
    getOrCreateCircuit(id, serviceName, config) {
        let circuit = this.circuits.get(id);
        if (!circuit) {
            circuit = this.createCircuit(id, serviceName, config);
        }
        return circuit;
    }
    removeCircuit(id) {
        const removed = this.circuits.delete(id);
        return removed;
    }
    // Execution wrappers
    async executeWithCircuitBreaker(circuitId, serviceName, operation, config) {
        const circuit = this.getOrCreateCircuit(circuitId, serviceName, config);
        return await circuit.execute(operation);
    }
    async executeDatabaseOperation(operation) {
        return await this.executeWithCircuitBreaker('database-operations', 'PostgreSQL Database', operation, {
            failureThreshold: 3,
            recoveryTimeout: 30000,
            slowCallThreshold: 3000,
            errorThreshold: 30
        });
    }
    async executeExternalApiCall(apiName, operation) {
        return await this.executeWithCircuitBreaker(`external-api-${apiName}`, `External API: ${apiName}`, operation, {
            failureThreshold: 5,
            recoveryTimeout: 60000,
            slowCallThreshold: 10000,
            errorThreshold: 60
        });
    }
    async executeInternalService(serviceName, operation) {
        return await this.executeWithCircuitBreaker(`internal-service-${serviceName}`, `Internal Service: ${serviceName}`, operation, {
            failureThreshold: 4,
            recoveryTimeout: 45000,
            slowCallThreshold: 5000,
            errorThreshold: 40
        });
    }
    // Monitoring and metrics
    async startMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.collectCircuitMetrics();
                await this.checkCircuitHealth();
                await this.cleanupOldData();
            }
            catch (error) {
                // Error log removed
            }
        }, 30000); // Every 30 seconds
    }
    async collectCircuitMetrics() {
        for (const circuit of this.circuits.values()) {
            const stats = circuit.getStats();
            // Record circuit state
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CIRCUIT_BREAKER_STATE, `Circuit Breaker State: ${stats.serviceName}`, stats.state === CircuitState.CLOSED ? 0 : stats.state === CircuitState.OPEN ? 1 : 0.5, 'state', stats.serviceName, {
                circuitId: stats.circuitId,
                state: stats.state,
                errorRate: stats.errorRate,
                responseTime: stats.averageResponseTime
            }));
            // Record error rate
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.ERROR_RATE, `Circuit Error Rate: ${stats.serviceName}`, stats.errorRate, '%', stats.serviceName, {
                circuitId: stats.circuitId,
                totalRequests: stats.totalRequests,
                failureCount: stats.failureCount
            }));
            // Record response time
            if (stats.averageResponseTime > 0) {
                await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createPerformanceMetric(SystemMetrics_1.MetricCategory.RESPONSE_TIME, `Circuit Response Time: ${stats.serviceName}`, stats.averageResponseTime, 'ms', stats.serviceName, 'circuit-breaker', {
                    circuitId: stats.circuitId,
                    state: stats.state
                }));
            }
        }
    }
    async checkCircuitHealth() {
        for (const circuit of this.circuits.values()) {
            const stats = circuit.getStats();
            // Alert on circuit open
            if (stats.state === CircuitState.OPEN) {
                await this.createCircuitAlert('Circuit Breaker Open', `Circuit breaker for ${stats.serviceName} is OPEN due to repeated failures`, Alert_1.AlertSeverity.HIGH, stats);
            }
            // Alert on high error rate
            if (stats.errorRate > 75 && stats.totalRequests > 10) {
                await this.createCircuitAlert('High Error Rate', `Circuit breaker for ${stats.serviceName} showing ${stats.errorRate.toFixed(1)}% error rate`, Alert_1.AlertSeverity.HIGH, stats);
            }
            // Alert on slow response times
            if (stats.averageResponseTime > 10000) {
                await this.createCircuitAlert('Slow Response Time', `Circuit breaker for ${stats.serviceName} showing average response time of ${stats.averageResponseTime}ms`, Alert_1.AlertSeverity.MEDIUM, stats);
            }
        }
    }
    async createCircuitAlert(title, message, severity, stats) {
        // Check if similar alert already exists
        const existingAlert = await this.alertRepo.findOne({
            where: {
                alertType: Alert_1.AlertType.CIRCUIT_BREAKER,
                source: stats.serviceName,
                status: (0, typeorm_1.Not)(Alert_1.AlertStatus.RESOLVED)
            }
        });
        if (existingAlert) {
            // Update existing alert
            existingAlert.recordOccurrence();
            existingAlert.lastOccurrence = new Date();
            existingAlert.metadata = { ...existingAlert.metadata, ...stats };
            await this.alertRepo.save(existingAlert);
        }
        else {
            // Create new alert
            const alert = Alert_1.Alert.createSystemAlert(title, message, severity, stats.serviceName, JSON.stringify({
                circuitId: stats.circuitId,
                circuitState: stats.state,
                errorRate: stats.errorRate,
                responseTime: stats.averageResponseTime,
                timestamp: new Date().toISOString()
            }));
            alert.alertType = Alert_1.AlertType.CIRCUIT_BREAKER;
            await this.alertRepo.save(alert);
        }
    }
    async cleanupOldData() {
        // Could implement cleanup of old circuit data if needed
    }
    async createDefaultCircuits() {
        // Database circuit
        this.createCircuit('database-main', 'PostgreSQL Database', {
            failureThreshold: 3,
            recoveryTimeout: 30000,
            successThreshold: 2,
            slowCallThreshold: 3000,
            errorThreshold: 30
        });
        // External API circuits
        this.createCircuit('external-api-google', 'Google APIs', {
            failureThreshold: 5,
            recoveryTimeout: 60000,
            slowCallThreshold: 10000,
            errorThreshold: 60
        });
        // Internal service circuits
        this.createCircuit('cache-service', 'Cache Service', {
            failureThreshold: 3,
            recoveryTimeout: 15000,
            slowCallThreshold: 2000,
            errorThreshold: 50
        });
        this.createCircuit('file-storage', 'File Storage Service', {
            failureThreshold: 4,
            recoveryTimeout: 45000,
            slowCallThreshold: 5000,
            errorThreshold: 40
        });
    }
    // Management API
    getAllCircuits() {
        return Array.from(this.circuits.values()).map((circuit) => circuit.getStats());
    }
    getCircuitStats(circuitId) {
        const circuit = this.circuits.get(circuitId);
        return circuit ? circuit.getStats() : null;
    }
    async resetCircuit(circuitId) {
        const circuit = this.circuits.get(circuitId);
        if (circuit) {
            circuit.reset_manual();
            // Record manual reset
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CIRCUIT_BREAKER_RESET, `Circuit Breaker Manual Reset`, 1, 'event', circuit.serviceName, {
                circuitId,
                resetTime: new Date().toISOString(),
                resetType: 'manual'
            }));
            return true;
        }
        return false;
    }
    async resetAllCircuits() {
        let resetCount = 0;
        for (const [circuitId, circuit] of this.circuits) {
            circuit.reset_manual();
            resetCount++;
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CIRCUIT_BREAKER_RESET, `Circuit Breaker Bulk Reset`, 1, 'event', circuit.serviceName, {
                circuitId,
                resetTime: new Date().toISOString(),
                resetType: 'bulk'
            }));
        }
        return resetCount;
    }
    async forceOpenCircuit(circuitId) {
        const circuit = this.circuits.get(circuitId);
        if (circuit) {
            circuit.force_open();
            await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CIRCUIT_BREAKER_MANUAL_OPEN, `Circuit Breaker Manual Open`, 1, 'event', circuit.serviceName, {
                circuitId,
                openTime: new Date().toISOString(),
                reason: 'manual'
            }));
            return true;
        }
        return false;
    }
    // Health check for the circuit breaker service itself
    async getStatus() {
        const circuits = this.getAllCircuits();
        const openCircuits = circuits.filter((c) => c.state === CircuitState.OPEN).length;
        const halfOpenCircuits = circuits.filter((c) => c.state === CircuitState.HALF_OPEN).length;
        const issues = [];
        // Check for issues
        if (openCircuits > circuits.length * 0.5) {
            issues.push(`More than 50% of circuits are open (${openCircuits}/${circuits.length})`);
        }
        if (circuits.some((c) => c.errorRate > 90)) {
            issues.push('Some circuits showing very high error rates');
        }
        let status = 'healthy';
        if (issues.length > 0) {
            status = openCircuits > circuits.length * 0.3 ? 'unhealthy' : 'degraded';
        }
        return {
            status,
            circuitCount: circuits.length,
            openCircuits,
            halfOpenCircuits,
            issues
        };
    }
    // Utility methods for common patterns
    async withFallback(circuitId, serviceName, primaryOperation, fallbackOperation) {
        try {
            return await this.executeWithCircuitBreaker(circuitId, serviceName, primaryOperation);
        }
        catch (error) {
            return await fallbackOperation();
        }
    }
    async withRetry(circuitId, serviceName, operation, maxRetries = 3, backoffMs = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.executeWithCircuitBreaker(circuitId, serviceName, operation);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
                }
            }
        }
        throw lastError;
    }
}
exports.CircuitBreakerService = CircuitBreakerService;
exports.circuitBreakerService = new CircuitBreakerService();
//# sourceMappingURL=CircuitBreakerService.js.map