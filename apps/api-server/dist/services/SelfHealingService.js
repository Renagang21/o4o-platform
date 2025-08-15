"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfHealingService = exports.SelfHealingService = void 0;
const connection_1 = require("../database/connection");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const Alert_1 = require("../entities/Alert");
const CacheService_1 = require("./CacheService");
const child_process_1 = require("child_process");
const util_1 = require("util");
const os = __importStar(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SelfHealingService {
    constructor() {
        this.healingActions = new Map();
        this.activeAttempts = new Map();
        this.healingHistory = [];
        this.isEnabled = true;
        this.maxConcurrentHealing = 3;
        // Service tracking
        this.serviceStates = new Map();
        this.lastHealthCheck = null;
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
    }
    async initialize() {
        await this.initializeHealingActions();
        await this.startHealthMonitoring();
        await this.initializeServiceTracking();
    }
    async shutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
    // Service restart functionality
    async restartService(serviceName, parameters) {
        const action = this.healingActions.get('restart-service') || await this.createServiceRestartAction(serviceName, parameters);
        return await this.executeHealingAction(action, { serviceName, ...parameters });
    }
    async createServiceRestartAction(serviceName, parameters) {
        return {
            id: `restart-${serviceName}`,
            name: `Restart ${serviceName}`,
            description: `Restart the ${serviceName} service`,
            target: serviceName,
            type: 'service_restart',
            parameters: {
                graceful: (parameters === null || parameters === void 0 ? void 0 : parameters.graceful) !== false,
                timeout: (parameters === null || parameters === void 0 ? void 0 : parameters.timeout) || 30,
                verifyRestart: true,
                ...parameters
            },
            safetyChecks: [
                {
                    type: 'pre_execution',
                    name: 'Service Status Check',
                    condition: 'service_exists',
                    failureAction: 'abort'
                },
                {
                    type: 'post_execution',
                    name: 'Service Running Check',
                    condition: 'service_running',
                    failureAction: 'rollback'
                }
            ],
            maxRetries: 3,
            timeout: (parameters === null || parameters === void 0 ? void 0 : parameters.timeout) || 60,
            cooldownPeriod: 5,
            requiredPermissions: ['service_control']
        };
    }
    // Cache clearing functionality
    async clearCache(target, parameters) {
        let output = '';
        const cacheTypes = (parameters === null || parameters === void 0 ? void 0 : parameters.cacheTypes) || ['memory', 'redis', 'temp'];
        for (const cacheType of cacheTypes) {
            try {
                switch (cacheType) {
                    case 'memory':
                        await this.clearMemoryCache();
                        output += 'Memory cache cleared. ';
                        break;
                    case 'redis':
                        await this.clearRedisCache(parameters);
                        output += 'Redis cache cleared. ';
                        break;
                    case 'temp':
                        await this.clearTempFiles();
                        output += 'Temporary files cleared. ';
                        break;
                    case 'app':
                        await this.clearApplicationCache();
                        output += 'Application cache cleared. ';
                        break;
                }
            }
            catch (error) {
                output += `Failed to clear ${cacheType} cache: ${error instanceof Error ? error.message : 'Unknown error'}. `;
            }
        }
        return { output: output.trim() };
    }
    async clearMemoryCache() {
        // Clear Node.js process cache and force garbage collection
        if (global.gc) {
            global.gc();
        }
        // Clear any in-memory caches
        await CacheService_1.cacheService.clear();
    }
    async clearRedisCache(parameters) {
        try {
            // Implementation would use actual Redis client
            const pattern = (parameters === null || parameters === void 0 ? void 0 : parameters.pattern) || '*';
            // Simulate Redis cache clear
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        catch (error) {
            console.error('Failed to clear Redis cache:', error);
            throw error;
        }
    }
    async clearTempFiles() {
        const tempDirs = ['/tmp', os.tmpdir()];
        for (const tempDir of tempDirs) {
            try {
                await execAsync(`find ${tempDir} -type f -name "*.tmp" -mtime +1 -delete 2>/dev/null || true`);
                await execAsync(`find ${tempDir} -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true`);
            }
            catch (error) {
                console.warn(`Failed to clear temp files in ${tempDir}:`, error);
            }
        }
    }
    async clearApplicationCache() {
        // Clear application-specific caches
        await CacheService_1.cacheService.clear();
    }
    // Connection reset functionality
    async resetConnections(target, parameters) {
        let output = '';
        try {
            switch (target) {
                case 'database':
                    output = await this.resetDatabaseConnections(parameters);
                    break;
                case 'redis':
                    output = await this.resetRedisConnections(parameters);
                    break;
                case 'all':
                    const dbOutput = await this.resetDatabaseConnections(parameters);
                    const redisOutput = await this.resetRedisConnections(parameters);
                    output = `${dbOutput} ${redisOutput}`;
                    break;
                default:
                    throw new Error(`Unknown connection target: ${target}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to reset ${target} connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return { output };
    }
    async resetDatabaseConnections(parameters) {
        const maxConnections = (parameters === null || parameters === void 0 ? void 0 : parameters.maxConnections) || 20;
        try {
            // Check current connection count
            const currentConnections = await connection_1.AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
            const connectionCount = parseInt(currentConnections[0].count);
            if (connectionCount > maxConnections) {
                // Kill idle connections
                await connection_1.AppDataSource.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE state = 'idle'
          AND state_change < now() - interval '10 minutes'
        `);
                return `Reset database connections. Was: ${connectionCount}, limit: ${maxConnections}`;
            }
            return `Database connections healthy: ${connectionCount}/${maxConnections}`;
        }
        catch (error) {
            throw new Error(`Database connection reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async resetRedisConnections(parameters) {
        // Implementation would reset Redis connections
        return 'Redis connections reset';
    }
    // Resource scaling functionality
    async scaleResources(target, parameters) {
        const action = (parameters === null || parameters === void 0 ? void 0 : parameters.action) || 'scale_up';
        const factor = (parameters === null || parameters === void 0 ? void 0 : parameters.factor) || 1.5;
        let output = '';
        try {
            switch (target) {
                case 'api-server':
                    output = await this.scaleApiServer(action, factor);
                    break;
                case 'memory':
                    output = await this.optimizeMemoryUsage();
                    break;
                case 'connections':
                    output = await this.scaleConnectionPools(action, factor);
                    break;
                default:
                    throw new Error(`Unknown scaling target: ${target}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to scale ${target}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return { output };
    }
    async scaleApiServer(action, factor) {
        // In a real implementation, this would scale the API server instances
        if (action === 'scale_up') {
            // Increase worker processes, connection limits, etc.
            return `API server scaled up by factor ${factor}`;
        }
        else {
            // Scale down resources
            return `API server scaled down by factor ${factor}`;
        }
    }
    async optimizeMemoryUsage() {
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
        // Clear caches
        await this.clearMemoryCache();
        const memoryAfter = process.memoryUsage();
        return `Memory optimized. RSS: ${Math.round(memoryAfter.rss / 1024 / 1024)}MB`;
    }
    async scaleConnectionPools(action, factor) {
        // In a real implementation, this would adjust connection pool sizes
        return `Connection pools scaled ${action} by factor ${factor}`;
    }
    // Service status checking
    async checkServiceStatus(serviceName) {
        try {
            switch (serviceName) {
                case 'postgresql':
                case 'database':
                    await connection_1.AppDataSource.query('SELECT 1');
                    return 'running';
                case 'api-server':
                    // Check if the current process is healthy
                    const uptime = process.uptime();
                    return uptime > 0 ? 'running' : 'stopped';
                default:
                    // Generic service check using systemctl or ps
                    try {
                        const { stdout } = await execAsync(`pgrep -f ${serviceName}`);
                        return stdout.trim() ? 'running' : 'stopped';
                    }
                    catch (_a) {
                        return 'stopped';
                    }
            }
        }
        catch (error) {
            console.error(`Service status check failed for ${serviceName}:`, error);
            return 'error';
        }
    }
    // System health monitoring
    async startHealthMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
                await this.detectAndHealIssues();
                await this.updateHealthMetrics();
            }
            catch (error) {
                console.error('Self-healing health monitoring failed:', error);
            }
        }, 60000); // Every minute
    }
    async performHealthCheck() {
        const health = {
            memory: await this.getMemoryInfo(),
            cpu: await this.getCpuInfo(),
            disk: await this.getDiskInfo(),
            services: await this.getServiceInfo(),
            connections: await this.getConnectionInfo(),
            issues: []
        };
        // Detect issues
        health.issues = await this.detectSystemIssues(health);
        this.lastHealthCheck = new Date();
        // Record health metrics
        await this.recordHealthMetrics(health);
        return health;
    }
    async getMemoryInfo() {
        const memInfo = process.memoryUsage();
        const systemMem = {
            total: os.totalmem(),
            free: os.freemem()
        };
        return {
            total: systemMem.total,
            used: systemMem.total - systemMem.free,
            free: systemMem.free,
            percentage: ((systemMem.total - systemMem.free) / systemMem.total) * 100,
            swapUsed: 0 // Would get from /proc/meminfo on Linux
        };
    }
    async getCpuInfo() {
        const loadAvg = os.loadavg();
        return {
            loadAverage: loadAvg,
            usage: loadAvg[0] / os.cpus().length * 100,
            processes: 0 // Would get from ps or /proc
        };
    }
    async getDiskInfo() {
        try {
            const { stdout } = await execAsync("df -B1 / | tail -1");
            const parts = stdout.trim().split(/\s+/);
            const total = parseInt(parts[1]);
            const used = parseInt(parts[2]);
            const free = parseInt(parts[3]);
            return {
                total,
                used,
                free,
                percentage: (used / total) * 100
            };
        }
        catch (error) {
            return { total: 0, used: 0, free: 0, percentage: 0 };
        }
    }
    async getServiceInfo() {
        const services = {};
        const criticalServices = ['postgresql', 'api-server', 'redis'];
        for (const service of criticalServices) {
            const status = await this.checkServiceStatus(service);
            const state = this.serviceStates.get(service) || { restartCount: 0, lastRestart: null };
            services[service] = {
                status: status,
                restartCount: state.restartCount || 0,
                lastRestart: state.lastRestart
            };
        }
        return services;
    }
    async getConnectionInfo() {
        const connections = {
            database: 0,
            redis: 0,
            http: 0
        };
        try {
            const dbResult = await connection_1.AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
            connections.database = parseInt(dbResult[0].count);
        }
        catch (error) {
            console.warn('Failed to get database connection count:', error);
        }
        return connections;
    }
    async detectSystemIssues(health) {
        const issues = [];
        // Memory issues
        if (health.memory.percentage > 90) {
            issues.push({
                type: 'memory_leak',
                severity: 'critical',
                description: `Memory usage is critically high: ${health.memory.percentage.toFixed(1)}%`,
                affectedComponent: 'system',
                detectedAt: new Date(),
                suggestedActions: ['clear_cache', 'restart_service', 'garbage_collect'],
                autoHealable: true
            });
        }
        else if (health.memory.percentage > 80) {
            issues.push({
                type: 'memory_leak',
                severity: 'high',
                description: `Memory usage is high: ${health.memory.percentage.toFixed(1)}%`,
                affectedComponent: 'system',
                detectedAt: new Date(),
                suggestedActions: ['clear_cache', 'garbage_collect'],
                autoHealable: true
            });
        }
        // CPU issues
        if (health.cpu.usage > 90) {
            issues.push({
                type: 'high_cpu',
                severity: 'critical',
                description: `CPU usage is critically high: ${health.cpu.usage.toFixed(1)}%`,
                affectedComponent: 'system',
                detectedAt: new Date(),
                suggestedActions: ['scale_resources', 'optimize_processes'],
                autoHealable: true
            });
        }
        // Disk issues
        if (health.disk.percentage > 95) {
            issues.push({
                type: 'disk_full',
                severity: 'critical',
                description: `Disk usage is critically high: ${health.disk.percentage.toFixed(1)}%`,
                affectedComponent: 'filesystem',
                detectedAt: new Date(),
                suggestedActions: ['cleanup_logs', 'cleanup_temp', 'cleanup_cache'],
                autoHealable: true
            });
        }
        // Service issues
        for (const [serviceName, serviceInfo] of Object.entries(health.services)) {
            if (serviceInfo.status !== 'running') {
                issues.push({
                    type: 'service_down',
                    severity: 'high',
                    description: `Service ${serviceName} is ${serviceInfo.status}`,
                    affectedComponent: serviceName,
                    detectedAt: new Date(),
                    suggestedActions: ['restart_service'],
                    autoHealable: true
                });
            }
        }
        // Connection issues
        if (health.connections.database > 80) {
            issues.push({
                type: 'connection_leak',
                severity: 'medium',
                description: `High database connection count: ${health.connections.database}`,
                affectedComponent: 'database',
                detectedAt: new Date(),
                suggestedActions: ['reset_connections'],
                autoHealable: true
            });
        }
        return issues;
    }
    async detectAndHealIssues() {
        if (!this.isEnabled)
            return;
        const health = await this.performHealthCheck();
        const autoHealableIssues = health.issues.filter((issue) => issue.autoHealable);
        for (const issue of autoHealableIssues) {
            if (this.activeAttempts.size >= this.maxConcurrentHealing) {
                continue;
            }
            await this.healIssue(issue);
        }
    }
    async healIssue(issue) {
        const suggestedAction = issue.suggestedActions[0];
        try {
            switch (suggestedAction) {
                case 'clear_cache':
                    await this.clearCache('all', { cacheTypes: ['memory', 'temp'] });
                    break;
                case 'restart_service':
                    await this.restartService(issue.affectedComponent);
                    break;
                case 'reset_connections':
                    await this.resetConnections(issue.affectedComponent);
                    break;
                case 'scale_resources':
                    await this.scaleResources('memory');
                    break;
                case 'cleanup_logs':
                    await this.cleanupLogs();
                    break;
                case 'cleanup_temp':
                    await this.clearTempFiles();
                    break;
                case 'garbage_collect':
                    await this.optimizeMemoryUsage();
                    break;
                default:
                    console.warn(`Unknown healing action: ${suggestedAction}`);
            }
        }
        catch (error) {
            console.error(`❌ Auto-healing failed for ${issue.type}:`, error);
        }
    }
    async cleanupLogs() {
        const logDirs = ['/var/log', './logs'];
        for (const logDir of logDirs) {
            try {
                // Remove logs older than 7 days
                await execAsync(`find ${logDir} -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true`);
                // Compress logs older than 1 day
                await execAsync(`find ${logDir} -type f -name "*.log" -mtime +1 -exec gzip {} \\; 2>/dev/null || true`);
            }
            catch (error) {
                console.warn(`Failed to cleanup logs in ${logDir}:`, error);
            }
        }
    }
    // Healing action execution
    async executeHealingAction(action, context) {
        const attemptId = `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const attempt = {
            id: attemptId,
            actionId: action.id,
            startTime: new Date(),
            status: 'in_progress',
            target: action.target,
            safetyCheckResults: [],
            executionLog: [],
            rollbackPerformed: false,
            metadata: context
        };
        this.activeAttempts.set(attemptId, attempt);
        try {
            // Pre-execution safety checks
            const preChecks = action.safetyChecks.filter((check) => check.type === 'pre_execution');
            for (const check of preChecks) {
                const result = await this.performSafetyCheck(check, context);
                attempt.safetyCheckResults.push(result);
                if (!result.passed && check.failureAction === 'abort') {
                    attempt.status = 'aborted';
                    throw new Error(`Safety check failed: ${check.name}`);
                }
            }
            // Execute the main action
            const output = await this.performHealingAction(action, context, attempt);
            // Post-execution safety checks
            const postChecks = action.safetyChecks.filter((check) => check.type === 'post_execution');
            for (const check of postChecks) {
                const result = await this.performSafetyCheck(check, context);
                attempt.safetyCheckResults.push(result);
                if (!result.passed && check.failureAction === 'rollback') {
                    await this.performRollback(action, attempt);
                    break;
                }
            }
            attempt.status = 'success';
            attempt.endTime = new Date();
            return { output };
        }
        catch (error) {
            attempt.status = 'failed';
            attempt.endTime = new Date();
            attempt.executionLog.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
        finally {
            this.activeAttempts.delete(attemptId);
            this.healingHistory.push(attempt);
            // Keep only last 100 attempts
            if (this.healingHistory.length > 100) {
                this.healingHistory = this.healingHistory.slice(-100);
            }
        }
    }
    async performSafetyCheck(check, context) {
        try {
            let passed = false;
            let output = '';
            switch (check.condition) {
                case 'service_exists':
                    passed = await this.checkServiceExists(context.serviceName);
                    output = `Service ${context.serviceName} ${passed ? 'exists' : 'does not exist'}`;
                    break;
                case 'service_running':
                    const status = await this.checkServiceStatus(context.serviceName);
                    passed = status === 'running';
                    output = `Service ${context.serviceName} status: ${status}`;
                    break;
                case 'disk_space_available':
                    const diskInfo = await this.getDiskInfo();
                    passed = diskInfo.percentage < 95;
                    output = `Disk usage: ${diskInfo.percentage.toFixed(1)}%`;
                    break;
                default:
                    if (check.command) {
                        const { stdout, stderr } = await execAsync(check.command);
                        passed = !stderr && stdout.trim().length > 0;
                        output = stdout || stderr;
                    }
                    else {
                        passed = true;
                        output = 'No specific check implemented';
                    }
            }
            return { check, passed, output };
        }
        catch (error) {
            return {
                check,
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async checkServiceExists(serviceName) {
        try {
            const { stdout } = await execAsync(`which ${serviceName} || command -v ${serviceName}`);
            return stdout.trim().length > 0;
        }
        catch (_a) {
            return false;
        }
    }
    async performHealingAction(action, context, attempt) {
        attempt.executionLog.push(`Starting ${action.type} on ${action.target}`);
        switch (action.type) {
            case 'service_restart':
                return await this.executeServiceRestart(context.serviceName, action.parameters, attempt);
            case 'cache_clear':
                const result = await this.clearCache(action.target, action.parameters);
                return result.output;
            case 'connection_reset':
                const resetResult = await this.resetConnections(action.target, action.parameters);
                return resetResult.output;
            case 'memory_cleanup':
                return await this.optimizeMemoryUsage();
            case 'disk_cleanup':
                await this.cleanupLogs();
                await this.clearTempFiles();
                return 'Disk cleanup completed';
            default:
                throw new Error(`Unknown healing action type: ${action.type}`);
        }
    }
    async executeServiceRestart(serviceName, parameters, attempt) {
        const graceful = parameters.graceful !== false;
        const timeout = parameters.timeout || 30;
        attempt.executionLog.push(`Restarting ${serviceName} (graceful: ${graceful})`);
        // Track restart
        const state = this.serviceStates.get(serviceName) || { restartCount: 0, lastRestart: null };
        state.restartCount = (state.restartCount || 0) + 1;
        state.lastRestart = new Date();
        this.serviceStates.set(serviceName, state);
        switch (serviceName) {
            case 'api-server':
                // In a real implementation, this would restart the API server
                attempt.executionLog.push('API server restart initiated');
                return 'API server restart completed';
            case 'postgresql':
                // In a real implementation, this would restart PostgreSQL
                attempt.executionLog.push('PostgreSQL restart initiated');
                return 'PostgreSQL restart completed';
            default:
                try {
                    const { stdout, stderr } = await execAsync(`systemctl restart ${serviceName}`);
                    attempt.executionLog.push(`systemctl restart output: ${stdout || stderr}`);
                    return `Service ${serviceName} restarted successfully`;
                }
                catch (error) {
                    throw new Error(`Failed to restart ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
        }
    }
    async performRollback(action, attempt) {
        if (!action.rollbackActions)
            return;
        attempt.executionLog.push('Performing rollback...');
        attempt.rollbackPerformed = true;
        for (const rollbackAction of action.rollbackActions) {
            try {
                await this.performHealingAction(rollbackAction, attempt.metadata, attempt);
                attempt.executionLog.push(`Rollback action completed: ${rollbackAction.type}`);
            }
            catch (error) {
                attempt.executionLog.push(`Rollback action failed: ${rollbackAction.type} - ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    // Initialization and configuration
    async initializeHealingActions() {
        const actions = [
            {
                id: 'memory-cleanup',
                name: 'Memory Cleanup',
                description: 'Clear memory caches and force garbage collection',
                target: 'memory',
                type: 'memory_cleanup',
                parameters: {},
                safetyChecks: [
                    {
                        type: 'pre_execution',
                        name: 'Memory Usage Check',
                        condition: 'memory_threshold',
                        failureAction: 'warn'
                    }
                ],
                maxRetries: 2,
                timeout: 30,
                cooldownPeriod: 5,
                requiredPermissions: ['memory_management']
            },
            {
                id: 'cache-clear-all',
                name: 'Clear All Caches',
                description: 'Clear all application and system caches',
                target: 'all',
                type: 'cache_clear',
                parameters: { cacheTypes: ['memory', 'redis', 'temp', 'app'] },
                safetyChecks: [],
                maxRetries: 3,
                timeout: 60,
                cooldownPeriod: 10,
                requiredPermissions: ['cache_management']
            }
        ];
        actions.forEach((action) => {
            this.healingActions.set(action.id, action);
        });
    }
    async initializeServiceTracking() {
        const services = ['api-server', 'postgresql', 'redis'];
        for (const service of services) {
            this.serviceStates.set(service, {
                restartCount: 0,
                lastRestart: null
            });
        }
    }
    // Metrics and monitoring
    async recordHealthMetrics(health) {
        // Memory metrics
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.MEMORY_USAGE, 'System Memory Usage', health.memory.percentage, '%', 'self-healing', { timestamp: new Date().toISOString() }));
        // CPU metrics
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CPU_USAGE, 'System CPU Usage', health.cpu.usage, '%', 'self-healing', { timestamp: new Date().toISOString() }));
        // Disk metrics
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.STORAGE_USAGE, 'System Disk Usage', health.disk.percentage, '%', 'self-healing', { timestamp: new Date().toISOString() }));
        // Issues count
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.SYSTEM_ISSUES, 'System Issues Detected', health.issues.length, 'count', 'self-healing', {
            issueTypes: health.issues.map((i) => i.type),
            timestamp: new Date().toISOString()
        }));
    }
    // Public API methods
    async getStatus() {
        const systemHealth = this.lastHealthCheck ? await this.performHealthCheck() : undefined;
        const issues = [];
        if (systemHealth) {
            if (systemHealth.issues.length > 0) {
                issues.push(`${systemHealth.issues.length} system issues detected`);
            }
            if (systemHealth.memory.percentage > 90) {
                issues.push('Critical memory usage');
            }
            if (systemHealth.disk.percentage > 95) {
                issues.push('Critical disk usage');
            }
        }
        if (this.activeAttempts.size > this.maxConcurrentHealing) {
            issues.push('Too many concurrent healing attempts');
        }
        let status = 'healthy';
        if (systemHealth === null || systemHealth === void 0 ? void 0 : systemHealth.issues.some((i) => i.severity === 'critical')) {
            status = 'unhealthy';
        }
        else if (issues.length > 0) {
            status = 'degraded';
        }
        return {
            status,
            lastHealthCheck: this.lastHealthCheck || undefined,
            activeAttempts: this.activeAttempts.size,
            healingActions: this.healingActions.size,
            systemHealth,
            issues
        };
    }
    async getSystemHealth() {
        return this.lastHealthCheck ? await this.performHealthCheck() : null;
    }
    async getHealingHistory(limit = 50) {
        return this.healingHistory
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, limit);
    }
    async getActiveAttempts() {
        return Array.from(this.activeAttempts.values());
    }
    async enable() {
        this.isEnabled = true;
    }
    async disable() {
        this.isEnabled = false;
    }
    async forceHealing(issueType, component) {
        const issue = {
            type: issueType,
            severity: 'high',
            description: `Manual healing request for ${component}`,
            affectedComponent: component,
            detectedAt: new Date(),
            suggestedActions: ['restart_service', 'clear_cache'],
            autoHealable: true
        };
        await this.healIssue(issue);
        return { output: `Manual healing initiated for ${component}` };
    }
    async updateHealthMetrics() {
        if (!this.lastHealthCheck)
            return;
        const health = await this.performHealthCheck();
        // Record health metrics to database
        await Promise.all([
            // Memory metrics
            this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.MEMORY_USAGE, 'System Memory Usage', health.memory.percentage, '%', 'self-healing', { used: health.memory.used, total: health.memory.total })),
            // CPU metrics
            this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.CPU_USAGE, 'System CPU Usage', health.cpu.usage, '%', 'self-healing', { loadAverage: health.cpu.loadAverage })),
            // Disk metrics
            this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.STORAGE_USAGE, 'System Disk Usage', health.disk.percentage, '%', 'self-healing', { used: health.disk.used, free: health.disk.free })),
            // Issues count
            this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.SYSTEM_ISSUES, 'System Issues Detected', health.issues.length, 'count', 'self-healing', { issueTypes: health.issues.map((i) => i.type) }))
        ]);
    }
}
exports.SelfHealingService = SelfHealingService;
exports.selfHealingService = new SelfHealingService();
//# sourceMappingURL=SelfHealingService.js.map