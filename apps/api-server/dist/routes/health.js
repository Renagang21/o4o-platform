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
const express_1 = require("express");
const connection_1 = require("../database/connection");
const os = __importStar(require("os"));
const router = (0, express_1.Router)();
// Basic health check endpoint
router.get('/', async (req, res) => {
    try {
        const health = await performHealthCheck();
        if (health.status === 'healthy') {
            res.json(health);
        }
        else {
            res.status(503).json(health);
        }
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Detailed health check with all components
router.get('/detailed', async (req, res) => {
    try {
        const health = await performDetailedHealthCheck();
        const overallHealthy = health.checks.every((check) => check.status === 'healthy');
        res.status(overallHealthy ? 200 : 503).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Readiness probe for Kubernetes/container orchestration
router.get('/ready', async (req, res) => {
    try {
        // Check if all critical components are ready
        const isReady = await checkReadiness();
        if (isReady) {
            res.json({
                status: 'ready',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(503).json({
                status: 'not ready',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Liveness probe for Kubernetes/container orchestration
router.get('/live', async (req, res) => {
    try {
        // Basic liveness check - just return that the process is running
        res.json({
            status: 'alive',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'dead',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Component-specific health checks
router.get('/database', async (req, res) => {
    try {
        const dbHealth = await checkDatabaseHealth();
        res.status(dbHealth.status === 'healthy' ? 200 : 503).json(dbHealth);
    }
    catch (error) {
        res.status(503).json({
            component: 'database',
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/system', async (req, res) => {
    try {
        const systemHealth = await checkSystemHealth();
        res.json(systemHealth);
    }
    catch (error) {
        res.status(503).json({
            component: 'system',
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
async function performHealthCheck() {
    const start = Date.now();
    // Check database connectivity
    let dbStatus = 'healthy';
    let dbError;
    try {
        await connection_1.AppDataSource.query('SELECT 1');
    }
    catch (error) {
        dbStatus = 'unhealthy';
        dbError = error instanceof Error ? error.message : 'Database connection failed';
    }
    const responseTime = Date.now() - start;
    const status = dbStatus === 'healthy' ? 'healthy' : 'unhealthy';
    return {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: {
            status: dbStatus,
            error: dbError
        },
        memory: {
            used: Math.round(process.memoryUsage().rss / 1024 / 1024),
            total: Math.round(os.totalmem() / 1024 / 1024),
            percentage: Math.round((process.memoryUsage().rss / os.totalmem()) * 100)
        }
    };
}
async function performDetailedHealthCheck() {
    const start = Date.now();
    const checks = await Promise.all([
        checkDatabaseHealth(),
        checkSystemHealth(),
        checkMemoryHealth(),
        checkDiskHealth()
    ]);
    const overallStatus = checks.every((check) => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - start,
        checks
    };
}
async function checkReadiness() {
    try {
        // Check database connection
        await connection_1.AppDataSource.query('SELECT 1');
        // Check if we have enough memory
        const memUsage = process.memoryUsage().rss / os.totalmem();
        if (memUsage > 0.9) { // 90% memory usage
            return false;
        }
        return true;
    }
    catch (error) {
        return false;
    }
}
async function checkDatabaseHealth() {
    const start = Date.now();
    try {
        // Test basic connectivity
        await connection_1.AppDataSource.query('SELECT 1');
        // Check database version
        const versionResult = await connection_1.AppDataSource.query('SELECT version()');
        // Check active connections
        const connectionsResult = await connection_1.AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
        // Check for long-running queries
        const longQueriesResult = await connection_1.AppDataSource.query(`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE state = 'active' AND query_start < now() - interval '5 minutes'
    `);
        const responseTime = Date.now() - start;
        const longQueries = parseInt(longQueriesResult[0].count);
        return {
            component: 'database',
            status: longQueries > 5 ? 'degraded' : 'healthy',
            responseTime,
            details: {
                version: versionResult[0].version.split(' ')[1],
                activeConnections: parseInt(connectionsResult[0].count),
                longRunningQueries: longQueries
            },
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            component: 'database',
            status: 'unhealthy',
            responseTime: Date.now() - start,
            error: error instanceof Error ? error.message : 'Database check failed',
            timestamp: new Date().toISOString()
        };
    }
}
async function checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const systemMem = {
        total: os.totalmem(),
        free: os.freemem()
    };
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    // Calculate CPU percentage (approximate)
    const cpuPercent = Math.round(((cpuUsage.user + cpuUsage.system) / 1000000) * 100) / 100;
    // Calculate memory percentage
    const memPercent = Math.round((memUsage.rss / systemMem.total) * 100);
    // Determine status based on thresholds
    let status = 'healthy';
    if (memPercent > 85 || loadAvg[0] > os.cpus().length * 0.8) {
        status = 'degraded';
    }
    if (memPercent > 95 || loadAvg[0] > os.cpus().length) {
        status = 'unhealthy';
    }
    return {
        component: 'system',
        status,
        details: {
            uptime: process.uptime(),
            memory: {
                used: Math.round(memUsage.rss / 1024 / 1024),
                total: Math.round(systemMem.total / 1024 / 1024),
                percentage: memPercent
            },
            cpu: {
                usage: cpuPercent,
                loadAverage: loadAvg,
                cores: os.cpus().length
            },
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
    };
}
async function checkMemoryHealth() {
    const memUsage = process.memoryUsage();
    const systemMem = {
        total: os.totalmem(),
        free: os.freemem()
    };
    const memPercent = Math.round((memUsage.rss / systemMem.total) * 100);
    let status = 'healthy';
    if (memPercent > 80)
        status = 'degraded';
    if (memPercent > 90)
        status = 'unhealthy';
    return {
        component: 'memory',
        status,
        details: {
            process: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            system: {
                total: Math.round(systemMem.total / 1024 / 1024),
                free: Math.round(systemMem.free / 1024 / 1024),
                percentage: memPercent
            }
        },
        timestamp: new Date().toISOString()
    };
}
async function checkDiskHealth() {
    try {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
        const execAsync = promisify(exec);
        // Get disk usage information
        const { stdout } = await execAsync("df -h / | tail -1");
        const parts = stdout.trim().split(/\s+/);
        const diskInfo = {
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            percentage: parseInt(parts[4].replace('%', ''))
        };
        let status = 'healthy';
        if (diskInfo.percentage > 80)
            status = 'degraded';
        if (diskInfo.percentage > 90)
            status = 'unhealthy';
        return {
            component: 'disk',
            status,
            details: diskInfo,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            component: 'disk',
            status: 'unknown',
            error: 'Unable to check disk usage',
            timestamp: new Date().toISOString()
        };
    }
}
exports.default = router;
//# sourceMappingURL=health.js.map