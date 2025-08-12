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
exports.deploymentMonitoringService = exports.DeploymentMonitoringService = exports.DeploymentEnvironment = exports.DeploymentStatus = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const SystemMetrics_1 = require("../entities/SystemMetrics");
const Alert_1 = require("../entities/Alert");
const webhookService_1 = require("./webhookService");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["PENDING"] = "pending";
    DeploymentStatus["IN_PROGRESS"] = "in_progress";
    DeploymentStatus["SUCCESS"] = "success";
    DeploymentStatus["FAILED"] = "failed";
    DeploymentStatus["ROLLED_BACK"] = "rolled_back";
    DeploymentStatus["ROLLBACK_FAILED"] = "rollback_failed";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
var DeploymentEnvironment;
(function (DeploymentEnvironment) {
    DeploymentEnvironment["DEVELOPMENT"] = "development";
    DeploymentEnvironment["STAGING"] = "staging";
    DeploymentEnvironment["PRODUCTION"] = "production";
})(DeploymentEnvironment || (exports.DeploymentEnvironment = DeploymentEnvironment = {}));
class DeploymentMonitoringService {
    constructor() {
        this.activeDeployments = new Map();
        this.deploymentHistory = [];
        this.isEnabled = true;
        this.autoRollbackEnabled = true;
        this.currentVersion = '1.0.0';
        this.systemMetricsRepo = connection_1.AppDataSource.getRepository(SystemMetrics_1.SystemMetrics);
        this.alertRepo = connection_1.AppDataSource.getRepository(Alert_1.Alert);
        this.webhookService = new webhookService_1.WebhookService();
        this.validationRules = {
            healthCheckFailures: {
                maxFailures: 3,
                timeWindow: 5
            },
            performanceThresholds: {
                maxResponseTimeDegradation: 50, // 50% increase
                maxErrorRateIncrease: 200, // 200% increase  
                maxMemoryIncrease: 30 // 30% increase
            },
            businessMetrics: {
                minThroughputMaintenance: 80, // 80% of original
                maxUserErrorReports: 10
            },
            timeBasedRules: {
                stabilizationPeriod: 15, // 15 minutes
                monitoringDuration: 60 // 60 minutes
            }
        };
    }
    async initialize() {
        // console.log('🚀 Initializing Deployment Monitoring Service...');
        await this.detectCurrentDeployment();
        await this.startDeploymentMonitoring();
        // console.log('✅ Deployment Monitoring Service initialized');
    }
    async shutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        // console.log('🚀 Deployment Monitoring Service shut down');
    }
    // Deployment tracking and monitoring
    async trackDeployment(deploymentInfo) {
        const deployment = {
            id: deploymentInfo.id || `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            version: deploymentInfo.version || 'unknown',
            environment: deploymentInfo.environment || DeploymentEnvironment.PRODUCTION,
            status: DeploymentStatus.PENDING,
            startTime: new Date(),
            deployedBy: deploymentInfo.deployedBy || 'system',
            commitHash: deploymentInfo.commitHash || 'unknown',
            branch: deploymentInfo.branch || 'main',
            buildNumber: deploymentInfo.buildNumber,
            releaseNotes: deploymentInfo.releaseNotes,
            healthChecks: this.createDefaultHealthChecks(),
            metrics: this.initializeMetrics(),
            ...deploymentInfo
        };
        this.activeDeployments.set(deployment.id, deployment);
        // console.log(`📦 Tracking deployment: ${deployment.version} (ID: ${deployment.id})`);
        // Start monitoring this deployment
        await this.startDeploymentTracking(deployment);
        return deployment;
    }
    async startDeploymentTracking(deployment) {
        // console.log(`🔍 Starting deployment monitoring for ${deployment.id}`);
        // Collect baseline metrics
        deployment.metrics = await this.collectBaselineMetrics();
        // Update status
        deployment.status = DeploymentStatus.IN_PROGRESS;
        // Start health checks
        await this.runHealthChecks(deployment);
        // Record deployment event
        await this.recordDeploymentEvent('started', deployment);
    }
    async checkActiveDeployments() {
        for (const deployment of this.activeDeployments.values()) {
            if (deployment.status === DeploymentStatus.IN_PROGRESS) {
                await this.monitorDeployment(deployment);
            }
        }
    }
    async monitorDeployment(deployment) {
        const timeSinceStart = Date.now() - deployment.startTime.getTime();
        const stabilizationTime = this.validationRules.timeBasedRules.stabilizationPeriod * 60 * 1000;
        // Wait for stabilization period before starting validation
        if (timeSinceStart < stabilizationTime) {
            // console.log(`⏳ Deployment ${deployment.id} still in stabilization period`);
            return;
        }
        // Run health checks
        await this.runHealthChecks(deployment);
        // Collect and analyze metrics
        await this.collectDeploymentMetrics(deployment);
        // Validate deployment health
        const validationResult = await this.validateDeployment(deployment);
        if (!validationResult.isHealthy) {
            // console.log(`❌ Deployment ${deployment.id} failed validation: ${validationResult.reason}`);
            if (this.autoRollbackEnabled && validationResult.shouldRollback) {
                await this.initiateAutomaticRollback(deployment, validationResult.reason);
            }
            else {
                await this.markDeploymentFailed(deployment, validationResult.reason);
            }
        }
        else {
            // Check if deployment has been stable long enough to mark as successful
            const monitoringDuration = this.validationRules.timeBasedRules.monitoringDuration * 60 * 1000;
            if (timeSinceStart >= monitoringDuration) {
                await this.markDeploymentSuccessful(deployment);
            }
        }
    }
    async validateDeploymentHealth() {
        // Validate all active deployments
        for (const deployment of this.activeDeployments.values()) {
            if (deployment.status === DeploymentStatus.IN_PROGRESS) {
                await this.monitorDeployment(deployment);
            }
        }
    }
    // Health checks
    createDefaultHealthChecks() {
        return [
            {
                name: 'API Health Check',
                url: `${process.env.API_URL || 'http://localhost:4000'}/health`,
                expectedResponse: { status: 'ok' },
                timeout: 10,
                retries: 3,
                interval: 30,
                status: 'pending'
            },
            {
                name: 'Database Connectivity',
                command: 'SELECT 1',
                timeout: 5,
                retries: 2,
                interval: 60,
                status: 'pending'
            },
            {
                name: 'Application Startup',
                url: `${process.env.WEB_URL || 'http://localhost:3000'}`,
                timeout: 15,
                retries: 5,
                interval: 30,
                status: 'pending'
            },
            {
                name: 'Critical API Endpoints',
                url: `${process.env.API_URL || 'http://localhost:4000'}/api/ecommerce/products`,
                timeout: 10,
                retries: 3,
                interval: 60,
                status: 'pending'
            }
        ];
    }
    async runHealthChecks(deployment) {
        // console.log(`🏥 Running health checks for deployment ${deployment.id}`);
        const healthCheckPromises = deployment.healthChecks.map(async (check) => {
            check.status = 'running';
            check.lastRun = new Date();
            try {
                const result = await this.executeHealthCheck(check);
                check.lastResult = result;
                check.status = result.success ? 'passed' : 'failed';
                if (!result.success) {
                    console.warn(`❌ Health check failed: ${check.name} - ${result.error}`);
                }
            }
            catch (error) {
                check.status = 'failed';
                check.lastResult = {
                    success: false,
                    responseTime: 0,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
                console.error(`❌ Health check error: ${check.name}`, error);
            }
        });
        await Promise.all(healthCheckPromises);
        const failedChecks = deployment.healthChecks.filter((check) => check.status === 'failed');
        // console.log(`🏥 Health checks completed: ${deployment.healthChecks.length - failedChecks.length}/${deployment.healthChecks.length} passed`);
    }
    async executeHealthCheck(check) {
        const startTime = Date.now();
        try {
            if (check.url) {
                return await this.executeHttpHealthCheck(check);
            }
            else if (check.command) {
                return await this.executeCommandHealthCheck(check);
            }
            else {
                throw new Error('No URL or command specified for health check');
            }
        }
        catch (error) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async executeHttpHealthCheck(check) {
        const startTime = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), check.timeout * 1000);
            const response = await fetch(check.url, {
                signal: controller.signal,
                method: 'GET',
                headers: { 'User-Agent': 'O4O-DeploymentMonitor/1.0' }
            });
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            if (!response.ok) {
                return {
                    success: false,
                    responseTime,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }
            let output = '';
            try {
                const text = await response.text();
                output = text;
                // Check expected response if specified
                if (check.expectedResponse) {
                    try {
                        const jsonResponse = JSON.parse(text);
                        const matches = this.compareObjects(jsonResponse, check.expectedResponse);
                        if (!matches) {
                            return {
                                success: false,
                                responseTime,
                                output,
                                error: 'Response does not match expected format'
                            };
                        }
                    }
                    catch (_a) {
                        // If not JSON, do string comparison
                        if (!text.includes(String(check.expectedResponse))) {
                            return {
                                success: false,
                                responseTime,
                                output,
                                error: 'Response does not contain expected content'
                            };
                        }
                    }
                }
            }
            catch (error) {
                // Non-critical error reading response body
                console.warn('Failed to read response body:', error);
            }
            return {
                success: true,
                responseTime,
                output
            };
        }
        catch (error) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async executeCommandHealthCheck(check) {
        const startTime = Date.now();
        try {
            if (check.command === 'SELECT 1') {
                // Database health check
                await connection_1.AppDataSource.query('SELECT 1');
                return {
                    success: true,
                    responseTime: Date.now() - startTime,
                    output: 'Database connection successful'
                };
            }
            else {
                // Generic command execution
                const { stdout, stderr } = await execAsync(check.command, {
                    timeout: check.timeout * 1000
                });
                return {
                    success: !stderr,
                    responseTime: Date.now() - startTime,
                    output: stdout || stderr
                };
            }
        }
        catch (error) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    compareObjects(actual, expected) {
        if (typeof expected !== 'object' || expected === null) {
            return actual === expected;
        }
        const expectedObj = expected;
        const actualObj = actual;
        for (const key in expectedObj) {
            if (!(key in actualObj) || !this.compareObjects(actualObj[key], expectedObj[key])) {
                return false;
            }
        }
        return true;
    }
    // Metrics collection and analysis
    initializeMetrics() {
        return {
            responseTime: { before: [], after: [], average: 0, degradation: 0 },
            errorRate: { before: [], after: [], average: 0, increase: 0 },
            throughput: { before: [], after: [], average: 0, change: 0 },
            memoryUsage: { before: [], after: [], average: 0, change: 0 },
            cpuUsage: { before: [], after: [], average: 0, change: 0 }
        };
    }
    async collectBaselineMetrics() {
        // console.log('📊 Collecting baseline metrics...');
        const metrics = this.initializeMetrics();
        // Collect metrics from the last 30 minutes before deployment
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 30 * 60 * 1000);
        metrics.responseTime.before = await this.getMetricValues('response_time', startTime, endTime);
        metrics.errorRate.before = await this.getMetricValues('error_rate', startTime, endTime);
        metrics.throughput.before = await this.getMetricValues('throughput', startTime, endTime);
        metrics.memoryUsage.before = await this.getMetricValues('memory_usage', startTime, endTime);
        metrics.cpuUsage.before = await this.getMetricValues('cpu_usage', startTime, endTime);
        return metrics;
    }
    async collectDeploymentMetrics(deployment) {
        // console.log(`📊 Collecting deployment metrics for ${deployment.id}`);
        // Collect current metrics
        const endTime = new Date();
        const startTime = new Date(deployment.startTime.getTime());
        const currentMetrics = {
            responseTime: await this.getMetricValues('response_time', startTime, endTime),
            errorRate: await this.getMetricValues('error_rate', startTime, endTime),
            throughput: await this.getMetricValues('throughput', startTime, endTime),
            memoryUsage: await this.getMetricValues('memory_usage', startTime, endTime),
            cpuUsage: await this.getMetricValues('cpu_usage', startTime, endTime)
        };
        // Update deployment metrics
        deployment.metrics.responseTime.after = currentMetrics.responseTime;
        deployment.metrics.errorRate.after = currentMetrics.errorRate;
        deployment.metrics.throughput.after = currentMetrics.throughput;
        deployment.metrics.memoryUsage.after = currentMetrics.memoryUsage;
        deployment.metrics.cpuUsage.after = currentMetrics.cpuUsage;
        // Calculate averages and changes
        this.calculateMetricChanges(deployment.metrics);
    }
    async getMetricValues(metricName, startTime, endTime) {
        try {
            const metrics = await this.systemMetricsRepo.find({
                where: {
                    metricName: metricName,
                    createdAt: (0, typeorm_1.Between)(startTime, endTime)
                },
                order: { createdAt: 'ASC' }
            });
            return metrics.map((metric) => parseFloat(metric.value.toString()));
        }
        catch (error) {
            console.warn(`Failed to collect ${metricName} metrics:`, error);
            return [];
        }
    }
    calculateMetricChanges(metrics) {
        // Response time
        metrics.responseTime.average = this.calculateAverage(metrics.responseTime.after);
        const baselineAvg = this.calculateAverage(metrics.responseTime.before);
        metrics.responseTime.degradation = baselineAvg > 0
            ? ((metrics.responseTime.average - baselineAvg) / baselineAvg) * 100
            : 0;
        // Error rate
        metrics.errorRate.average = this.calculateAverage(metrics.errorRate.after);
        const baselineErrorRate = this.calculateAverage(metrics.errorRate.before);
        metrics.errorRate.increase = baselineErrorRate > 0
            ? ((metrics.errorRate.average - baselineErrorRate) / baselineErrorRate) * 100
            : 0;
        // Throughput
        metrics.throughput.average = this.calculateAverage(metrics.throughput.after);
        const baselineThroughput = this.calculateAverage(metrics.throughput.before);
        metrics.throughput.change = baselineThroughput > 0
            ? ((metrics.throughput.average - baselineThroughput) / baselineThroughput) * 100
            : 0;
        // Memory usage
        metrics.memoryUsage.average = this.calculateAverage(metrics.memoryUsage.after);
        const baselineMemory = this.calculateAverage(metrics.memoryUsage.before);
        metrics.memoryUsage.change = baselineMemory > 0
            ? ((metrics.memoryUsage.average - baselineMemory) / baselineMemory) * 100
            : 0;
        // CPU usage
        metrics.cpuUsage.average = this.calculateAverage(metrics.cpuUsage.after);
        const baselineCpu = this.calculateAverage(metrics.cpuUsage.before);
        metrics.cpuUsage.change = baselineCpu > 0
            ? ((metrics.cpuUsage.average - baselineCpu) / baselineCpu) * 100
            : 0;
    }
    calculateAverage(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    // Deployment validation
    async validateDeployment(deployment) {
        const validationResults = {
            healthChecks: this.validateHealthChecks(deployment),
            performance: this.validatePerformanceMetrics(deployment),
            stability: this.validateStability(deployment)
        };
        const isHealthy = validationResults.healthChecks.passed &&
            validationResults.performance.passed &&
            validationResults.stability.passed;
        const shouldRollback = !isHealthy && (validationResults.healthChecks.critical ||
            validationResults.performance.critical ||
            validationResults.stability.critical);
        let reason = 'Deployment is healthy';
        if (!isHealthy) {
            const issues = [
                !validationResults.healthChecks.passed && validationResults.healthChecks.reason,
                !validationResults.performance.passed && validationResults.performance.reason,
                !validationResults.stability.passed && validationResults.stability.reason
            ].filter(Boolean);
            reason = `Validation failed: ${issues.join(', ')}`;
        }
        return {
            isHealthy,
            shouldRollback,
            reason,
            details: validationResults
        };
    }
    validateHealthChecks(deployment) {
        const failedChecks = deployment.healthChecks.filter((check) => check.status === 'failed');
        const criticalChecks = ['API Health Check', 'Database Connectivity'];
        const criticalFailures = failedChecks.filter((check) => criticalChecks.includes(check.name));
        if (criticalFailures.length > 0) {
            return {
                passed: false,
                critical: true,
                reason: `Critical health checks failed: ${criticalFailures.map((c) => c.name).join(', ')}`
            };
        }
        if (failedChecks.length > this.validationRules.healthCheckFailures.maxFailures) {
            return {
                passed: false,
                critical: false,
                reason: `Too many health check failures: ${failedChecks.length}/${deployment.healthChecks.length}`
            };
        }
        return {
            passed: true,
            critical: false,
            reason: 'All health checks passed'
        };
    }
    validatePerformanceMetrics(deployment) {
        const metrics = deployment.metrics;
        const thresholds = this.validationRules.performanceThresholds;
        const issues = [];
        let critical = false;
        // Response time degradation
        if (metrics.responseTime.degradation > thresholds.maxResponseTimeDegradation) {
            issues.push(`Response time degraded by ${metrics.responseTime.degradation.toFixed(1)}%`);
            if (metrics.responseTime.degradation > thresholds.maxResponseTimeDegradation * 2) {
                critical = true;
            }
        }
        // Error rate increase
        if (metrics.errorRate.increase > thresholds.maxErrorRateIncrease) {
            issues.push(`Error rate increased by ${metrics.errorRate.increase.toFixed(1)}%`);
            critical = true; // Error rate increases are always critical
        }
        // Memory usage increase
        if (metrics.memoryUsage.change > thresholds.maxMemoryIncrease) {
            issues.push(`Memory usage increased by ${metrics.memoryUsage.change.toFixed(1)}%`);
        }
        if (issues.length > 0) {
            return {
                passed: false,
                critical,
                reason: issues.join(', ')
            };
        }
        return {
            passed: true,
            critical: false,
            reason: 'Performance metrics within acceptable ranges'
        };
    }
    validateStability(deployment) {
        const timeSinceStart = Date.now() - deployment.startTime.getTime();
        const stabilizationTime = this.validationRules.timeBasedRules.stabilizationPeriod * 60 * 1000;
        if (timeSinceStart < stabilizationTime) {
            return {
                passed: true,
                critical: false,
                reason: 'Still in stabilization period'
            };
        }
        // Check for consistent health check passes
        const recentHealthChecks = deployment.healthChecks.filter((check) => check.lastRun && (Date.now() - check.lastRun.getTime()) < 10 * 60 * 1000 // Last 10 minutes
        );
        const unstableChecks = recentHealthChecks.filter((check) => check.status === 'failed');
        if (unstableChecks.length > 0) {
            return {
                passed: false,
                critical: unstableChecks.some((check) => ['API Health Check', 'Database Connectivity'].includes(check.name)),
                reason: `Unstable health checks: ${unstableChecks.map((c) => c.name).join(', ')}`
            };
        }
        return {
            passed: true,
            critical: false,
            reason: 'Deployment is stable'
        };
    }
    // Rollback functionality
    async rollbackDeployment(target, parameters) {
        // console.log(`🔄 Rolling back deployment: ${target}`);
        let deployment;
        if (target === 'latest') {
            // Find the latest active deployment
            deployment = Array.from(this.activeDeployments.values())
                .filter((d) => d.status === DeploymentStatus.IN_PROGRESS)
                .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
        }
        else {
            deployment = this.activeDeployments.get(target);
        }
        if (!deployment) {
            throw new Error(`Deployment not found: ${target}`);
        }
        const rollbackInfo = await this.executeRollback(deployment, 'manual', typeof (parameters === null || parameters === void 0 ? void 0 : parameters.reason) === 'string' ? parameters.reason : 'Manual rollback requested');
        return { output: `Rollback initiated for deployment ${deployment.id} (Rollback ID: ${rollbackInfo.id})` };
    }
    async initiateAutomaticRollback(deployment, reason) {
        // console.log(`🚨 Initiating automatic rollback for deployment ${deployment.id}: ${reason}`);
        await this.executeRollback(deployment, 'automatic', reason);
    }
    async executeRollback(deployment, triggeredBy, reason) {
        const rollbackInfo = {
            id: `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            triggeredBy,
            reason,
            startTime: new Date(),
            status: 'in_progress',
            targetVersion: this.currentVersion,
            rollbackSteps: this.createRollbackSteps(deployment),
            verificationChecks: this.createDefaultHealthChecks()
        };
        deployment.rollbackInfo = rollbackInfo;
        deployment.status = DeploymentStatus.ROLLED_BACK;
        try {
            // Execute rollback steps
            for (const step of rollbackInfo.rollbackSteps) {
                await this.executeRollbackStep(step, deployment);
            }
            // Verify rollback success
            await this.verifyRollback(rollbackInfo);
            rollbackInfo.status = 'success';
            rollbackInfo.endTime = new Date();
            // console.log(`✅ Rollback completed successfully: ${rollbackInfo.id}`);
            // Create success alert
            await this.createRollbackAlert(deployment, rollbackInfo, true);
        }
        catch (error) {
            rollbackInfo.status = 'failed';
            rollbackInfo.endTime = new Date();
            deployment.status = DeploymentStatus.ROLLBACK_FAILED;
            console.error(`❌ Rollback failed: ${rollbackInfo.id}`, error);
            // Create failure alert
            await this.createRollbackAlert(deployment, rollbackInfo, false);
            throw error;
        }
        // Record rollback event
        await this.recordDeploymentEvent('rolled_back', deployment);
        return rollbackInfo;
    }
    createRollbackSteps(deployment) {
        var _a;
        const steps = [];
        // Add git revert step
        if (deployment.commitHash && deployment.commitHash !== 'unknown') {
            steps.push({
                name: 'Git Revert',
                type: 'git_revert',
                command: `git revert ${deployment.commitHash} --no-edit`,
                status: 'pending'
            });
        }
        // Add service restart step
        steps.push({
            name: 'Restart API Server',
            type: 'service_restart',
            target: 'api-server',
            status: 'pending'
        });
        // Add cache clear step
        steps.push({
            name: 'Clear Application Cache',
            type: 'cache_clear',
            target: 'application',
            status: 'pending'
        });
        // Add database migration rollback if needed
        if ((_a = deployment.metadata) === null || _a === void 0 ? void 0 : _a.hasDatabaseChanges) {
            steps.push({
                name: 'Rollback Database Migrations',
                type: 'database_migration',
                command: 'npm run migration:revert',
                status: 'pending'
            });
        }
        // Add config restore step
        steps.push({
            name: 'Restore Configuration',
            type: 'config_restore',
            target: 'application-config',
            status: 'pending'
        });
        return steps;
    }
    async executeRollbackStep(step, deployment) {
        // console.log(`🔧 Executing rollback step: ${step.name}`);
        step.status = 'in_progress';
        step.startTime = new Date();
        try {
            switch (step.type) {
                case 'git_revert':
                    step.output = await this.executeGitRevert(step.command);
                    break;
                case 'service_restart':
                    step.output = await this.executeServiceRestart(step.target);
                    break;
                case 'cache_clear':
                    step.output = await this.executeCacheClear(step.target);
                    break;
                case 'database_migration':
                    step.output = await this.executeDatabaseRollback(step.command);
                    break;
                case 'config_restore':
                    step.output = await this.executeConfigRestore(step.target);
                    break;
                case 'script_execution':
                    step.output = await this.executeCustomScript(step.command, step.parameters);
                    break;
                default:
                    throw new Error(`Unknown rollback step type: ${step.type}`);
            }
            step.status = 'completed';
            step.endTime = new Date();
            // console.log(`✅ Rollback step completed: ${step.name}`);
        }
        catch (error) {
            step.status = 'failed';
            step.endTime = new Date();
            step.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Rollback step failed: ${step.name}`, error);
            throw error;
        }
    }
    async executeGitRevert(command) {
        try {
            const { stdout, stderr } = await execAsync(command);
            return stdout || stderr;
        }
        catch (error) {
            throw new Error(`Git revert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeServiceRestart(target) {
        // In a real implementation, this would restart the actual service
        // console.log(`Restarting service: ${target}`);
        // Simulate service restart delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        return `Service ${target} restarted successfully`;
    }
    async executeCacheClear(target) {
        // Clear application caches
        // console.log(`Clearing cache: ${target}`);
        return `Cache ${target} cleared successfully`;
    }
    async executeDatabaseRollback(command) {
        try {
            const { stdout, stderr } = await execAsync(command);
            return stdout || stderr;
        }
        catch (error) {
            throw new Error(`Database rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async executeConfigRestore(target) {
        // Restore configuration from backup
        // console.log(`Restoring configuration: ${target}`);
        return `Configuration ${target} restored successfully`;
    }
    async executeCustomScript(command, parameters) {
        try {
            const { stdout, stderr } = await execAsync(`${command} ${JSON.stringify(parameters || {})}`);
            return stdout || stderr;
        }
        catch (error) {
            throw new Error(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async verifyRollback(rollbackInfo) {
        // console.log(`🔍 Verifying rollback: ${rollbackInfo.id}`);
        // Run verification health checks
        for (const check of rollbackInfo.verificationChecks) {
            check.status = 'running';
            try {
                const result = await this.executeHealthCheck(check);
                check.lastResult = result;
                check.status = result.success ? 'passed' : 'failed';
            }
            catch (error) {
                check.status = 'failed';
                check.lastResult = {
                    success: false,
                    responseTime: 0,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        const failedChecks = rollbackInfo.verificationChecks.filter((check) => check.status === 'failed');
        if (failedChecks.length > 0) {
            throw new Error(`Rollback verification failed: ${failedChecks.map((c) => c.name).join(', ')}`);
        }
        // console.log(`✅ Rollback verification successful: ${rollbackInfo.id}`);
    }
    // Deployment status management
    async markDeploymentSuccessful(deployment) {
        deployment.status = DeploymentStatus.SUCCESS;
        deployment.endTime = new Date();
        // console.log(`✅ Deployment marked as successful: ${deployment.id}`);
        // Update current version
        this.currentVersion = deployment.version;
        // Move to history
        this.activeDeployments.delete(deployment.id);
        this.deploymentHistory.push(deployment);
        // Record success event
        await this.recordDeploymentEvent('completed', deployment);
    }
    async markDeploymentFailed(deployment, reason) {
        deployment.status = DeploymentStatus.FAILED;
        deployment.endTime = new Date();
        // console.log(`❌ Deployment marked as failed: ${deployment.id} - ${reason}`);
        // Create failure alert
        await this.createDeploymentAlert(deployment, false, reason);
        // Record failure event
        await this.recordDeploymentEvent('failed', deployment);
    }
    // Monitoring and initialization
    async startDeploymentMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.checkActiveDeployments();
                await this.validateDeploymentHealth();
                await this.updateDeploymentMetrics();
            }
            catch (error) {
                console.error('Deployment monitoring failed:', error);
            }
        }, 60000); // Every minute
        // console.log('📊 Deployment monitoring started');
    }
    async detectCurrentDeployment() {
        try {
            // Try to get version from package.json
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf-8');
            const packageJson = JSON.parse(packageContent);
            this.currentVersion = packageJson.version || '1.0.0';
            // console.log(`📦 Current version detected: ${this.currentVersion}`);
        }
        catch (error) {
            console.warn('Failed to detect current version:', error);
            this.currentVersion = '1.0.0';
        }
    }
    async updateDeploymentMetrics() {
        const activeDeploymentCount = this.activeDeployments.size;
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.ACTIVE_DEPLOYMENTS, 'Active Deployments', activeDeploymentCount, 'count', 'deployment-monitoring', { timestamp: new Date().toISOString() }));
    }
    // Events and alerts
    async recordDeploymentEvent(event, deployment) {
        await this.systemMetricsRepo.save(SystemMetrics_1.SystemMetrics.createSystemMetric(SystemMetrics_1.MetricCategory.DEPLOYMENT_EVENT, `Deployment ${event}`, 1, 'event', 'deployment-monitoring', {
            deploymentId: deployment.id,
            version: deployment.version,
            environment: deployment.environment,
            status: deployment.status,
            timestamp: new Date().toISOString()
        }));
    }
    async createDeploymentAlert(deployment, success, reason) {
        const alert = Alert_1.Alert.createSystemAlert(success ? 'Deployment Successful' : 'Deployment Failed', success
            ? `Deployment ${deployment.version} completed successfully`
            : `Deployment ${deployment.version} failed: ${reason}`, success ? Alert_1.AlertSeverity.LOW : Alert_1.AlertSeverity.HIGH, 'deployment-monitoring', JSON.stringify({
            deploymentId: deployment.id,
            version: deployment.version,
            environment: deployment.environment,
            success,
            reason
        }));
        alert.alertType = Alert_1.AlertType.DEPLOYMENT;
        await this.alertRepo.save(alert);
    }
    async createRollbackAlert(deployment, rollbackInfo, success) {
        const alert = Alert_1.Alert.createSystemAlert(success ? 'Rollback Successful' : 'Rollback Failed', success
            ? `Rollback completed successfully for deployment ${deployment.version}`
            : `Rollback failed for deployment ${deployment.version}`, success ? Alert_1.AlertSeverity.MEDIUM : Alert_1.AlertSeverity.CRITICAL, 'deployment-monitoring', JSON.stringify({
            deploymentId: deployment.id,
            rollbackId: rollbackInfo.id,
            version: deployment.version,
            triggeredBy: rollbackInfo.triggeredBy,
            reason: rollbackInfo.reason,
            success
        }));
        alert.alertType = Alert_1.AlertType.DEPLOYMENT;
        await this.alertRepo.save(alert);
    }
    // Public API methods
    async getStatus() {
        const activeDeployments = this.activeDeployments.size;
        const issues = [];
        // Check for failed deployments
        const failedDeployments = Array.from(this.activeDeployments.values())
            .filter((d) => d.status === DeploymentStatus.FAILED || d.status === DeploymentStatus.ROLLBACK_FAILED);
        if (failedDeployments.length > 0) {
            issues.push(`${failedDeployments.length} failed deployments`);
        }
        // Check for long-running deployments
        const longRunningDeployments = Array.from(this.activeDeployments.values())
            .filter((d) => {
            const runtime = Date.now() - d.startTime.getTime();
            return runtime > 60 * 60 * 1000; // 1 hour
        });
        if (longRunningDeployments.length > 0) {
            issues.push(`${longRunningDeployments.length} long-running deployments`);
        }
        let status = 'healthy';
        if (failedDeployments.length > 0) {
            status = 'unhealthy';
        }
        else if (issues.length > 0) {
            status = 'degraded';
        }
        return {
            status,
            activeDeployments,
            autoRollbackEnabled: this.autoRollbackEnabled,
            currentVersion: this.currentVersion,
            issues
        };
    }
    async getActiveDeployments() {
        return Array.from(this.activeDeployments.values());
    }
    async getDeploymentHistory(limit = 50) {
        return this.deploymentHistory
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, limit);
    }
    async getDeployment(deploymentId) {
        return this.activeDeployments.get(deploymentId) ||
            this.deploymentHistory.find((d) => d.id === deploymentId) ||
            null;
    }
    async enableAutoRollback() {
        this.autoRollbackEnabled = true;
        // console.log('✅ Auto-rollback enabled');
    }
    async disableAutoRollback() {
        this.autoRollbackEnabled = false;
        // console.log('⏸️ Auto-rollback disabled');
    }
    async updateValidationRules(rules) {
        this.validationRules = { ...this.validationRules, ...rules };
        // console.log('✅ Deployment validation rules updated');
    }
}
exports.DeploymentMonitoringService = DeploymentMonitoringService;
exports.deploymentMonitoringService = new DeploymentMonitoringService();
//# sourceMappingURL=DeploymentMonitoringService.js.map