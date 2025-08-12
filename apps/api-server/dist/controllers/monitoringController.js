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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringController = void 0;
const os = __importStar(require("os"));
const connection_1 = require("../database/connection");
const BackupService_1 = require("../services/BackupService");
const ErrorAlertService_1 = require("../services/ErrorAlertService");
const SecurityAuditService_1 = require("../services/SecurityAuditService");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
class MonitoringController {
    // Get system metrics
    static async getMetrics(req, res) {
        try {
            const cpuUsage = process.cpuUsage();
            const memoryUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            // Get disk usage (mock data for now - diskusage module not installed)
            const disk = {
                total: 100 * 1024 * 1024 * 1024, // 100GB
                free: 40 * 1024 * 1024 * 1024, // 40GB free
            };
            // Get database metrics
            const dbConnection = connection_1.AppDataSource.isInitialized ? connection_1.AppDataSource : null;
            const dbMetrics = {
                connections: dbConnection ? 1 : 0, // Simplified for now
                maxConnections: 100,
                queryTime: 0,
                slowQueries: 0
            };
            // API metrics (simplified)
            const apiMetrics = {
                requestsPerMinute: Math.floor(Math.random() * 100) + 50,
                averageResponseTime: Math.floor(Math.random() * 50) + 20,
                errorRate: Math.random() * 2,
                activeConnections: Math.floor(Math.random() * 20) + 10
            };
            const metrics = {
                cpu: {
                    usage: Math.min(100, (cpuUsage.user + cpuUsage.system) / 1000000),
                    cores: os.cpus().length,
                    loadAverage: os.loadavg()
                },
                memory: {
                    total: totalMemory,
                    used: usedMemory,
                    free: freeMemory,
                    percentage: (usedMemory / totalMemory) * 100
                },
                disk: {
                    total: disk.total,
                    used: disk.total - disk.free,
                    free: disk.free,
                    percentage: ((disk.total - disk.free) / disk.total) * 100
                },
                database: dbMetrics,
                api: apiMetrics,
                uptime: process.uptime(),
                timestamp: new Date()
            };
            res.json(metrics);
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching metrics:', error);
            res.status(500).json({ error: 'Failed to fetch metrics' });
        }
    }
    // Get performance history
    static async getMetricsHistory(req, res) {
        try {
            // In production, this would fetch from a time-series database
            // For now, return mock data
            const history = [];
            const now = Date.now();
            for (let i = 0; i < 60; i++) {
                history.push({
                    timestamp: new Date(now - (i * 60000)), // Every minute for last hour
                    cpu: Math.random() * 100,
                    memory: 50 + Math.random() * 30,
                    responseTime: 20 + Math.random() * 50,
                    requests: Math.floor(50 + Math.random() * 100),
                    errors: Math.floor(Math.random() * 5)
                });
            }
            res.json(history.reverse());
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching metrics history:', error);
            res.status(500).json({ error: 'Failed to fetch metrics history' });
        }
    }
    // Get monitoring summary
    static async getSummary(req, res) {
        try {
            // Get backup status
            const backupStatus = BackupService_1.backupService.getStatus();
            // Get error stats
            const errorStats = ErrorAlertService_1.errorAlertService.getStats();
            // Get security stats
            const securityStats = SecurityAuditService_1.securityAuditService.getStats();
            // Calculate system health
            const memoryUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
            const health = memoryUsage > 90 ? 'critical' :
                memoryUsage > 70 ? 'degraded' : 'healthy';
            const summary = {
                backup: {
                    lastBackup: backupStatus.lastBackup,
                    nextBackup: backupStatus.nextBackup,
                    backupSize: backupStatus.lastBackupSize,
                    status: backupStatus.isRunning ? 'running' :
                        backupStatus.lastBackup ? 'success' : 'failed',
                    totalBackups: backupStatus.totalBackups,
                    failedBackups: backupStatus.failedBackups
                },
                errors: {
                    critical: errorStats.critical,
                    error: errorStats.error,
                    warning: errorStats.warning,
                    recent: errorStats.recent.slice(0, 5)
                },
                security: {
                    blockedIPs: securityStats.blockedRequests,
                    failedLogins: securityStats.failedLogins,
                    suspiciousActivities: securityStats.suspiciousActivities,
                    recentEvents: securityStats.recentEvents.slice(0, 5)
                },
                system: {
                    health,
                    uptime: process.uptime(),
                    cpu: Math.min(100, Math.random() * 50),
                    memory: memoryUsage,
                    disk: 0 // Would calculate real disk usage
                }
            };
            res.json(summary);
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching monitoring summary:', error);
            res.status(500).json({ error: 'Failed to fetch monitoring summary' });
        }
    }
    // Trigger manual backup
    static async triggerBackup(req, res) {
        try {
            const history = await BackupService_1.backupService.performBackup(true);
            res.json({
                success: true,
                message: 'Backup started successfully',
                backup: history
            });
        }
        catch (error) {
            simpleLogger_1.default.error('Error triggering backup:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to trigger backup'
            });
        }
    }
    // Get backup history
    static async getBackupHistory(req, res) {
        try {
            const status = BackupService_1.backupService.getStatus();
            res.json({
                status: status,
                config: BackupService_1.backupService.getConfig()
            });
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching backup history:', error);
            res.status(500).json({ error: 'Failed to fetch backup history' });
        }
    }
    // Get error alerts
    static async getErrorAlerts(req, res) {
        try {
            const { limit = 100, level, resolved } = req.query;
            const alerts = ErrorAlertService_1.errorAlertService.getAlerts({
                limit: Number(limit),
                level: level,
                resolved: resolved === 'true'
            });
            res.json(alerts);
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching error alerts:', error);
            res.status(500).json({ error: 'Failed to fetch error alerts' });
        }
    }
    // Get security events
    static async getSecurityEvents(req, res) {
        try {
            const { limit = 100, type, severity } = req.query;
            const events = SecurityAuditService_1.securityAuditService.getEvents({
                limit: Number(limit),
                type: type,
                severity: severity
            });
            res.json(events);
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching security events:', error);
            res.status(500).json({ error: 'Failed to fetch security events' });
        }
    }
    // Get security rules
    static async getSecurityRules(req, res) {
        try {
            const rules = SecurityAuditService_1.securityAuditService.getRules();
            res.json(rules);
        }
        catch (error) {
            simpleLogger_1.default.error('Error fetching security rules:', error);
            res.status(500).json({ error: 'Failed to fetch security rules' });
        }
    }
    // Update security rule
    static async updateSecurityRule(req, res) {
        try {
            const { ruleId } = req.params;
            const updates = req.body;
            const success = SecurityAuditService_1.securityAuditService.updateRule(ruleId, updates);
            if (success) {
                res.json({ success: true, message: 'Rule updated successfully' });
            }
            else {
                res.status(404).json({ success: false, error: 'Rule not found' });
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Error updating security rule:', error);
            res.status(500).json({ error: 'Failed to update security rule' });
        }
    }
}
exports.MonitoringController = MonitoringController;
//# sourceMappingURL=monitoringController.js.map