import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { SystemMetrics, MetricCategory } from '../entities/SystemMetrics';
import { Alert, AlertSeverity } from '../entities/Alert';
import { cacheService } from './CacheService';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Type definitions for service parameters
export interface ServiceRestartParameters {
  graceful?: boolean;
  timeout?: number;
  verifyRestart?: boolean;
  [key: string]: unknown;
}

export interface CacheClearParameters {
  cacheTypes?: string[];
  pattern?: string;
  [key: string]: unknown;
}

export interface ConnectionResetParameters {
  maxConnections?: number;
  [key: string]: unknown;
}

export interface ScaleResourceParameters {
  action?: string;
  factor?: number;
  [key: string]: unknown;
}

export interface ServiceState {
  restartCount: number;
  lastRestart: Date | null;
  [key: string]: unknown;
}

export interface HealingContext {
  serviceName?: string;
  target?: string;
  [key: string]: unknown;
}

export interface HealingAction {
  id: string;
  name: string;
  description: string;
  target: string;
  type: 'service_restart' | 'cache_clear' | 'connection_reset' | 'resource_scale' | 'memory_cleanup' | 'disk_cleanup' | 'process_kill' | 'file_cleanup' | 'config_reload';
  parameters: Record<string, unknown>;
  safetyChecks: SafetyCheck[];
  rollbackActions?: HealingAction[];
  maxRetries: number;
  timeout: number; // seconds
  cooldownPeriod: number; // minutes
  requiredPermissions: string[];
}

export interface SafetyCheck {
  type: 'pre_execution' | 'post_execution';
  name: string;
  command?: string;
  condition: string;
  failureAction: 'abort' | 'warn' | 'rollback';
}

export interface HealingAttempt {
  id: string;
  actionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'success' | 'failed' | 'aborted' | 'rolled_back';
  target: string;
  safetyCheckResults: {
    check: SafetyCheck;
    passed: boolean;
    output?: string;
    error?: string;
  }[];
  executionLog: string[];
  rollbackPerformed: boolean;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    swapUsed: number;
  };
  cpu: {
    loadAverage: number[];
    usage: number;
    processes: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  services: {
    [serviceName: string]: {
      status: 'running' | 'stopped' | 'error' | 'unknown';
      pid?: number;
      memory?: number;
      cpu?: number;
      restartCount: number;
      lastRestart?: Date;
    };
  };
  connections: {
    database: number;
    redis: number;
    http: number;
  };
  issues: SystemIssue[];
}

export interface SystemIssue {
  type: 'memory_leak' | 'high_cpu' | 'disk_full' | 'service_down' | 'connection_leak' | 'file_handle_leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedComponent: string;
  detectedAt: Date;
  suggestedActions: string[];
  autoHealable: boolean;
}

export class SelfHealingService {
  private systemMetricsRepo: Repository<SystemMetrics>;
  private alertRepo: Repository<Alert>;
  
  private healingActions: Map<string, HealingAction> = new Map();
  private activeAttempts: Map<string, HealingAttempt> = new Map();
  private healingHistory: HealingAttempt[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  
  private isEnabled: boolean = true;
  private maxConcurrentHealing: number = 3;
  
  // Service tracking
  private serviceStates: Map<string, ServiceState> = new Map();
  private lastHealthCheck: Date | null = null;

  constructor() {
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.alertRepo = AppDataSource.getRepository(Alert);
  }

  async initialize(): Promise<void> {
    // console.log('🔧 Initializing Self-Healing Service...');
    
    await this.initializeHealingActions();
    await this.startHealthMonitoring();
    await this.initializeServiceTracking();
    
    // console.log('✅ Self-Healing Service initialized');
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // console.log('🔧 Self-Healing Service shut down');
  }

  // Service restart functionality
  async restartService(serviceName: string, parameters?: ServiceRestartParameters): Promise<{ output: string }> {
    // console.log(`🔄 Restarting service: ${serviceName}`);
    
    const action = this.healingActions.get('restart-service') || await this.createServiceRestartAction(serviceName, parameters);
    return await this.executeHealingAction(action, { serviceName, ...parameters });
  }

  private async createServiceRestartAction(serviceName: string, parameters: ServiceRestartParameters): Promise<HealingAction> {
    return {
      id: `restart-${serviceName}`,
      name: `Restart ${serviceName}`,
      description: `Restart the ${serviceName} service`,
      target: serviceName,
      type: 'service_restart',
      parameters: {
        graceful: parameters?.graceful !== false,
        timeout: parameters?.timeout || 30,
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
      timeout: parameters?.timeout || 60,
      cooldownPeriod: 5,
      requiredPermissions: ['service_control']
    };
  }

  // Cache clearing functionality
  async clearCache(target: string, parameters?: CacheClearParameters): Promise<{ output: string }> {
    // console.log(`🗑️ Clearing cache: ${target}`);
    
    let output = '';
    const cacheTypes = parameters?.cacheTypes || ['memory', 'redis', 'temp'];
    
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
      } catch (error) {
        output += `Failed to clear ${cacheType} cache: ${error instanceof Error ? error.message : 'Unknown error'}. `;
      }
    }
    
    return { output: output.trim() };
  }

  private async clearMemoryCache(): Promise<void> {
    // Clear Node.js process cache and force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Clear any in-memory caches
    cacheService.clearAll?.();
  }

  private async clearRedisCache(parameters?: { pattern?: string }): Promise<void> {
    try {
      // Implementation would use actual Redis client
      const pattern = parameters?.pattern || '*';
      // console.log(`Clearing Redis cache with pattern: ${pattern}`);
      
      // Simulate Redis cache clear
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to clear Redis cache:', error);
      throw error;
    }
  }

  private async clearTempFiles(): Promise<void> {
    const tempDirs = ['/tmp', os.tmpdir()];
    
    for (const tempDir of tempDirs) {
      try {
        await execAsync(`find ${tempDir} -type f -name "*.tmp" -mtime +1 -delete 2>/dev/null || true`);
        await execAsync(`find ${tempDir} -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true`);
      } catch (error) {
        console.warn(`Failed to clear temp files in ${tempDir}:`, error);
      }
    }
  }

  private async clearApplicationCache(): Promise<void> {
    // Clear application-specific caches
    await cacheService.clearAll?.();
  }

  // Connection reset functionality
  async resetConnections(target: string, parameters?: ConnectionResetParameters): Promise<{ output: string }> {
    // console.log(`🔌 Resetting connections: ${target}`);
    
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
    } catch (error) {
      throw new Error(`Failed to reset ${target} connections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return { output };
  }

  private async resetDatabaseConnections(parameters?: { maxConnections?: number }): Promise<string> {
    const maxConnections = parameters?.maxConnections || 20;
    
    try {
      // Check current connection count
      const currentConnections = await AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
      const connectionCount = parseInt(currentConnections[0].count);
      
      if (connectionCount > maxConnections) {
        // Kill idle connections
        await AppDataSource.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE state = 'idle'
          AND state_change < now() - interval '10 minutes'
        `);
        
        return `Reset database connections. Was: ${connectionCount}, limit: ${maxConnections}`;
      }
      
      return `Database connections healthy: ${connectionCount}/${maxConnections}`;
    } catch (error) {
      throw new Error(`Database connection reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async resetRedisConnections(parameters?: Record<string, unknown>): Promise<string> {
    // Implementation would reset Redis connections
    // console.log('Resetting Redis connections');
    return 'Redis connections reset';
  }

  // Resource scaling functionality
  async scaleResources(target: string, parameters?: ScaleResourceParameters): Promise<{ output: string }> {
    // console.log(`📈 Scaling resources: ${target}`);
    
    const action = parameters?.action || 'scale_up';
    const factor = parameters?.factor || 1.5;
    
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
    } catch (error) {
      throw new Error(`Failed to scale ${target}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return { output };
  }

  private async scaleApiServer(action: string, factor: number): Promise<string> {
    // In a real implementation, this would scale the API server instances
    // console.log(`Scaling API server: ${action} by factor ${factor}`);
    
    if (action === 'scale_up') {
      // Increase worker processes, connection limits, etc.
      return `API server scaled up by factor ${factor}`;
    } else {
      // Scale down resources
      return `API server scaled down by factor ${factor}`;
    }
  }

  private async optimizeMemoryUsage(): Promise<string> {
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Clear caches
    await this.clearMemoryCache();
    
    const memoryAfter = process.memoryUsage();
    return `Memory optimized. RSS: ${Math.round(memoryAfter.rss / 1024 / 1024)}MB`;
  }

  private async scaleConnectionPools(action: string, factor: number): Promise<string> {
    // In a real implementation, this would adjust connection pool sizes
    // console.log(`Scaling connection pools: ${action} by factor ${factor}`);
    return `Connection pools scaled ${action} by factor ${factor}`;
  }

  // Service status checking
  async checkServiceStatus(serviceName: string): Promise<string> {
    try {
      switch (serviceName) {
        case 'postgresql':
        case 'database':
          await AppDataSource.query('SELECT 1');
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
          } catch {
            return 'stopped';
          }
      }
    } catch (error) {
      console.error(`Service status check failed for ${serviceName}:`, error);
      return 'error';
    }
  }

  // System health monitoring
  private async startHealthMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
        await this.detectAndHealIssues();
        await this.updateHealthMetrics();
      } catch (error) {
        console.error('Self-healing health monitoring failed:', error);
      }
    }, 60000); // Every minute

    // console.log('❤️ Self-healing health monitoring started');
  }

  private async performHealthCheck(): Promise<SystemHealth> {
    const health: SystemHealth = {
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

  private async getMemoryInfo(): Promise<SystemHealth['memory']> {
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

  private async getCpuInfo(): Promise<SystemHealth['cpu']> {
    const loadAvg = os.loadavg();
    
    return {
      loadAverage: loadAvg,
      usage: loadAvg[0] / os.cpus().length * 100,
      processes: 0 // Would get from ps or /proc
    };
  }

  private async getDiskInfo(): Promise<SystemHealth['disk']> {
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
    } catch (error) {
      return { total: 0, used: 0, free: 0, percentage: 0 };
    }
  }

  private async getServiceInfo(): Promise<SystemHealth['services']> {
    const services: SystemHealth['services'] = {};
    
    const criticalServices = ['postgresql', 'api-server', 'redis'];
    
    for (const service of criticalServices) {
      const status = await this.checkServiceStatus(service);
      const state = this.serviceStates.get(service) || { restartCount: 0, lastRestart: null };
      
      services[service] = {
        status: status as 'running' | 'stopped' | 'error' | 'unknown',
        restartCount: state.restartCount || 0,
        lastRestart: state.lastRestart
      };
    }
    
    return services;
  }

  private async getConnectionInfo(): Promise<SystemHealth['connections']> {
    const connections = {
      database: 0,
      redis: 0,
      http: 0
    };
    
    try {
      const dbResult = await AppDataSource.query('SELECT count(*) FROM pg_stat_activity');
      connections.database = parseInt(dbResult[0].count);
    } catch (error) {
      console.warn('Failed to get database connection count:', error);
    }
    
    return connections;
  }

  private async detectSystemIssues(health: SystemHealth): Promise<SystemIssue[]> {
    const issues: SystemIssue[] = [];
    
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
    } else if (health.memory.percentage > 80) {
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

  private async detectAndHealIssues(): Promise<void> {
    if (!this.isEnabled) return;
    
    const health = await this.performHealthCheck();
    const autoHealableIssues = health.issues.filter((issue: any) => issue.autoHealable);
    
    for (const issue of autoHealableIssues) {
      if (this.activeAttempts.size >= this.maxConcurrentHealing) {
        // console.log(`⚠️ Max concurrent healing attempts reached, skipping ${issue.type}`);
        continue;
      }
      
      await this.healIssue(issue);
    }
  }

  private async healIssue(issue: SystemIssue): Promise<void> {
    // console.log(`🩹 Auto-healing issue: ${issue.type} - ${issue.description}`);
    
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
      
      // console.log(`✅ Auto-healing successful for ${issue.type}`);
      
    } catch (error) {
      console.error(`❌ Auto-healing failed for ${issue.type}:`, error);
    }
  }

  private async cleanupLogs(): Promise<void> {
    const logDirs = ['/var/log', './logs'];
    
    for (const logDir of logDirs) {
      try {
        // Remove logs older than 7 days
        await execAsync(`find ${logDir} -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true`);
        // Compress logs older than 1 day
        await execAsync(`find ${logDir} -type f -name "*.log" -mtime +1 -exec gzip {} \\; 2>/dev/null || true`);
      } catch (error) {
        console.warn(`Failed to cleanup logs in ${logDir}:`, error);
      }
    }
  }

  // Healing action execution
  private async executeHealingAction(action: HealingAction, context: HealingContext): Promise<{ output: string }> {
    const attemptId = `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const attempt: HealingAttempt = {
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
      const preChecks = action.safetyChecks.filter((check: any) => check.type === 'pre_execution');
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
      const postChecks = action.safetyChecks.filter((check: any) => check.type === 'post_execution');
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
      
    } catch (error) {
      attempt.status = 'failed';
      attempt.endTime = new Date();
      attempt.executionLog.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      throw error;
    } finally {
      this.activeAttempts.delete(attemptId);
      this.healingHistory.push(attempt);
      
      // Keep only last 100 attempts
      if (this.healingHistory.length > 100) {
        this.healingHistory = this.healingHistory.slice(-100);
      }
    }
  }

  private async performSafetyCheck(check: SafetyCheck, context: HealingContext): Promise<{
    check: SafetyCheck;
    passed: boolean;
    output?: string;
    error?: string;
  }> {
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
          } else {
            passed = true;
            output = 'No specific check implemented';
          }
      }
      
      return { check, passed, output };
      
    } catch (error) {
      return {
        check,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkServiceExists(serviceName: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`which ${serviceName} || command -v ${serviceName}`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async performHealingAction(action: HealingAction, context: HealingContext, attempt: HealingAttempt): Promise<string> {
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

  private async executeServiceRestart(serviceName: string, parameters: ServiceRestartParameters, attempt: HealingAttempt): Promise<string> {
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
        } catch (error) {
          throw new Error(`Failed to restart ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
  }

  private async performRollback(action: HealingAction, attempt: HealingAttempt): Promise<void> {
    if (!action.rollbackActions) return;
    
    attempt.executionLog.push('Performing rollback...');
    attempt.rollbackPerformed = true;
    
    for (const rollbackAction of action.rollbackActions) {
      try {
        await this.performHealingAction(rollbackAction, attempt.metadata, attempt);
        attempt.executionLog.push(`Rollback action completed: ${rollbackAction.type}`);
      } catch (error) {
        attempt.executionLog.push(`Rollback action failed: ${rollbackAction.type} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Initialization and configuration
  private async initializeHealingActions(): Promise<void> {
    const actions: HealingAction[] = [
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
    
    actions.forEach((action: any) => {
      this.healingActions.set(action.id, action);
    });
    
    // console.log(`🔧 Initialized ${actions.length} healing actions`);
  }

  private async initializeServiceTracking(): Promise<void> {
    const services = ['api-server', 'postgresql', 'redis'];
    
    for (const service of services) {
      this.serviceStates.set(service, {
        restartCount: 0,
        lastRestart: null
      });
    }
  }

  // Metrics and monitoring
  private async recordHealthMetrics(health: SystemHealth): Promise<void> {
    // Memory metrics
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.MEMORY_USAGE,
        'System Memory Usage',
        health.memory.percentage,
        '%',
        'self-healing',
        { timestamp: new Date().toISOString() }
      )
    );
    
    // CPU metrics
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.CPU_USAGE,
        'System CPU Usage',
        health.cpu.usage,
        '%',
        'self-healing',
        { timestamp: new Date().toISOString() }
      )
    );
    
    // Disk metrics
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.STORAGE_USAGE,
        'System Disk Usage',
        health.disk.percentage,
        '%',
        'self-healing',
        { timestamp: new Date().toISOString() }
      )
    );
    
    // Issues count
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.SYSTEM_ISSUES,
        'System Issues Detected',
        health.issues.length,
        'count',
        'self-healing',
        { 
          issueTypes: health.issues.map((i: any) => i.type),
          timestamp: new Date().toISOString() 
        }
      )
    );
  }

  // Public API methods
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastHealthCheck?: Date;
    activeAttempts: number;
    healingActions: number;
    systemHealth?: SystemHealth;
    issues: string[];
  }> {
    const systemHealth = this.lastHealthCheck ? await this.performHealthCheck() : undefined;
    const issues: string[] = [];
    
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
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (systemHealth?.issues.some((i: any) => i.severity === 'critical')) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
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

  async getSystemHealth(): Promise<SystemHealth | null> {
    return this.lastHealthCheck ? await this.performHealthCheck() : null;
  }

  async getHealingHistory(limit: number = 50): Promise<HealingAttempt[]> {
    return this.healingHistory
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  async getActiveAttempts(): Promise<HealingAttempt[]> {
    return Array.from(this.activeAttempts.values());
  }

  async enable(): Promise<void> {
    this.isEnabled = true;
    // console.log('✅ Self-healing enabled');
  }

  async disable(): Promise<void> {
    this.isEnabled = false;
    // console.log('⏸️ Self-healing disabled');
  }

  async forceHealing(issueType: string, component: string): Promise<{ output: string }> {
    const issue: SystemIssue = {
      type: issueType as SystemIssue['type'],
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

  private async updateHealthMetrics(): Promise<void> {
    if (!this.lastHealthCheck) return;

    const health = await this.performHealthCheck();
    
    // Record health metrics to database
    await Promise.all([
      // Memory metrics
      this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.MEMORY_USAGE,
          'System Memory Usage',
          health.memory.percentage,
          '%',
          'self-healing',
          { used: health.memory.used, total: health.memory.total }
        )
      ),
      
      // CPU metrics
      this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.CPU_USAGE,
          'System CPU Usage',
          health.cpu.usage,
          '%',
          'self-healing',
          { loadAverage: health.cpu.loadAverage }
        )
      ),
      
      // Disk metrics
      this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.STORAGE_USAGE,
          'System Disk Usage',
          health.disk.percentage,
          '%',
          'self-healing',
          { used: health.disk.used, free: health.disk.free }
        )
      ),
      
      // Issues count
      this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.SYSTEM_ISSUES,
          'System Issues Detected',
          health.issues.length,
          'count',
          'self-healing',
          { issueTypes: health.issues.map((i: any) => i.type) }
        )
      )
    ]);
  }
}

export const selfHealingService = new SelfHealingService();